from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import random

from backend.matrix import GRADE_MIDPOINTS
from backend.pumba_engine import PumbaEngine

app = FastAPI(title="WTC Pairings Trainer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════════════

class MatrixData(BaseModel):
    your_armies: list[str]
    opp_armies: list[str]
    grades: list[list[str]]  # [your_idx][opp_idx]

class DefenderRequest(BaseModel):
    matrix: MatrixData
    opp_pool: list[str]
    your_pool: list[str]
    ai_mode: str
    round_num: int

class TableRequest(BaseModel):
    opp_defender: str
    available_tables: list[str]
    ai_mode: str

class AttackersRequest(BaseModel):
    matrix: MatrixData
    opp_pool: list[str]
    your_pool: list[str]
    opp_defender: str
    ai_mode: str
    round_num: int

class PickRequest(BaseModel):
    matrix: MatrixData
    opp_defender: str
    your_attackers: list[str]
    ai_mode: str

class Matchup(BaseModel):
    your_army: str
    opp_army: str
    table: str

class ScoreRequest(BaseModel):
    matrix: MatrixData
    matchups: list[Matchup]

# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

def build_matrix_df(data: MatrixData):
    """Reconstruct a dict-of-dicts matrix from request data."""
    m = {}
    for i, ya in enumerate(data.your_armies):
        m[ya] = {}
        for j, oa in enumerate(data.opp_armies):
            m[ya][oa] = data.grades[i][j]
    return m

def dict_matrix_to_df(m: dict, your_armies: list, opp_armies: list):
    """Wrap dict matrix in a pandas-compatible accessor."""
    import pandas as pd
    rows = []
    for ya in your_armies:
        rows.append([m[ya].get(oa, 'A') for oa in opp_armies])
    return pd.DataFrame(rows, index=your_armies, columns=opp_armies)

def make_ai(mode: str, matrix_df, opp_armies: list, your_armies: list) -> PumbaEngine:
    return PumbaEngine(
        mode=mode,
        matrix=matrix_df,
        opponent_armies=opp_armies,
        your_armies=your_armies
    )

# ═══════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════

@app.post("/api/rolloff")
def rolloff():
    """Determine rolloff winner."""
    p = random.randint(1, 6)
    o = random.randint(1, 6)
    while p == o:
        p = random.randint(1, 6)
        o = random.randint(1, 6)
    winner = "player" if p > o else "opponent"
    return {"winner": winner, "player_roll": p, "opp_roll": o}


@app.post("/api/ai/defender")
def ai_defender(req: DefenderRequest):
    """AI selects its defender."""
    df = dict_matrix_to_df(
        build_matrix_df(req.matrix),
        req.matrix.your_armies,
        req.matrix.opp_armies
    )
    ai = make_ai(req.ai_mode, df, req.opp_pool, req.your_pool)
    defender = ai.choose_defender(req.opp_pool, req.round_num, req.your_pool)
    return {"defender": defender}


@app.post("/api/ai/table")
def ai_table(req: TableRequest):
    """AI selects preferred table for its defender."""
    from backend.pumba_engine import PumbaEngine
    table = PumbaEngine._preferred_table(None, req.opp_defender, req.available_tables)
    return {"table": table}


@app.post("/api/ai/attackers")
def ai_attackers(req: AttackersRequest):
    """AI selects its attacker pair."""
    df = dict_matrix_to_df(
        build_matrix_df(req.matrix),
        req.matrix.your_armies,
        req.matrix.opp_armies
    )
    ai = make_ai(req.ai_mode, df, req.opp_pool, req.your_pool)
    # Set the last defender so attacker logic excludes them
    ai._last_defender = req.opp_defender
    attackers = ai.choose_attackers(req.opp_pool, req.round_num, req.your_pool)
    return {"attackers": attackers}


@app.post("/api/ai/pick")
def ai_pick(req: PickRequest):
    """AI defender picks which of the player's attackers to face."""
    df = dict_matrix_to_df(
        build_matrix_df(req.matrix),
        req.matrix.your_armies,
        req.matrix.opp_armies
    )
    ai = make_ai(req.ai_mode, df, req.matrix.opp_armies, req.matrix.your_armies)
    pick = ai.choose_defender_pick(req.opp_defender, req.your_attackers)
    return {"pick": pick}


@app.post("/api/score")
def score(req: ScoreRequest):
    """Calculate projected scores for all locked matchups."""
    m = build_matrix_df(req.matrix)
    results = []
    your_total = 0
    opp_total = 0

    for matchup in req.matchups:
        grade = m.get(matchup.your_army, {}).get(matchup.opp_army, 'A')
        your_score = GRADE_MIDPOINTS.get(grade, 10.0)
        opp_score = 20 - your_score
        your_total += your_score
        opp_total += opp_score
        results.append({
            "your_army": matchup.your_army,
            "opp_army": matchup.opp_army,
            "table": matchup.table,
            "grade": grade,
            "your_score": your_score,
            "opp_score": opp_score,
        })

    return {
        "matchups": results,
        "your_total": your_total,
        "opp_total": opp_total,
        "winner": "player" if your_total > opp_total else "opponent" if opp_total > your_total else "draw"
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
