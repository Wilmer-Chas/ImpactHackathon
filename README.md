# ImpactHackathon

Presentation Generator demo for a Transaction Monitoring product owner: evidence-grounded assistant chat, monthly compliance decks, and interactive enterprise risk analysis — all backed by SQLite seed data and hybrid RAG.

## What the demo does

1. **Employee Home** — chat with a RAG-grounded assistant; persist session history; quick actions for monthly reports, risk analysis, and trend watch; optional file chips → Generate Deck
2. **Fraud Report** — generate a monthly Fraud Detection deck from performance series + risk MoM snapshots + LLM narrative
3. **Risk Report** — AI rollup for a selected timeframe; flags issues still open at period end; changing from/to compiles a new report
4. Legacy MOC APIs remain available (`GET /api/moc/briefing`, `GET /api/reports/:changeId`) for decision briefs

If the AI provider is down or returns invalid structured output, chat / monthly-report / MOC narrative APIs fail (no template fallback for LLM copy). Chart numbers and IDs always come from SQLite.

## Structure

```
mock-data/                 # canonical demo JSON (seed source only)
backend/src/
  controllers/<feature>/
  routes/<feature>/
  services/<feature>/
    services/ai/
    services/evidence/     # hybrid RAG (no SQL)
  repository/              # SQLite queries → domain types
  db/                      # schema, client, seed
  domain/<topic>/
  models/<topic>/
  test/<area>/             # Vitest suites (helpers under test/helpers/)
backend/data/              # local SQLite file (gitignored)

frontend/src/
  components/<area>/
  pages/<feature>/
  services/api/
  types/
ui-prototype/              # visual reference only (not a workspace)
```

## Domain

- Product overview: [docs/product.md](docs/product.md)
- Domain language: [docs/domain.md](docs/domain.md)

## Prerequisites

**OpenRouter** (chat + embeddings for RAG)  
Set `OPENROUTER_API_KEY` in `backend/.env`. Requests use `Authorization: Bearer <key>`.

**Or local Ollama for chat only**  
- [Ollama](https://ollama.com) running (`ollama serve`)
- Model available: `ollama pull mistral` (or set `OLLAMA_MODEL`)
- Set `AI_PROVIDER=ollama`  
Note: seeding/RAG embeddings still require OpenRouter (or another embeddings-capable key).

Env vars for the backend (see [`backend/.env.example`](backend/.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Backend port |
| `AI_PROVIDER` | auto | `openrouter` or `ollama` (auto: OpenRouter if key set, else Ollama) |
| `OPENROUTER_API_KEY` | — | Bearer token for OpenRouter chat + embeddings |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter API base |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Chat model id |
| `OPENROUTER_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Embedding model for RAG seed/query |
| `DATABASE_PATH` | `backend/data/impact.db` | SQLite file path |
| `RAG_TOP_K` | `12` | Chunks retrieved per RAG query |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama API base |
| `OLLAMA_MODEL` | `mistral` | Local chat model name |

Copy the example env file once, then paste your key (never commit `.env`):

```bash
cp backend/.env.example backend/.env
```

Seed mock data into SQLite (idempotent — skips unchanged rows and embeddings):

```bash
npm run seed:mock
```

Canonical JSON lives in [`mock-data/`](mock-data/). Re-running seed does not duplicate existing entities; embeddings are only recomputed when chunk text changes.

## Run

```bash
npm install
npm run seed:mock
npm run test
npm run dev:backend
npm run dev:frontend
```

- App: http://localhost:5173
- Health: http://localhost:3001/api/health
- Chat: `POST /api/chat`
- Monthly report: `POST /api/reports/monthly` · `GET /api/reports/monthly/:period`
- Risk analysis: `GET /api/reports/risk`
- Trends: `GET /api/ops/trends`
- Schedules: `GET/POST /api/schedules` (API retained; not in current UI)
- Backend tests: `npm run test`
