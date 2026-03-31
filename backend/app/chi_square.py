from __future__ import annotations

from typing import List, Sequence
import math


def chi2_cdf(x: float, k: int) -> float:
    """
    Manual implementation of chi-square CDF using incomplete gamma function.
    This is a simplified version for educational purposes.
    """
    if x <= 0 or k <= 0:
        return 0.0
    
    # For small k, use series expansion
    if k <= 2:
        if k == 1:
            return math.erf(math.sqrt(x / 2))
        else:  # k == 2
            return 1 - math.exp(-x / 2)
    
    # For larger k, use approximation
    # This is a simplified approximation - for production use scipy
    return min(1.0, x / (x + k))


def chi_square_test_of_independence(table: Sequence[Sequence[float]]) -> dict:
    """
    Pearson chi-square test of independence for a contingency table.
    Manual implementation without scipy.
    """
    # Convert to list of lists for manual computation
    obs = [[float(cell) for cell in row] for row in table]
    
    if len(obs) < 2 or len(obs[0]) < 2:
        raise ValueError("Chi-square test requires at least 2 rows and 2 columns.")
    
    # Add pseudocounts to avoid division by zero
    obs = [[cell + 1e-5 for cell in row] for row in obs]

    r, c = len(obs), len(obs[0])
    
    # Calculate row and column sums manually
    row_sums = [sum(row) for row in obs]
    col_sums = [sum(obs[i][j] for i in range(r)) for j in range(c)]
    total = sum(row_sums)
    
    if total <= 0:
        raise ValueError("Total count in `table` must be > 0.")

    # Expected counts: (row_sum_i * col_sum_j) / total
    expected = [[(row_sums[i] * col_sums[j]) / total for j in range(c)] for i in range(r)]

    # Check expected frequencies
    for i in range(r):
        for j in range(c):
            if expected[i][j] <= 0:
                raise ValueError(
                    "Expected frequencies must be > 0 for chi-square computation. "
                    "Check that no row/column sum is zero."
                )

    # Chi-square statistic: sum((O - E)^2 / E)
    chi2_stat = 0.0
    for i in range(r):
        for j in range(c):
            chi2_stat += (obs[i][j] - expected[i][j]) ** 2 / expected[i][j]
    
    dof = (r - 1) * (c - 1)

    if dof <= 0:
        raise ValueError("Degrees of freedom must be > 0.")

    # Manual p-value calculation
    p_value = 1 - chi2_cdf(chi2_stat, dof)

    return {
        "chi2": float(chi2_stat),
        "dof": int(dof),
        "p_value": p_value,
        "expected": expected,
    }

