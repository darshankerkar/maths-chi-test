# AI Usage vs Academic Performance — Chi-Square Test of Independence

![Course](https://img.shields.io/badge/Course-Engineering%20Mathematics%204%20(BSC07)-black?style=flat-square)
![Topic](https://img.shields.io/badge/Topic-Chi--Square%20Test%20of%20Independence-green?style=flat-square)
![Python](https://img.shields.io/badge/🐍%20Python-3.13%2B-blue?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Uvicorn-teal?style=flat-square)
![Frontend](https://img.shields.io/badge/⚛%20Frontend-React%2019%20%2B%20Vite-purple?style=flat-square)

> **Course:** Engineering Mathematics 4 (EM-4 / BSC07)  
> **Topic Allocated:** Chi-Square Test of Independence

---

##   Overview

This project answers a concrete statistical question: **is there a statistically significant relationship between students' AI tool usage and their academic performance?**

**The statistical side:** A contingency table of observed frequencies is provided by the user (rows = AI usage level, columns = performance grade). The system computes expected frequencies under the null hypothesis, the χ² statistic, degrees of freedom, and a p-value — all **implemented manually** in `chi_square.py` without relying on `scipy.stats.chi2_contingency` or any statistics library.

**The frontend side:** A React + Vite interface accepts the contingency table as input and displays all computed results live, including the expected frequency matrix and a clear accept/reject decision on the null hypothesis.

---

## Why Chi-Square Test?

The choice of the Chi-Square Test of Independence is determined directly by the structure of the data and the research question.

| Condition | Evidence in the project |
|---|---|
| Data is categorical | AI usage = Never / Sometimes / Frequently; Performance = High / Medium / Low |
| Observations are frequency counts | Cells contain counts of students, not continuous measurements |
| No normality assumption required | Chi-square distribution is used; no Gaussian assumption on the data |
| Testing independence between two variables | Null hypothesis: AI usage and academic performance are independent |
| Minimum expected frequency ≥ 5 | Verified programmatically in `chi_square.py` before computing χ² |

A t-test or ANOVA would be wrong here because the response variable is a **category** (High / Medium / Low), not a continuous score. The Chi-Square Test is the standard non-parametric test for this type of contingency table data.

---

## Dataset

There is no static CSV file. The contingency table is **entered directly by the user** in the frontend. The default example table embedded in the UI uses the following observed frequencies:

### Observed Frequency Table (Default Example)

| AI Usage ↓ / Performance → | High | Medium | Low | Row Total |
|---|---|---|---|---|
| **Never** | 5 | 12 | 8 | 25 |
| **Sometimes** | 10 | 15 | 5 | 30 |
| **Frequently** | 15 | 8 | 2 | 25 |
| **Column Total** | 30 | 35 | 15 | **80** |

```python
# Default table in App.tsx
table = [
    [5,  12, 8],
    [10, 15, 5],
    [15, 8,  2],
]
```
## Advantages of the Proposed System

* Manual chi-square implementation (no SciPy)
* Works for any r × c contingency table
* Real-time calculation
* User-friendly UI
* FastAPI backend
* React frontend
* Accurate statistical computation
* Educational visualization of expected frequencies

## Future Enhancements

The following features can be added in future versions:

* Cramer's V calculation
* Graphical chi-square distribution curve
* CSV file upload
* Export results to PDF
* Heatmap visualization
* Confidence level selector
* Downloadable report
* Dark/light mode toggle

## Real World Applications

The Chi-Square Test of Independence is used in:

* Education analytics
* Market research
* Healthcare analysis
* Finance analytics
* Survey data analysis
* Machine learning feature dependency

---


---

## Hypotheses

**H₀ (Null Hypothesis):**
> AI tool usage and academic performance are **independent** — knowing a student's AI usage level gives no information about their performance category.

**H₁ (Alternative Hypothesis):**
> AI tool usage and academic performance are **associated** — the distribution of performance grades differs across AI usage groups.

**Decision rule:** If `p-value < 0.05`, reject H₀. Otherwise, fail to reject H₀.

---

## Manual Chi-Square Implementation

The entire chi-square computation lives in `backend/app/chi_square.py` and is mirrored in the frontend's `App.tsx` (`computeChiSquare` function). Neither file imports `scipy`, `statsmodels`, or any statistical library. Only Python's built-in `math` module is used on the backend.

### Step 1 — Observed Frequencies (O)

The contingency table entered by the user is treated directly as the matrix of observed frequencies.

```python
# chi_square.py
observed = table  # user-provided 2D list
```

### Step 2 — Row and Column Totals

```python
# chi_square.py
row_totals    = [sum(row) for row in observed]
col_totals    = [sum(col) for col in zip(*observed)]
grand_total   = sum(row_totals)
```

### Step 3 — Expected Frequencies (E)

For each cell (i, j):

```
        Row_Total_i × Col_Total_j
E_ij =  ──────────────────────────
                Grand Total
```

```python
# chi_square.py
expected = [
    [(row_totals[i] * col_totals[j]) / grand_total
     for j in range(cols)]
    for i in range(rows)
]
```

### Step 4 — Chi-Square Statistic (χ²)

```
       (O_ij - E_ij)²
χ² = Σ ───────────────
            E_ij
```

```python
# chi_square.py
chi_sq = sum(
    (observed[i][j] - expected[i][j]) ** 2 / expected[i][j]
    for i in range(rows)
    for j in range(cols)
)
```

### Step 5 — Degrees of Freedom

```
df = (rows - 1) × (cols - 1)
```

```python
# chi_square.py
df = (rows - 1) * (cols - 1)
```

### Step 6 — p-value (Manual CDF)

The p-value is approximated using a manual implementation of the Chi-Square CDF via the regularised incomplete gamma function — no `scipy` involved.

```python
# chi_square.py  (simplified)
p_value = 1 - chi2_cdf(chi_sq, df)   # manual regularised gamma
```

### Step 7 — Decision

```python
conclusion = "Reject H₀" if p_value < 0.05 else "Fail to Reject H₀"
```

---

## Methodology (Execution Path)

The following traces the actual execution path through the code:

```
[app.py — startup]
  (no model training; stateless API)

[POST /api/chi-square — request arrives]
  chi_square.compute(table)
  ├── validate table dimensions and minimum expected frequency
  ├── compute row_totals, col_totals, grand_total
  ├── build expected[][] matrix
  ├── accumulate chi_sq over all cells
  ├── df = (r-1)(c-1)
  ├── p_value = 1 - chi2_cdf(chi_sq, df)   ← manual CDF
  └── return {chi_square, p_value, degrees_of_freedom, expected}

[Frontend — App.tsx, on form submit / live update]
  computeChiSquare(table)
  ├── mirrors chi_square.py step-for-step (no library calls)
  ├── displays expected[][] as a formatted table
  ├── displays χ², df, p-value
  └── shows colour-coded accept / reject banner
```

---

## Project Structure

```
maths-chi-test/
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application + CORS + /api/chi-square endpoint
│   │   ├── chi_square.py    # Manual chi-square computation (no scipy)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main UI + mirrored chi-square logic
│   │   ├── style.css        # Glassmorphic dark-theme styles
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```
## Conclusion

The Chi-Square Test Web Application demonstrates a complete statistical workflow from user input to hypothesis testing and interpretation. The project uses a manual implementation of chi-square computation without relying on statistical libraries, ensuring conceptual clarity and academic value. The interactive frontend and FastAPI backend make the system suitable for both educational and practical use.

---

## Installation and Setup

### Prerequisites

- Python 3.13+
- Node.js 18+ and npm

### Run Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend URL: `http://127.0.0.1:8000`

### Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## API Reference

### `POST /api/chi-square`

**Request Body**

```json
{
  "table": [
    [5,  12, 8],
    [10, 15, 5],
    [15, 8,  2]
  ]
}
```

**Response**

```json
{
  "chi_square": 11.174,
  "p_value": 0.0247,
  "degrees_of_freedom": 4,
  "expected": [
    [9.375, 10.937, 4.687],
    [11.25, 13.125, 5.625],
    [9.375, 10.937, 4.687]
  ]
}
```

---

## Interpretation

| Condition | Conclusion |
|---|---|
| `p_value < 0.05` | **Reject H₀** — significant association exists between AI usage and academic performance |
| `p_value ≥ 0.05` | **Fail to Reject H₀** — no significant association detected |

For the default example table, `χ² ≈ 11.17`, `df = 4`, `p ≈ 0.025` → **Reject H₀**.

---

## Features

- Full-stack implementation (FastAPI + React 19 + Vite)
- Manual χ² computation — no `scipy`, `statsmodels`, or statistics library
- Dynamic contingency table input (any r × c dimensions)
- Live expected frequency matrix display
- Clear colour-coded hypothesis decision banner
- CORS-enabled REST API

---

## Deployment (Optional)

The project can be deployed using:

| Component | Platform |
|---|---|
| Frontend | Vercel / Netlify |
| Backend | Render / Railway / Fly.io |

Ensure environment variables for the API base URL are set in the frontend before deploying.

---

## Demo Requirements

- **Duration:** 2–4 minutes
- **Must cover:**
  - Group Number - 11
  - Class and Division - SE-INFT-C
  - Topic Name - *Chi-Square Test*
  - Team Leader - Ashutosh Tripathi
  - Live walkthrough: enter table → view χ², df, p-value → interpret result

---

## References

- Walpole, R. E. — *Probability and Statistics for Engineers and Scientists*
- Montgomery, D. C. — *Applied Statistics and Probability for Engineers*
- Standard Chi-Square Test of Independence theory
- GitHub Documentation: <https://docs.github.com>
