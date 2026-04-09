import pandas as pd

GRADE_MIDPOINTS = {
    "RR": 1.5,
    "R": 5.0,
    "A-": 8.0,
    "A": 10.0,
    "A+": 12.0,
    "G": 15.0,
    "GG": 18.5,
    "mirror": 10.0,
}

GRADE_RANGES = {
    "RR": (0, 3),
    "R": (3, 7),
    "A-": (7, 9),
    "A": (9, 11),
    "A+": (11, 13),
    "G": (13, 17),
    "GG": (17, 20),
    "mirror": (0, 20),
}


def load_matrix(filepath: str) -> pd.DataFrame:
    """Load matrix CSV. Rows = your armies, Columns = opponent armies."""
    df = pd.read_csv(filepath, index_col=0)
    df.index = df.index.str.strip()
    df.columns = df.columns.str.strip()
    # Normalise grades
    df = df.map(lambda x: x.strip() if isinstance(x, str) else x)
    return df


def get_grade(matrix: pd.DataFrame, your_army: str, opponent_army: str) -> str:
    """Return the grade for your_army vs opponent_army."""
    try:
        return matrix.loc[opponent_army, your_army]
    except KeyError:
        raise ValueError(f"No matchup found for {your_army} vs {opponent_army}")


def get_score(matrix: pd.DataFrame, your_army: str, opponent_army: str) -> float:
    """Return predicted score (your points) for your_army vs opponent_army."""
    grade = get_grade(matrix, your_army, opponent_army)
    return GRADE_MIDPOINTS.get(grade, 10.0)


def get_your_armies(matrix: pd.DataFrame) -> list:
    return list(matrix.columns)


def get_opponent_armies(matrix: pd.DataFrame) -> list:
    return list(matrix.index)


def display_matrix(matrix: pd.DataFrame):
    """Pretty print the matrix."""
    print("\n=== MATCHUP MATRIX ===")
    print(f"{'':>12}", end="")
    for col in matrix.columns:
        print(f"{col:>10}", end="")
    print()
    for idx, row in matrix.iterrows():
        print(f"{idx:>12}", end="")
        for val in row:
            print(f"{val:>10}", end="")
        print()
    print()
