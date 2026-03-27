from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, validator


class ChiSquareRequest(BaseModel):
    rows: List[str] = Field(..., min_length=2, description="Category labels for rows.")
    cols: List[str] = Field(..., min_length=2, description="Category labels for columns.")
    table: List[List[float]] = Field(..., description="Contingency table counts [row][col].")
    alpha: float = Field(0.05, gt=0, lt=1, description="Significance level for hypothesis test.")

    @validator('table')
    def validate_shape(cls, v, values):
        if 'rows' in values and len(v) != len(values['rows']):
            raise ValueError("`table` row count must match length of `rows`.")
        if 'cols' in values:
            for i, r in enumerate(v):
                if len(r) != len(values['cols']):
                    raise ValueError(f"`table[{i}]` column count must match length of `cols`.")
        # Chi-square assumes non-negative counts.
        for i, r in enumerate(v):
            for j, val in enumerate(r):
                if val < 0:
                    raise ValueError(f"`table[{i}][{j}]` must be non-negative.")
        return v


class ChiSquareResponse(BaseModel):
    chi2: float
    dof: int
    critical_value: float
    p_value: float
    expected: List[List[float]]
    alpha: float
    reject_null: bool
    conclusion: str

