# Impact Frontend

Presentation Generator UI for the Transaction Monitoring product-owner demo.

## Surfaces

1. **Home** — template cards (General / Transactions / Risk) + upload → generate; RAG assistant sidebar with sessions; Trend Watch; report history
2. **Fraud Report** (`/report`, `/report/:period`) — monthly compliance deck from SQLite + LLM narrative; PPT export; ChatWidget
3. **General Report** (`/report/general`) — LLM-built KPIs/charts from an uploaded file snippet via `POST /api/chat`
4. **Risk Report** (`/report/risk`) — enterprise risk analysis for the shell timeframe; approve/reject; mitigation suggestion; PPT
5. **MOC** (`/moc`, `/moc/:changeId`) — Management Oversight Committee briefing + per-change decision brief

## Run

```bash
npm install
npm run dev
```

Proxies `/api` to `http://localhost:3001` (see `vite.config.ts`). Backend must be running.

## Domain

See [docs/product.md](../docs/product.md) and [docs/domain.md](../docs/domain.md).
