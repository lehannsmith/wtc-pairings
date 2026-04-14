import random
import os
from matrix import load_matrix, get_your_armies, get_opponent_armies, display_matrix
from game_state import GameState
from pumba_engine import PumbaEngine
from pairing_engine import run_round, run_final_refused
from scoring import calculate_projections


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def banner():
    print("\n" + "=" * 60)
    print("   WARHAMMER 40K WTC PAIRINGS TRAINER")
    print("=" * 60)


def select_ai_mode() -> str:
    print("\n  Select AI difficulty:")
    print("    A - Random")
    print("    B - Basic best outcome")
    print("    C - Round 2 pool shaping (C1 lookahead)")
    while True:
        choice = input("  Enter A, B or C: ").strip().upper()
        if choice in ["A", "B", "C"]:
            return choice
        print("  Invalid choice.")


def rolloff() -> str:
    print("\n--- ROLLOFF ---")
    input("  Press Enter to roll off for table pick order...")
    player_roll = random.randint(1, 6)
    opp_roll = random.randint(1, 6)
    while player_roll == opp_roll:
        player_roll = random.randint(1, 6)
        opp_roll = random.randint(1, 6)
    print(f"  You rolled: {player_roll}  |  Opponent rolled: {opp_roll}")
    winner = "player" if player_roll > opp_roll else "opponent"
    print(f"  >> {winner.upper()} wins the rolloff and picks table first in Round 1")
    return winner


def assign_armies(your_armies: list, opp_armies: list):
    """Confirm or reassign which armies each team uses."""
    print("\n--- ARMY ASSIGNMENT ---")
    print("  Your armies (from matrix rows):")
    for i, a in enumerate(your_armies, 1):
        print(f"    {i}. {a}")
    print("\n  Opponent armies (from matrix columns):")
    for i, a in enumerate(opp_armies, 1):
        print(f"    {i}. {a}")
    input("\n  Press Enter to confirm these assignments...")


def main():
    clear()
    banner()

    # Load matrix
    matrix_path = input("\n  Enter path to matrix CSV [default: data/matrix.csv]: ").strip()
    if not matrix_path:
        matrix_path = "/PairingsProject/wtc-pairings/backend/data/matrix.csv"

    try:
        matrix = load_matrix(matrix_path)
    except FileNotFoundError:
        print(f"  ERROR: Could not find {matrix_path}")
        return

    your_armies = get_your_armies(matrix)
    opp_armies = get_opponent_armies(matrix)

    display_matrix(matrix)
    assign_armies(your_armies, opp_armies)

    # AI mode
    ai_mode = select_ai_mode()

    # Rolloff
    rolloff_winner = rolloff()

    # Initialise game state
    state = GameState(
        your_armies=list(your_armies),
        opponent_armies=list(opp_armies),
        your_pool=list(your_armies),
        opponent_pool=list(opp_armies),
        rolloff_winner=rolloff_winner
    )

    # Initialise AI
    ai = PumbaEngine(
        mode=ai_mode,
        matrix=matrix,
        opponent_armies=list(opp_armies),
        your_armies=list(your_armies)
    )

    # ------------------------------------------------------------------ #
    # Round 1                                                              #
    # ------------------------------------------------------------------ #
    run_round(state, matrix, ai, round_num=1)

    # ------------------------------------------------------------------ #
    # Round 2                                                              #
    # ------------------------------------------------------------------ #
    input("\n  Press Enter to begin Round 2 pairings...")
    run_round(state, matrix, ai, round_num=2)

    # ------------------------------------------------------------------ #
    # Final refused matchup                                                #
    # ------------------------------------------------------------------ #
    run_final_refused(state, matrix)

    # ------------------------------------------------------------------ #
    # Final scoring                                                        #
    # ------------------------------------------------------------------ #
    input("\n  Press Enter to see final projections...")
    calculate_projections(state.locked_matchups, matrix)

    print("\n  Thanks for playing. Good luck at the event!\n")


if __name__ == "__main__":
    main()
