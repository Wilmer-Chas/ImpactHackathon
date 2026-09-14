# ImpactHackathon

Ticket-first demo: help a Transaction Monitoring product owner decide whether one change should go to production.

## What the demo does

1. Open Change #1001
2. Review the recommendation: Go ahead, Go ahead with conditions, or Wait
3. See why, using sample incidents, workload, health, risk, and release evidence

Portfolio-wide alerts and org dashboards are out of scope for this demo.

## Structure

```
backend/src/
  controllers/<feature>/
  routes/<feature>/
  services/<feature>/
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

## Run

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

- App: http://localhost:5173
- Report API: http://localhost:3001/api/reports/1001
