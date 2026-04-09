import getpass
from matrix import get_grade, get_score
from game_state import GameState


def secret_input(prompt: str) -> str:
    """Get input without echoing to screen, then wait for confirmation."""
    value = getpass.getpass(prompt + " (hidden): ")
    input("  >> Selection locked. Press Enter to continue...")
    return value.strip()


def choose_from_list(options: list, prompt: str, secret: bool = False) -> str:
    """Present numbered options and get a valid selection."""
    print(f"\n  {prompt}")
    for i, opt in enumerate(options, 1):
        print(f"    {i}. {opt}")
    while True:
        try:
            if secret:
                raw = getpass.getpass("  Enter number (hidden): ")
                input("  >> Selection locked. Press Enter to continue...")
            else:
                raw = input("  Enter number: ")
            idx = int(raw.strip()) - 1
            if 0 <= idx < len(options):
                return options[idx]
            print("  Invalid choice, try again.")
        except (ValueError, KeyboardInterrupt):
            print("  Invalid input, try again.")


def choose_two_from_list(options: list, prompt: str, secret: bool = False) -> list:
    """Present numbered options and get 2 valid selections."""
    print(f"\n  {prompt}")
    for i, opt in enumerate(options, 1):
        print(f"    {i}. {opt}")
    while True:
        try:
            if secret:
                raw = getpass.getpass("  Enter two numbers separated by comma (hidden): ")
                input("  >> Selection locked. Press Enter to continue...")
            else:
                raw = input("  Enter two numbers separated by comma: ")
            parts = [p.strip() for p in raw.split(",")]
            if len(parts) != 2:
                print("  Please enter exactly 2 numbers.")
                continue
            indices = [int(p) - 1 for p in parts]
            if len(set(indices)) != 2:
                print("  Please choose 2 different options.")
                continue
            if all(0 <= i < len(options) for i in indices):
                return [options[i] for i in indices]
            print("  Invalid choice, try again.")
        except (ValueError, KeyboardInterrupt):
            print("  Invalid input, try again.")


