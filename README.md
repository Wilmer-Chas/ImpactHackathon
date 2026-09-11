# ImpactHackathon

Rule-based **Management of Change (MOC)** memo for an AML Transaction Monitoring portfolio Product Owner.

Demo focus: one change request (**Change #1001**) assessed from mock data — no Jira/ServiceNow, no AI risk scoring.

## Domain

See [docs/domain.md](docs/domain.md).

## Structure

```
backend/src/   routes → controllers → services → domain/models/fixtures
frontend/src/  pages, components, services, types
docs/          domain glossary and sample story
```

## Getting started

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health
- MOC report API: http://localhost:3001/api/reports/1001