from matrix import get_grade, get_score, GRADE_RANGES


def calculate_projections(locked_matchups, matrix):
    """
    Recalculate and display projections for all locked matchups.
    Returns (your_total, opponent_total).
    """
    your_total = 0
    opponent_total = 0

    print("\n" + "=" * 75)
    print("FINAL MATCHUP SUMMARY")
    print("=" * 75)
    print(f"{'Your Army':>14} {'vs':^4} {'Opp Army':<14} {'Table':<12} "
          f"{'Grade':<8} {'Your Pts':>8} {'Opp Pts':>8}")
    print("-" * 75)

    for m in locked_matchups:
        grade = get_grade(matrix, m.your_army, m.opponent_army)
        your_score = get_score(matrix, m.your_army, m.opponent_army)
        opp_score = 20 - your_score
        grade_range = GRADE_RANGES.get(grade, (0, 20))

        your_total += your_score
        opponent_total += opp_score

        print(f"{m.your_army:>14} {'vs':^4} {m.opponent_army:<14} {m.table:<12} "
              f"{grade:<8} {your_score:>8.1f} {opp_score:>8.1f}  "
              f"(range {grade_range[0]}-{grade_range[1]})")

    print("-" * 75)
    print(f"{'TOTAL':>14} {'':^4} {'':14} {'':12} {'':8} "
          f"{your_total:>8.1f} {opponent_total:>8.1f}")
    print("=" * 75)

    if your_total > opponent_total:
        print(f"\n  Projected WINNER: YOU  ({your_total:.1f} - {opponent_total:.1f})")
    elif opponent_total > your_total:
        print(f"\n  Projected WINNER: OPPONENT  ({opponent_total:.1f} - {your_total:.1f})")
    else:
        print(f"\n  Projected DRAW  ({your_total:.1f} - {opponent_total:.1f})")

    return your_total, opponent_total
