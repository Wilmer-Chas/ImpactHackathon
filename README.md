# ImpactHackathon

MOC-first demo: help a Transaction Monitoring product owner prepare **Management Oversight Committee** material for upper organization.

## What the demo does

1. Open the TM portfolio MOC briefing pack — **authored by the configured LLM** (OpenRouter or local Ollama) from portfolio evidence retrieved via hybrid RAG from SQLite
2. Review org risk posture signals and agenda notes (LLM-prioritized, with evidence citations)
3. Open a decision brief (e.g. Change #1001): Authorize, Authorize with conditions, or Hold — also LLM-authored
4. See why, grounded in sample incidents, workload, health, risk, release, and data-quality evidence

Operational alerts and a full org dashboard are out of scope for this demo.

If the AI provider is down or returns invalid structured output, the briefing and report APIs fail (no template fallback for narrative).

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
  types/<feature>/
  styles/
  assets/
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

If the AI provider is unreachable or returns invalid structured output, the briefing/report APIs fail (no template fallback for narrative).

## Run

```bash
npm install
npm run seed:mock
npm run test
npm run dev:backend
npm run dev:frontend
```

- App: http://localhost:5173
- Briefing API: http://localhost:3001/api/moc/briefing
- Decision brief API: http://localhost:3001/api/reports/1001
- Backend tests: `npm run test`