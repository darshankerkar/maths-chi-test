# Maths Chi-Square AI Impact (Full Stack)

This project tests whether **AI tool usage** is associated with **academic performance** using the **Chi-Square test of independence**.

- Backend: **Python (FastAPI)** computes the contingency table chi-square statistic, degrees of freedom, expected frequencies, and p-value.
- Frontend: **React (Vite)** lets you enter the contingency table and displays the results.

## Prerequisites

- Python 3.13+
- Node.js + npm

## Run Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend base URL:
- `http://127.0.0.1:8000`

## Run Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend dev URL:
- `http://localhost:5173`

The frontend calls `POST /api/chi-square` via Vite proxy.

## Example Dataset (from the assignment)

Rows (AI usage): `Never`, `Sometimes`, `Frequently`  
Columns (Performance): `High`, `Medium`, `Low`  
Table:
`[[5,12,8],[10,15,5],[15,8,2]]`

