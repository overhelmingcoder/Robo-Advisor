# 🏦 BDT Advisor — Bangladesh Investment Recommendation Platform

A full-stack AI-powered investment advisor that recommends the top 5 investment schemes for Bangladesh investors using a comprehensive dataset of 100+ real schemes (DPS, FDR, Government Bonds, Mutual Funds, etc.).

---

## Architecture

```
robo-advisor/
├── backend/              ← FastAPI (Python)
│   ├── main.py           ← API routes + AI agentic loop
│   ├── schemes_data.json ← 100+ Bangladesh schemes (pre-extracted)
│   ├── pyproject.toml    ← uv project config
│   ├── uv.lock           ← uv lockfile
│   ├── requirements.txt
│   ├── .env.example
│   └── .env              ← YOUR API KEY GOES HERE
│
└── frontend/             ← React + Vite
    ├── src/
    │   ├── App.jsx       ← Full UI (single file)
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    └── vite.config.js    ← Proxies /api → http://localhost:8000
```

---

## How It Works

1. User inputs: monthly income, monthly investment, time horizon, risk level, optional goal
2. React frontend posts to `/api/recommend`
3. FastAPI backend calls OpenRouter (your chosen model) with **tool-use**
4. AI calls `filter_schemes` → hard filters by risk, duration, min investment
5. AI calls `score_and_rank_schemes` → scores by rate (40%), duration match (25%), trust (15%), goal (20%) + bonuses
6. AI returns a JSON object with top 5 schemes + personalised `why` and `summary`
7. React renders ranked cards with projected maturity value, profit, ROI

---

## Setup

### 1. Backend

```bash
cd backend

# Create .env
cp .env.example .env
# Edit .env for AI provider credentials.
# If both `LITE_LLM_URL` and `LITELLM_MASTER_KEY` are set,
# backend will call LiteLLM first; otherwise it will use OpenRouter.

# Install dependencies with uv (recommended)
uv sync

# Run
uv run uvicorn main:app --reload --port 8000
```

Your `.env` should include:

- LiteLLM (preferred when both variables are present):
```env
LITE_LLM_URL=localhost:4000
LITELLM_MASTER_KEY=your-lite-llm-master-key
LITELLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

- OpenRouter (fallback when LiteLLM config is missing):
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_TIMEOUT=20
OPENROUTER_MAX_ITER=1
OPENROUTER_TEMP=0.0
OPENROUTER_CACHE_TTL=300
```

When both `LITE_LLM_URL` and `LITELLM_MASTER_KEY` are set, the backend uses LiteLLM.
Otherwise it falls back to OpenRouter.

Supported OpenRouter models (change `OPENROUTER_MODEL`):
- `anthropic/claude-3.5-sonnet` (recommended — best tool use)
- `anthropic/claude-3-haiku` (faster, cheaper)
- `openai/gpt-4o`
- `google/gemini-flash-1.5`

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Open http://localhost:5173

Vite proxies `/api/*` → `http://localhost:8000` so no CORS issues in dev.

For deployed frontend builds, set:

```env
VITE_API_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recommend` | Main recommendation endpoint |
| POST | `/chat` | Ask follow-up questions about a selected scheme |
| GET | `/schemes` | Returns all 100+ raw scheme records |
| GET | `/health` | Health check |

### POST /recommend — Request Body

```json
{
  "profile": {
    "monthly_income": 50000,
    "monthly_investment": 10000,
    "time_range_years": 5,
    "risk_level": "Low",
    "target_goal": 800000
  }
}
```

### POST /recommend — Response

```json
{
  "schemes": [
    {
      "scheme_id": "SCH-037",
      "scheme_name": "Paribar Sanchaypatra",
      "provider": "NSD / Bangladesh Govt",
      "scheme_type": "Govt Bond",
      "interest_rate_typical": 11.52,
      "projected_maturity_value": 823456,
      "total_invested": 600000,
      "projected_profit": 223456,
      "score": 87.4,
      "why": "Best risk-adjusted return for conservative investors...",
      ...
    }
  ],
  "summary": "Your portfolio is well-balanced across government and private schemes..."
}
```

---

## Scoring Rules (from dataset)

| Rule | Weight | Logic |
|------|--------|-------|
| R-01 | HARD FILTER | Risk level must match exactly |
| R-02 | HARD FILTER | Duration must fit within scheme's min/max |
| R-03 | HARD FILTER | Monthly investment ≥ scheme minimum |
| R-04 | 40% | Higher interest rate → higher score |
| R-05 | 25% | Duration closer to user preference → higher score |
| R-06 | 15% | Government schemes get trust bonus for Low risk |
| R-07 | 20% | Projected maturity ≥ target goal → full score |
| R-08 | +5 bonus | High liquidity schemes get bonus |

---

## Production Deployment

For production, build the frontend and serve it from FastAPI:

```bash
# Build frontend
cd frontend && npm run build

# Serve with FastAPI (add to main.py)
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="../frontend/dist", html=True))
```

Or deploy separately:
- Backend → Railway / Render / EC2
- Frontend → Vercel / Netlify (set `VITE_API_URL` env var and update fetch calls)
