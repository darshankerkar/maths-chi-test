from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, model_validator


class ChiSquareRequest(BaseModel):
    rows: List[str] = Field(..., min_length=2, description="Category labels for rows.")
    cols: List[str] = Field(..., min_length=2, description="Category labels for columns.")
    table: List[List[float]] = Field(..., description="Contingency table counts [row][col].")
    alpha: float = Field(0.05, gt=0, lt=1, description="Significance level for hypothesis test.")

    @model_validator(mode="after")
    def validate_shape(self) -> "ChiSquareRequest":
        if len(self.table) != len(self.rows):
            raise ValueError("`table` row count must match length of `rows`.")
        for i, r in enumerate(self.table):
            if len(r) != len(self.cols):
                raise ValueError(f"`table[{i}]` column count must match length of `cols`.")
        # Chi-square assumes non-negative counts.
        for i, r in enumerate(self.table):
            for j, v in enumerate(r):
                if v < 0:
                    raise ValueError(f"`table[{i}][{j}]` must be non-negative.")
        return self


class ChiSquareResponse(BaseModel):
    chi2: float
    dof: int
    critical_value: float
    p_value: float
    expected: List[List[float]]
    alpha: float
    reject_null: bool
    conclusion: str

