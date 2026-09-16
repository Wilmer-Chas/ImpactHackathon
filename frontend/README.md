# ImpactHackathon

MOC-first demo: help a Transaction Monitoring product owner prepare **Management Oversight Committee** material for upper organization.

## What the demo does

1. Open the TM portfolio **MOC briefing pack** — Ollama authors the presentation narrative from portfolio evidence
2. Review org risk posture and the agenda of decision items
3. Open a **decision brief** (e.g. Change #1001): **Authorize**, **Authorize with conditions**, or **Hold**
4. See why, using sample incidents, workload, health, risk, release, and data-quality evidence concluded by local Ollama (Mistral)

Operational alerts / full org dashboards are out of scope for this demo.

## Domain

See [docs/domain.md](../docs/domain.md).

## Prerequisites

Ollama must be running with `mistral` available (`ollama serve`, `ollama pull mistral`). See the root [README](../README.md).

## Run

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

- App: http://localhost:5173
- Briefing API: http://localhost:3001/api/moc/briefing
- Decision brief API: http://localhost:3001/api/reports/1001
