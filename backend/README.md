# Chi-Square AI Impact (Backend)

FastAPI backend that computes the Chi-Square test of independence between:
- `AI Tool Usage` categories (rows)
- `Academic Performance` categories (columns)

## Run

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API

`POST /api/chi-square`

Request body:
```json
{
  "rows": ["Never", "Sometimes", "Frequently"],
  "cols": ["High", "Medium", "Low"],
  "table": [
    [5, 12, 8],
    [10, 15, 5],
    [15, 8, 2]
  ],
  "alpha": 0.05
}
```

