from dataclasses import dataclass, field
from typing import Optional

TABLES = ["Light", "Medium 1", "Medium 2", "Medium 3", "Heavy"]


@dataclass
class Matchup:
    your_army: str
    opponent_army: str
    table: str
    grade: str
    your_score: float
    opponent_score: float


@dataclass
class GameState:
    your_armies: list = field(default_factory=list)
    opponent_armies: list = field(default_factory=list)

    your_pool: list = field(default_factory=list)
    opponent_pool: list = field(default_factory=list)

    locked_matchups: list = field(default_factory=list)
    available_tables: list = field(default_factory=lambda: list(TABLES))

    rolloff_winner: str = "player"  # "player" or "opponent"
    round_number: int = 1

    # Round state
    your_defender: Optional[str] = None
    opponent_defender: Optional[str] = None
    your_attackers: list = field(default_factory=list)
    opponent_attackers: list = field(default_factory=list)
    your_table_pick: Optional[str] = None
    opponent_table_pick: Optional[str] = None

    def reset_round_state(self):
        self.your_defender = None
        self.opponent_defender = None
        self.your_attackers = []
        self.opponent_attackers = []
        self.your_table_pick = None
        self.opponent_table_pick = None

    def lock_matchup(self, your_army, opponent_army, table, grade, your_score):
        self.locked_matchups.append(Matchup(
            your_army=your_army,
            opponent_army=opponent_army,
            table=table,
            grade=grade,
            your_score=your_score,
            opponent_score=20 - your_score
        ))
        if table in self.available_tables:
            self.available_tables.remove(table)

    def display_locked_matchups(self):
        if not self.locked_matchups:
            return
        print("\n=== LOCKED MATCHUPS ===")
        for m in self.locked_matchups:
            print(f"  Your {m.your_army:>12} vs Opponent {m.opponent_army:<12} | "
                  f"Table: {m.table:<10} | Grade: {m.grade:<6} | "
                  f"Predicted: {m.your_score:.1f} - {m.opponent_score:.1f}")

    def display_pools(self):
        print(f"\n  Your pool:     {', '.join(self.your_pool)}")
        print(f"  Opponent pool: {', '.join(self.opponent_pool)}")
        print(f"  Tables left:   {', '.join(self.available_tables)}")
