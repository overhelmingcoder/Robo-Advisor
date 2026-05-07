# BDT Advisor - Bangladesh Robo-Advisor

BDT Advisor is a full-stack investment recommendation web app for Bangladesh investors. It compares 100+ local investment schemes, including DPS, FDR, government savings certificates, bonds, mutual funds, and savings products, then recommends the top matches for a user's income, monthly investment, risk level, investment horizon, and target goal.

The project has a React + Vite frontend and a FastAPI backend. The backend uses deterministic filtering and scoring first, then can optionally call an OpenAI-compatible LLM provider through LiteLLM or OpenRouter for richer explanations and scheme-specific chat.

## Features

- Financial profile form for monthly income, monthly investment, duration, risk level, and optional target goal.
- Recommendation engine over `backend/schemes_data.json`.
- Top 5 ranked schemes with projected maturity value, total invested, projected profit, ROI, score, liquidity, and notes.
- Scheme-specific chat assistant for follow-up questions.
- Local browser history for recently submitted profiles.
- Dev proxy from Vite `/api/*` to FastAPI.
- Optional local-only fast mode when no AI provider key is configured.
- Architecture documentation with Mermaid diagrams in `architectur.md`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5 |
| Backend | FastAPI, Uvicorn, Pydantic |
| HTTP client | httpx |
| AI provider | LiteLLM gateway preferred, OpenRouter fallback |
| Data source | Local JSON dataset |
| Package managers | npm for frontend, uv or pip for backend |

## Project Structure

```text
project/
├── README.md
├── architectur.md
├── backend/
│   ├── main.py
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── uv.lock
│   ├── schemes_data.json
│   ├── .env.example
│   └── app/
│       ├── server.py
│       ├── config.py
│       ├── data.py
│       ├── models.py
│       ├── tools.py
│       ├── api/
│       │   ├── recommend.py
│       │   ├── chat.py
│       │   └── schemes.py
│       └── services/
│           ├── recommendation.py
│           └── chat.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── services/
        ├── components/
        ├── constants/
        └── utils/
```

## Prerequisites

Install these before running the project:

- Python 3.11 or newer
- Node.js 18 or newer
- npm, included with Node.js
- Git
- Optional: `uv` for faster Python dependency management

Check your installed versions:

```bash
python --version
node --version
npm --version
git --version
```

If `python` does not work on Windows, try:

```powershell
py --version
```

## Clone the Repository

```bash
git clone https://github.com/overhelmingcoder/Robo-Advisor.git
cd Robo-Advisor
```

## Backend Setup

The backend runs on `http://localhost:8000`.

### 1. Enter the Backend Folder

```bash
cd backend
```

### 2. Create a Virtual Environment

Windows PowerShell:

```powershell
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run this once in the same terminal:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

After activation, your terminal prompt should show `(venv)`.

### 3. Install Backend Dependencies

Option A - using pip:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Option B - using uv:

```bash
uv sync
```

If you use `uv`, run backend commands with `uv run ...` or activate the `.venv` created by uv.

### 4. Create the Backend Environment File

Copy the sample environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Then edit `backend/.env`.

### 5. Configure AI Provider

The backend supports two provider modes.

#### LiteLLM Gateway

LiteLLM is used when both `LITE_LLM_URL` and `LITELLM_MASTER_KEY` are set:

```env
LITE_LLM_URL=localhost:4000
LITELLM_MASTER_KEY=your-lite-llm-master-key
LITELLM_MODEL=openrouter/nvidia/nemotron-3-super-120b-a12b:free
```

#### OpenRouter

OpenRouter is used when LiteLLM is not fully configured:

```env
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Optional tuning values:

```env
OPENROUTER_TIMEOUT=30
OPENROUTER_MAX_ITER=2
OPENROUTER_TEMP=0.0
OPENROUTER_CACHE_TTL=300
FAST_RETURN=1
FAST_ENRICH=1
```

### 6. Run Without an AI Key

For local testing without LiteLLM or OpenRouter credentials, add this to `backend/.env`:

```env
DEV_FAST_MODE=1
FAST_RETURN=1
FAST_ENRICH=0
```

This returns deterministic local recommendations from `filter_schemes` and `score_and_rank_schemes`. Scheme chat will return a short local fallback response.

### 7. Start the Backend Server

With pip/venv:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

With uv:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open these URLs to verify the backend:

- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`
- Raw schemes: `http://localhost:8000/schemes`

## Frontend Setup

The frontend runs on `http://localhost:5173`.

Open a second terminal from the project root, then run:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

In development, `frontend/vite.config.js` proxies frontend calls:

```text
/api/recommend -> http://localhost:8000/recommend
/api/chat      -> http://localhost:8000/chat
```

