# Architecture

BDT Advisor is a full-stack Bangladesh investment recommendation application. The frontend collects a user's financial profile, the backend filters and scores local investment scheme data, and an optional LLM provider enriches recommendations and scheme-specific chat responses.

## System Context

```mermaid
flowchart LR
    User[Investor] --> Browser[React app in browser]
    Browser -->|HTTP /api/* in dev| Vite[Vite dev proxy]
    Vite -->|rewrites /api to backend paths| API[FastAPI backend]
    Browser -->|HTTP direct when VITE_API_URL is set| API
    API --> Data[(schemes_data.json)]
    API --> Cache[(In-memory recommendation cache)]
    API -->|OpenAI-compatible chat completions| LLM{LiteLLM or OpenRouter}
```

## Repository Layout

```mermaid
flowchart TB
    Root[project root]
    Root --> Frontend[frontend]
    Root --> Backend[backend]
    Root --> Readme[README.md]
    Root --> Arch[architectur.md]

    Frontend --> FEsrc[src]
    Frontend --> ViteConfig[vite.config.js]
    Frontend --> Package[package.json]
    FEsrc --> App[App.jsx]
    FEsrc --> Components[components]
    FEsrc --> Services[services/recommendApi.js]
    FEsrc --> Utils[utils/localStorage.js]

    Backend --> Main[main.py]
    Backend --> AppPkg[app]
    Backend --> Schemes[schemes_data.json]
    Backend --> PyProject[pyproject.toml]
    AppPkg --> Server[server.py]
    AppPkg --> Api[api routers]
    AppPkg --> ServicesBE[services]
    AppPkg --> Tools[tools.py]
    AppPkg --> Models[models.py]
    AppPkg --> Config[config.py]
    AppPkg --> Data[data.py]
```

## Runtime Components

```mermaid
flowchart LR
    subgraph Frontend["Frontend: React 18 + Vite"]
        AppState[App.jsx state orchestration]
        Form[InputForm]
        Results[ResultsSection + SchemeCard]
        ChatUI[SchemeChat]
        ApiClient[recommendApi.js]
        LocalStorage[localStorage history]
    end

    subgraph Backend["Backend: FastAPI"]
        FastAPI[app.server FastAPI app]
        RecRouter["POST /recommend"]
        ChatRouter["POST /chat"]
        SchemeRouter["GET /schemes and /health"]
        RecService[recommendation service]
        ChatService[chat service]
        DecisionTools[filter_schemes and score_and_rank_schemes]
        DataLoader[data.py]
        Settings[config.py]
    end

    Form --> AppState
    AppState --> ApiClient
    ApiClient --> RecRouter
    ApiClient --> ChatRouter
    LocalStorage --> Form
    RecRouter --> RecService
    ChatRouter --> ChatService
    SchemeRouter --> DataLoader
    RecService --> DecisionTools
    DecisionTools --> DataLoader
    ChatService --> DataLoader
    RecService --> Settings
    ChatService --> Settings
```

## Backend Request Flow

```mermaid
flowchart TD
    Request[RecommendationRequest profile] --> CacheCheck{Fresh cache hit?}
    CacheCheck -->|yes| Cached[Return cached response]
    CacheCheck -->|no| HasKey{AI API key configured?}
    HasKey -->|no and DEV_FAST_MODE=1| LocalFallback[Local filter + local score]
    HasKey -->|no and DEV_FAST_MODE!=1| CredError[HTTP 500 credentials error]
    HasKey -->|yes| FastReturn{FAST_RETURN enabled?}

    FastReturn -->|yes| LocalFast[Return local ranked schemes]
    LocalFast --> MaybeEnrich{FAST_ENRICH enabled?}
    MaybeEnrich -->|yes| BackgroundLLM[Background LLM enrichment updates cache]
    MaybeEnrich -->|no| DoneFast[Done]

    FastReturn -->|no| AgentLoop[LLM tool-call loop]
    AgentLoop --> FilterTool[filter_schemes]
    FilterTool --> ScoreTool[score_and_rank_schemes]
    ScoreTool --> FinalJson[LLM returns final JSON]
    FinalJson --> Response[Return recommendations]
```

## Recommendation Sequence

```mermaid
sequenceDiagram
    actor User
    participant UI as React UI
    participant Client as recommendApi.js
    participant API as FastAPI /recommend
    participant Service as recommend_schemes
    participant Tools as Decision tools
    participant Data as schemes_data.json
    participant LLM as LiteLLM/OpenRouter

    User->>UI: Submit financial profile
    UI->>Client: fetchRecommendations(profile)
    Client->>API: POST /recommend
    API->>Service: validate RecommendationRequest
    Service->>Tools: filter_schemes(...)
    Tools->>Data: read loaded SCHEMES
    Tools-->>Service: matched scheme ids
    Service->>Tools: score_and_rank_schemes(...)
    Tools-->>Service: top 5 ranked schemes
    alt FAST_RETURN enabled
        Service-->>API: local recommendations
        Service-)LLM: optional background enrichment
    else Agentic mode
        Service->>LLM: messages + tool schemas
        LLM->>Service: tool calls / final JSON
    end
    API-->>Client: recommendation response
    Client-->>UI: schemes + summary
    UI-->>User: ranked recommendation cards
```

