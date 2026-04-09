import random
from itertools import combinations
from matrix import get_score


class PumbaEngine:
    def __init__(self, mode: str, matrix, opponent_armies: list, your_armies: list):
        """
        mode: 'A' (random), 'B' (best outcome), 'C' (C1 lookahead)
        matrix: pandas DataFrame
        opponent_armies: AI's armies
        your_armies: player's armies
        """
        self.mode = mode
        self.matrix = matrix
        self.opponent_armies = opponent_armies
        self.your_armies = your_armies

    # ------------------------------------------------------------------ #
    # Public interface                                                      #
    # ------------------------------------------------------------------ #

    def choose_defender(self, pool: list, round_num: int, player_pool: list) -> str:
        if self.mode == "A":
            return self._random_choice(pool)
        elif self.mode == "B":
            return self._best_defender(pool, player_pool)
        elif self.mode == "C":
            if round_num == 1:
                return self._c1_defender(pool, player_pool)
            else:
                return self._best_defender(pool, player_pool)

    def choose_attackers(self, pool: list, round_num: int, player_pool: list) -> list:
        """Return 2 attackers from pool."""
        non_defender = [a for a in pool if a != self._last_defender]
        if len(non_defender) <= 2:
            return non_defender
        if self.mode == "A":
            return random.sample(non_defender, 2)
        elif self.mode == "B":
            return self._best_attacker_pair(non_defender, player_pool)
        elif self.mode == "C":
            if round_num == 1:
                return self._c1_attacker_pair(non_defender, pool, player_pool)
            else:
                return self._best_attacker_pair(non_defender, player_pool)

    def choose_defender_pick(self, my_defender: str, player_attackers: list) -> str:
        """Pick which player attacker to face."""
        if self.mode == "A":
            return self._random_choice(player_attackers)
        else:
            return self._best_defender_pick(my_defender, player_attackers)

    def choose_table(self, my_defender: str, available_tables: list) -> str:
        """Pick preferred table for the AI defender."""
        if self.mode == "A":
            return self._random_choice(available_tables)
        else:
            return self._preferred_table(my_defender, available_tables)

    # ------------------------------------------------------------------ #
    # Internal helpers                                                      #
    # ------------------------------------------------------------------ #

    _last_defender = None

    def _random_choice(self, options):
        return random.choice(options)

    def _score(self, opp_army, player_army):
        """Score from opponent (AI) perspective — higher is better for AI."""
        player_score = get_score(self.matrix, player_army, opp_army)
        return 20 - player_score  # AI score

    def _best_defender(self, pool: list, player_pool: list) -> str:
        """
        Pick defender whose worst-case matchup against any 2 of the
        player's attackers is maximised (best floor).
        """
        best_army = None
        best_floor = -1
        for army in pool:
            # Worst case: player presents 2 best attackers into this defender
            scores_against = [self._score(army, p) for p in player_pool]
            scores_against.sort()
            floor = scores_against[0]  # worst matchup
            if floor > best_floor:
                best_floor = floor
                best_army = army
        self._last_defender = best_army
        return best_army

    def _best_attacker_pair(self, attackers: list, player_pool: list) -> list:
        """
        Find attacker pair that maximises the floor of both options
        against the player's likely defender.
        """
        if len(attackers) <= 2:
            return attackers

        best_pair = None
        best_min = -1

        for pair in combinations(attackers, 2):
            # Player's defender will pick best option for them (worst for AI)
            # We want to maximise the minimum score across both options
            pair_mins = []
            for opp in pair:
                # Best the player defender can do against this attacker
                best_player_score = max(
                    get_score(self.matrix, p, opp) for p in player_pool
                    if p != self._last_defender
                )
                pair_mins.append(20 - best_player_score)  # AI score
            floor = min(pair_mins)
            if floor > best_min:
                best_min = floor
                best_pair = list(pair)

        return best_pair

    def _best_defender_pick(self, my_defender: str, player_attackers: list) -> str:
        """Pick the player attacker that gives AI the best score."""
        best = None
        best_score = -1
        for atk in player_attackers:
            s = self._score(my_defender, atk)
            if s > best_score:
                best_score = s
                best = atk
        return best

    def _preferred_table(self, my_defender: str, available_tables: list) -> str:
        """
        Simple table preference:
        - Fast/skirmish armies prefer Light
        - Durable/gunline armies prefer Heavy
        - Default Medium
        """
        light_armies = ["DE", "Drukhari", "GSC", "Orks"]
        heavy_armies = ["Necrons", "Custodes", "SM", "IG", "DG"]

        if my_defender in light_armies and "Light" in available_tables:
            return "Light"
        if my_defender in heavy_armies and "Heavy" in available_tables:
            return "Heavy"
        mediums = [t for t in available_tables if "Medium" in t]
        if mediums:
            return mediums[0]
        return available_tables[0]

    # ------------------------------------------------------------------ #
    # C1 Lookahead                                                          #
    # ------------------------------------------------------------------ #

    def _c1_defender(self, pool: list, player_pool: list) -> str:
        """
        Evaluate each possible defender choice by scoring the expected
        total across round 1 + the best possible round 2 pool outcome.
        """
        best_army = None
        best_total = -1

        for defender in pool:
            remaining = [a for a in pool if a != defender]
            # Simulate round 1: best attacker pair from remaining
            pair = self._best_attacker_pair(remaining, player_pool)
            refused = [a for a in remaining if a not in pair][0] if len(remaining) > 2 else None

            # Estimate round 1 score: AI defender vs player's best attacker
            r1_defender_score = min(self._score(defender, p) for p in player_pool)

            # Estimate round 1 attacker scores
            r1_atk_scores = sum(
                max(self._score(a, p) for p in player_pool) for a in pair
            ) / len(pair) if pair else 0

            # Round 2 pool: refused + whoever isn't locked
            r2_pool = [refused] + [a for a in remaining if a not in pair] if refused else remaining
            r2_pool_score = sum(
                max(self._score(a, p) for p in player_pool) for a in r2_pool
            ) / len(r2_pool) if r2_pool else 0

            total = r1_defender_score + r1_atk_scores + r2_pool_score
            if total > best_total:
                best_total = total
                best_army = defender

        self._last_defender = best_army
        return best_army

    def _c1_attacker_pair(self, attackers: list, full_pool: list, player_pool: list) -> list:
        """
        Pick attacker pair in round 1 that also considers the quality
        of the refused attacker going into round 2.
        """
        if len(attackers) <= 2:
            return attackers

        best_pair = None
        best_total = -1

        for pair in combinations(attackers, 2):
            refused_list = [a for a in attackers if a not in pair]
            refused = refused_list[0] if refused_list else None

            # Immediate pair value
            pair_score = sum(
                max(self._score(a, p) for p in player_pool) for a in pair
            )

            # Value of refused attacker in round 2 pool
            r2_value = max(self._score(refused, p) for p in player_pool) if refused else 0

            total = pair_score + r2_value
            if total > best_total:
                best_total = total
                best_pair = list(pair)

        return best_pair
