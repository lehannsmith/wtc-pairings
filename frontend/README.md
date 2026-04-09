# Warhammer 40K WTC Pairings Trainer

A CLI tool to practice WTC 5-man team pairings against an AI logic engine.

## Architecture

```
React UI (WTCPairings.jsx)
    │  fetch() API calls
    ▼
FastAPI backend (api.py)
    │  imports
    ▼
Python logic (ai_engine.py, matrix.py, scoring.py)
```

The React UI owns all game state and UI flow. The backend is stateless — each request carries the full context needed for the AI to make a decision. All AI logic lives exclusively in the Python files.

## Setup

Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Running

**Step 1 — Start the API server:**
```bash
uvicorn api:app --reload --port 8000
```

**Step 2 — Serve the React UI:**
```bash
# In a new terminal, from the project root
npx create-react-app wtc-ui
cp WTCPairings.jsx wtc-ui/src/App.jsx
cd wtc-ui && npm start
```

Or drop `WTCPairings.jsx` into any existing React + Vite/CRA project.

**Step 3 — Verify the API is running:**
```
GET http://localhost:8000/api/health → { "status": "ok" }
```

The UI header shows `AI: OK` in green when the backend is reachable, and `AI: ERR` in red with the error message if a call fails.

You will be prompted to:
1. Provide a path to your matrix CSV
2. Confirm army assignments
3. Select AI difficulty
4. Play through the full pairing process

## Matrix CSV Format

Rows = your armies, Columns = opponent armies.

```
army,Tsons,Drukhari,Orks,SM,Necrons
DE,A,mirror,A,A-,A+
GSC,G,A+,R,A,A+
Necrons,G,A,A+,A+,mirror
Custodes,A,RR,A,A+,A
IG,A+,A+,A,A+,A+
```

## Grade Scale

| Grade  | Score Range | Midpoint |
|--------|-------------|----------|
| RR     | 0–3         | 1.5      |
| R      | 3–7         | 5.0      |
| A-     | 7–9         | 8.0      |
| A      | 9–11        | 10.0     |
| A+     | 11–13       | 12.0     |
| G      | 13–17       | 15.0     |
| GG     | 17–20       | 18.5     |
| mirror | 0–20        | 10.0     |

## AI Difficulty Modes

- **A - Random:** All decisions made randomly
- **B - Basic best outcome:** Each decision independently maximises expected score
- **C - C1 Lookahead:** Round 1 decisions optimised for round 2 pool shaping; round 2 uses Mode B

## Pairing Flow

1. Both sides secretly select a defender (revealed simultaneously)
2. Rolloff winner's defender picks table first
3. Both sides secretly select 2 attackers (revealed simultaneously)
4. Each defender secretly picks which attacker to face (revealed simultaneously)
5. Refused attackers return to pool
6. Repeat for Round 2 (table pick order reverses)
7. Final 2 refused attackers are the last matchup