## Scheme Chat Sequence

```mermaid
sequenceDiagram
    actor User
    participant UI as SchemeChat
    participant Client as recommendApi.js
    participant API as FastAPI /chat
    participant Service as chat_about_scheme
    participant Data as schemes_data.json
    participant LLM as LiteLLM/OpenRouter

    User->>UI: Select a scheme
    UI-->>User: Show chat panel
    User->>UI: Ask follow-up question
    UI->>Client: sendSchemeChatMessage(payload)
    Client->>API: POST /chat
    API->>Service: validate ChatRequest
    Service->>Data: find_scheme(scheme_id)
    alt scheme not found
        Service-->>API: HTTP 404
    else scheme found
        Service->>LLM: selected scheme context + profile + history
        LLM-->>Service: plain text answer
        Service-->>API: { reply }
    end
    API-->>Client: chat response
    Client-->>UI: reply
    UI-->>User: advisor message
```

## API Surface

```mermaid
classDiagram
    class UserProfile {
        float monthly_income
        float monthly_investment
        float time_range_years
        string risk_level
        float? target_goal
    }

    class RecommendationRequest {
        UserProfile profile
    }

    class ChatMessage {
        string role
        string content
    }

    class ChatRequest {
        string scheme_id
        string question
        UserProfile? profile
        ChatMessage[] history
    }

    RecommendationRequest --> UserProfile
    ChatRequest --> UserProfile
    ChatRequest --> ChatMessage
```

## Data and Scoring

The backend loads `backend/schemes_data.json` once through `app.data.SCHEMES`. The recommendation engine applies hard filters first, then scores the remaining schemes.

```mermaid
flowchart LR
    Profile[User profile] --> Risk[Risk match]
    Risk --> Duration[Duration fit]
    Duration --> Minimum[Minimum monthly investment]
    Minimum --> Matched[Matched scheme ids]
    Matched --> Rate[Interest rate score: 40%]
    Matched --> Time[Duration match: 25%]
    Matched --> Trust[Provider trust: 15%]
    Matched --> Goal[Goal coverage: 20%]
    Matched --> Liquidity[Liquidity bonus: +5]
    Rate --> Rank[Final score]
    Time --> Rank
    Trust --> Rank
    Goal --> Rank
    Liquidity --> Rank
    Rank --> Top5[Top 5 schemes with projected value]
```

## Configuration

```mermaid
flowchart TD
    Env[backend/.env or project .env] --> Config[app/config.py]
    Config --> Provider{Provider selection}
    Provider -->|LITE_LLM_URL and LITELLM_MASTER_KEY set| LiteLLM[LiteLLM /v1/chat/completions]
    Provider -->|otherwise| OpenRouter[OpenRouter chat completions]
    Config --> Tuning[Timeout, temperature, max iterations, cache TTL]
    Config --> FastMode[FAST_RETURN and FAST_ENRICH]
    Config --> Cors[CORS allowed origins]
```

Key backend settings:

- `LITE_LLM_URL`, `LITELLM_MASTER_KEY`, `LITELLM_MODEL`: use LiteLLM gateway.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`: fallback provider configuration.
- `FAST_RETURN`: returns local recommendations immediately when enabled.
- `FAST_ENRICH`: optionally enriches the cache in the background.
- `OPENROUTER_CACHE_TTL`: in-memory recommendation cache duration.
- `DEV_FAST_MODE`: allows local-only behavior when no AI key exists.

## Deployment View

```mermaid
flowchart LR
    subgraph Dev["Development"]
        BrowserDev[Browser localhost:5173]
        ViteDev[Vite dev server]
        FastAPIDev[Uvicorn localhost:8000]
        BrowserDev --> ViteDev
        ViteDev -->|proxy /api| FastAPIDev
    end

    subgraph ProdSeparate["Production: separate hosting"]
        BrowserProd[Browser]
        StaticHost[Vercel/Netlify/static host]
        ApiHost[Railway/Render/EC2 FastAPI]
        BrowserProd --> StaticHost
        StaticHost -->|VITE_API_URL| ApiHost
    end

    subgraph ProdUnified["Production: unified hosting option"]
        Uvicorn[FastAPI/Uvicorn]
        StaticFiles[frontend/dist mounted as static files]
        Uvicorn --> StaticFiles
    end
```

## Important Architecture Notes

- The frontend is stateful only in the browser. Recommendation inputs are saved in browser `localStorage` for quick reuse.
- The backend does not use a database. Scheme records come from the JSON dataset and recommendation cache is process-local memory.
- Recommendation quality has two layers: deterministic filtering/scoring in `app/tools.py`, then optional LLM explanation/enrichment in `app/services/recommendation.py`.
- Chat answers are intentionally constrained to the selected scheme and user profile context.
- In dev, frontend calls `/api/recommend` and `/api/chat`; Vite rewrites those to `/recommend` and `/chat` on the backend.
- In production with separate hosting, `VITE_API_URL` must point the frontend at the deployed backend.

