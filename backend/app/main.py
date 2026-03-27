from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from .chi_square import chi_square_test_of_independence


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


@app.post("/api/chi-square")
def chi_square_endpoint(payload: Dict[str, Any]) -> Dict[str, Any]:
    table = payload.get("table", [])
    alpha = payload.get("alpha", 0.05)
    
    result = chi_square_test_of_independence(table)
    
    # Manual critical value calculation (simplified)
    critical_value = 5.991  # Approximate for df=4, alpha=0.05
    
    reject_null = result["chi2"] >= critical_value
    conclusion = (
        "Reject H0: AI usage and academic performance are related."
        if reject_null
        else "Fail to reject H0: AI usage and academic performance appear independent."
    )

    return {
        "chi2": result["chi2"],
        "dof": result["dof"],
        "critical_value": critical_value,
        "p_value": result["p_value"],
        "expected": result["expected"],
        "alpha": alpha,
        "reject_null": reject_null,
        "conclusion": conclusion,
    }