That means you do not need `VITE_API_URL` for normal local development.

## Running the Full Website Locally

Use two terminals.

Terminal 1 - backend:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - frontend:

```bash
cd frontend
npm run dev
```

Then visit:

```text
http://localhost:5173
```

## Production Frontend Build

From `frontend/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

If the frontend and backend are deployed separately, configure the frontend build with:

```env
VITE_API_URL=https://your-backend-domain.com
```

For local direct-backend testing:

```env
VITE_API_URL=http://localhost:8000
```

When `VITE_API_URL` is set, the frontend calls:

```text
{VITE_API_URL}/recommend
{VITE_API_URL}/chat
```

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check with provider and model details |
| `GET` | `/schemes` | Returns all loaded scheme records |
| `POST` | `/recommend` | Returns top ranked investment recommendations |
| `POST` | `/chat` | Answers questions about a selected scheme |

### Recommendation Request

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

### Recommendation Response

```json
{
  "schemes": [
    {
      "scheme_id": "SCH-037",
      "scheme_name": "Paribar Sanchaypatra",
      "provider": "NSD / Bangladesh Govt",
      "scheme_type": "Govt Bond",
      "risk_level": "Low",
      "interest_rate_typical": 11.52,
      "projected_maturity_value": 823456,
      "total_invested": 600000,
      "projected_profit": 223456,
      "liquidity": "Medium",
      "score": 87.4,
      "why": "Personalized explanation for this user.",
      "notes": "Scheme notes."
    }
  ],
  "summary": "Overall recommendation summary."
}
```

### Chat Request

```json
{
  "scheme_id": "SCH-037",
  "question": "What are the risks?",
  "profile": {
    "monthly_income": 50000,
    "monthly_investment": 10000,
    "time_range_years": 5,
    "risk_level": "Low",
    "target_goal": 800000
  },
  "history": [
    {
      "role": "assistant",
      "content": "You selected Paribar Sanchaypatra."
    },
    {
      "role": "user",
      "content": "What are the risks?"
    }
  ]
}
```

### Chat Response

```json
{
  "reply": "Plain text answer about the selected scheme."
}
```

## Recommendation Logic

The backend uses these hard filters first:

| Rule | Logic |
| --- | --- |
| R-01 | Scheme risk level must match the user's selected risk level |
| R-02 | User's investment duration must fit within the scheme duration range |
| R-03 | User's monthly investment must meet the scheme minimum |

Then it scores matched schemes:

| Rule | Weight | Logic |
| --- | --- | --- |
| R-04 | 40% | Higher typical interest rate scores higher |
| R-05 | 25% | Duration closer to the user's horizon scores higher |
| R-06 | 15% | Government providers receive a trust bonus, especially for low-risk users |
| R-07 | 20% | Projected maturity value is compared with the target goal |
| R-08 | +5 | High liquidity schemes receive a bonus |

## Useful Commands

Backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```

Build frontend:

```bash
cd frontend
npm run build
```

Preview frontend build:

```bash
cd frontend
npm run preview
```

Check Git status:

```bash
git status
```

## Troubleshooting

### Backend says credentials are not set

Create `backend/.env` and add LiteLLM/OpenRouter credentials. For local-only testing, use:

```env
DEV_FAST_MODE=1
FAST_RETURN=1
FAST_ENRICH=0
```

### Frontend cannot reach backend

Make sure the backend is running:

```text
http://localhost:8000/health
```

For local Vite development, use frontend URL `http://localhost:5173` and leave `VITE_API_URL` unset unless you need direct backend calls.

### Port already in use

Use another backend port:

```bash
uvicorn main:app --reload --port 8001
```

Then update `frontend/vite.config.js` proxy target or set `VITE_API_URL=http://localhost:8001`.

### PowerShell cannot activate venv

Run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
.\venv\Scripts\Activate.ps1
```

## Deployment Options

### Separate Deployments

- Deploy backend to Railway, Render, Fly.io, EC2, or another Python host.
- Deploy frontend to Vercel, Netlify, or any static hosting service.
- Set `VITE_API_URL` in the frontend deployment environment to the backend URL.
- Set backend environment variables on the backend host.

### Single Backend Serving Static Files

Build the frontend:

```bash
cd frontend
npm run build
```

Then serve `frontend/dist` from FastAPI with `StaticFiles` if you want one deployable backend service.

## Security Notes

- Do not commit `backend/.env`.
- Keep API keys in deployment environment variables.
- The included `.gitignore` excludes local env files, virtual environments, dependency folders, build output, and Python caches.
- Recommendation outputs are estimates, not licensed financial advice.

## Documentation

For system diagrams and architecture details, see:

```text
architectur.md
```

