from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scipy.stats import chi2 as chi2_dist

from .chi_square import chi_square_test_of_independence
from .models import ChiSquareRequest, ChiSquareResponse


app = FastAPI(title="Chi-Square AI Impact API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For demo/development; tighten in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/chi-square", response_model=ChiSquareResponse)
def chi_square_endpoint(payload: ChiSquareRequest) -> ChiSquareResponse:
    result = chi_square_test_of_independence(payload.table)
    critical_value = float(chi2_dist.ppf(1 - payload.alpha, result["dof"]))
    reject_null = result["chi2"] >= critical_value
    conclusion = (
        "Reject H0: AI usage and academic performance are related."
        if reject_null
        else "Fail to reject H0: AI usage and academic performance appear independent."
    )

    return ChiSquareResponse(
        chi2=result["chi2"],
        dof=result["dof"],
        critical_value=critical_value,
        p_value=result["p_value"],
        expected=result["expected"],
        alpha=payload.alpha,
        reject_null=reject_null,
        conclusion=conclusion,
    )

