# ImpactHackathon

Ticket-first demo: help a Transaction Monitoring product owner decide whether one change should go to production.

## What the demo does

1. Open Change #1001
2. Review the recommendation: Go ahead, Go ahead with conditions, or Wait
3. See why, using sample incidents, workload, health, risk, and release evidence — concluded by a local Ollama (Mistral) intelligence engine

Portfolio-wide alerts and org dashboards are out of scope for this demo.

## Structure

```
backend/src/
  controllers/<feature>/
  routes/<feature>/
  services/<feature>/
  services/ai/
  domain/<topic>/
  models/<topic>/
  fixtures/<topic>/
  utils/...

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

- [Ollama](https://ollama.com) running locally (`ollama serve`)
- Model available: `ollama pull mistral` (or set `OLLAMA_MODEL`)

Optional env vars for the backend (see [`backend/.env.example`](backend/.env.example)):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Backend port |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama API base |
| `OLLAMA_MODEL` | `mistral` | Chat model name |

Copy the example env file once:

```bash
cp backend/.env.example backend/.env
```

If Ollama is down or returns invalid structured output, the report API fails (no rule-engine fallback).

## Run

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

- App: http://localhost:5173
- Report API: http://localhost:3001/api/reports/1001
