from __future__ import annotations

from typing import List, Sequence

import numpy as np
from scipy.stats import chi2 as chi2_dist


def chi_square_test_of_independence(table: Sequence[Sequence[float]]) -> dict:
    """
    Pearson chi-square test of independence for a contingency table.
    """
    obs = np.asarray(table, dtype=float)
    if obs.ndim != 2:
        raise ValueError("`table` must be a 2D array-like structure.")

    r, c = obs.shape
    if r < 2 or c < 2:
        raise ValueError("Chi-square test requires at least 2 rows and 2 columns.")

    row_sums = obs.sum(axis=1)
    col_sums = obs.sum(axis=0)
    total = obs.sum()
    if total <= 0:
        raise ValueError("Total count in `table` must be > 0.")

    # Expected counts: (row_sum_i * col_sum_j) / total
    expected = np.outer(row_sums, col_sums) / total

    if np.any(expected <= 0):
        raise ValueError(
            "Expected frequencies must be > 0 for chi-square computation. "
            "Check that no row/column sum is zero."
        )

    chi2_stat = np.sum((obs - expected) ** 2 / expected)
    dof = (r - 1) * (c - 1)

    if dof <= 0:
        raise ValueError("Degrees of freedom must be > 0.")

    p_value = float(chi2_dist.sf(chi2_stat, dof))

    return {
        "chi2": float(chi2_stat),
        "dof": int(dof),
        "p_value": p_value,
        "expected": expected.tolist(),
    }