def run_round(state: GameState, matrix, ai, round_num: int):
    """Execute one full round of pairings."""

    print(f"\n{'=' * 60}")
    print(f"  ROUND {round_num} OF PAIRINGS")
    print(f"{'=' * 60}")
    state.display_pools()

    # ------------------------------------------------------------------ #
    # Step 1: Secret defender selection                                    #
    # ------------------------------------------------------------------ #
    print("\n--- STEP 1: SELECT YOUR DEFENDER ---")
    your_defender = choose_from_list(
        state.your_pool,
        "Choose your defender:",
        secret=True
    )

    opp_defender = ai.choose_defender(
        state.opponent_pool, round_num, state.your_pool
    )

    print(f"\n  ** REVEAL **")
    print(f"  Your defender:      {your_defender}")
    print(f"  Opponent defender:  {opp_defender}")

    # ------------------------------------------------------------------ #
    # Step 2: Table picks                                                  #
    # ------------------------------------------------------------------ #
    print("\n--- STEP 2: TABLE PICKS ---")
    print(f"  Available tables: {', '.join(state.available_tables)}")

    if round_num == 1:
        first_picker = state.rolloff_winner
    else:
        # Reverse order for round 2
        first_picker = "opponent" if state.rolloff_winner == "player" else "player"

    print(f"  Table pick order: {first_picker.upper()} picks first")

    if first_picker == "player":
        your_table = choose_from_list(
            state.available_tables,
            "Choose your table:"
        )
        remaining_tables = [t for t in state.available_tables if t != your_table]
        opp_table = ai.choose_table(opp_defender, remaining_tables)
    else:
        opp_table = ai.choose_table(opp_defender, state.available_tables)
        remaining_tables = [t for t in state.available_tables if t != opp_table]
        your_table = choose_from_list(
            remaining_tables,
            "Choose your table (opponent has already picked):"
        )

    print(f"\n  Your defender    ({your_defender}) → {your_table}")
    print(f"  Opponent defender ({opp_defender}) → {opp_table}")

    # Remove picked tables from pool
    state.available_tables = [
        t for t in state.available_tables
        if t not in [your_table, opp_table]
    ]

    # ------------------------------------------------------------------ #
    # Step 3: Secret attacker pair selection                               #
    # ------------------------------------------------------------------ #
    print("\n--- STEP 3: SELECT YOUR ATTACKER PAIR ---")
    your_non_defenders = [a for a in state.your_pool if a != your_defender]
    opp_non_defenders = [a for a in state.opponent_pool if a != opp_defender]

    your_attackers = choose_two_from_list(
        your_non_defenders,
        "Choose 2 attackers to present against opponent's defender:",
        secret=True
    )

    opp_attackers = ai.choose_attackers(
        state.opponent_pool, round_num, state.your_pool
    )
    # Ensure defender not in attackers
    opp_attackers = [a for a in opp_attackers if a != opp_defender][:2]

    print(f"\n  ** REVEAL **")
    print(f"  Your attackers:     {', '.join(your_attackers)}")
    print(f"  Opponent attackers: {', '.join(opp_attackers)}")

    # ------------------------------------------------------------------ #
    # Step 4: Defenders pick their matchup                                 #
    # ------------------------------------------------------------------ #
    print("\n--- STEP 4: DEFENDERS CHOOSE THEIR OPPONENT ---")

    # Show player grades to help decision
    print(f"\n  Your defender ({your_defender}) faces: {', '.join(opp_attackers)}")
    for atk in opp_attackers:
        grade = get_grade(matrix, your_defender, atk)
        score = get_score(matrix, your_defender, atk)
        print(f"    vs {atk}: {grade} (predicted {score:.1f} pts)")

    your_pick = choose_from_list(
        opp_attackers,
        f"Your defender ({your_defender}) picks which opponent to face:",
        secret=True
    )

    opp_pick = ai.choose_defender_pick(opp_defender, your_attackers)

    print(f"\n  ** REVEAL **")
    print(f"  Your defender    ({your_defender}) chose: {your_pick}")
    print(f"  Opponent defender ({opp_defender}) chose: {opp_pick}")

    # ------------------------------------------------------------------ #
    # Step 5: Lock matchups and handle refused                             #
    # ------------------------------------------------------------------ #
    your_refused = [a for a in opp_attackers if a != your_pick][0]
    opp_refused = [a for a in your_attackers if a != opp_pick][0]

    print(f"\n  Refused back to pool: {your_refused} (opponent), {opp_refused} (yours)")

    # Lock matchup 1: your defender vs opponent's chosen attacker
    grade1 = get_grade(matrix, your_defender, your_pick)
    score1 = get_score(matrix, your_defender, your_pick)
    state.lock_matchup(your_defender, your_pick, your_table, grade1, score1)

    # Lock matchup 2: opponent defender vs your chosen attacker
    grade2 = get_grade(matrix, opp_pick, opp_defender)
    score2 = get_score(matrix, opp_pick, opp_defender)
    state.lock_matchup(opp_pick, opp_defender, opp_table, grade2, score2)

    # Update pools
    state.your_pool = [
        a for a in state.your_pool
        if a not in [your_defender, opp_pick]
    ]
    state.opponent_pool = [
        a for a in state.opponent_pool
        if a not in [opp_defender, your_pick]
    ]

    print(f"\n  Locked this round:")
    print(f"    Your {your_defender} vs Opp {your_pick} on {your_table} — {grade1} ({score1:.1f} pts)")
    print(f"    Your {opp_pick} vs Opp {opp_defender} on {opp_table} — {grade2} ({score2:.1f} pts)")

    state.display_locked_matchups()


def run_final_refused(state: GameState, matrix):
    """Lock the final refused matchup after round 2."""
    assert len(state.your_pool) == 1 and len(state.opponent_pool) == 1, \
        "Expected exactly 1 army remaining per side for final refused matchup"

    your_army = state.your_pool[0]
    opp_army = state.opponent_pool[0]
    table = state.available_tables[0] if state.available_tables else "Medium"

    grade = get_grade(matrix, your_army, opp_army)
    score = get_score(matrix, your_army, opp_army)

    state.lock_matchup(your_army, opp_army, table, grade, score)

    print(f"\n--- FINAL REFUSED MATCHUP ---")
    print(f"  Your {your_army} vs Opp {opp_army} on {table} — {grade} ({score:.1f} pts)")
