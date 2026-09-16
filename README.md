# ImpactHackathon

MOC-first demo: help a Transaction Monitoring product owner prepare **Management Oversight Committee** material for upper organization.

## What the demo does

1. Open the TM portfolio MOC briefing pack — **authored by local Ollama** from portfolio evidence (fixtures stand in for Jira / ServiceNow / ops)
2. Review org risk posture signals and agenda notes (LLM-prioritized, with evidence citations)
3. Open a decision brief (e.g. Change #1001): Authorize, Authorize with conditions, or Hold — also Ollama
4. See why, grounded in sample incidents, workload, health, risk, release, and data-quality evidence

Operational alerts and a full org dashboard are out of scope for this demo.

If Ollama is down or returns invalid structured output, the briefing and report APIs fail (no template fallback for narrative).

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
- Briefing API: http://localhost:3001/api/moc/briefing
- Decision brief API: http://localhost:3001/api/reports/1001
