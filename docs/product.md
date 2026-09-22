# Impact — Product

Impact helps a Transaction Monitoring product owner prepare oversight material for upper organization — including **monthly compliance decks**, an **evidence-grounded assistant**, and an **interactive enterprise risk analysis** deck.
It gathers evidence from change requests, incidents, risk, workload, performance, release, and data-quality signals (plus demo fixtures for performance series, risk snapshots, enterprise risks, and schedules).
Legacy **Management Oversight Committee (MOC)** briefing and per-change decision brief APIs remain available as building blocks.

> **Note:** Earlier drafts used “MOC” to mean Management of Change (a single-ticket memo). That wording confused the product-owner role. In Impact, **MOC means Management Oversight Committee**.

## Who it is for

**Primary user:** Product Owner of a rule- and AI-model based Transaction Monitoring (TM) application portfolio (banking / AML).

**Secondary readers:** application managers, incident drivers, technical experts, compliance/audit stakeholders, and MOC attendees who need the same evidence pack.

## What the product does

1. Assembles a **portfolio evidence pack** from change, incident, risk, workload, performance, release, data-quality, and ops-alert signals (seeded from `mock-data/` into SQLite today).
2. Offers a **General Assistant** that answers questions with hybrid RAG citations (never inventing evidence IDs).
3. Generates a **monthly Fraud Detection report** from performance series + risk month-over-month snapshots + LLM narrative.
4. Surfaces an **Enterprise Risk Analysis** deck scoped to a **user timeframe**: the AI flags incidents/alerts still open at period end (resolution comes from the issue layer / Jira later — e.g. resolved after the window still flags; resolved inside the window does not). Changing from/to compiles a new report.
5. Supports **Trend Watch** anomaly counts on Employee Home (links into the monthly deck).
6. Keeps MOC briefing / decision-brief endpoints for committee-style deep dives.

The model must not invent evidence IDs or numeric risk scores. Narrative copy can come from the LLM; numbers and IDs must come from the evidence pack.

## Outputs

| Output | Purpose | Status |
| --- | --- | --- |
| **Assistant chat + history** | Evidence-grounded Q&A | In current demo |
| **Monthly compliance deck** | Performance, narrative, risk MoM | In current demo |
| **Enterprise risk analysis** | Category drill-down + PPT export | In current demo |
| **Trend Watch** | Anomaly badge → monthly report | In current demo |
| **MOC briefing pack** | Org risk posture + agenda | API available |
| **Decision brief (per change)** | Authorize / with conditions / Hold | API available |

## Inputs (evidence types)

**Core portfolio evidence (seeded):** change requests, incidents, process/performance metrics, risk register, release plans, data quality, ops alerts, unstructured customer notes.

**Presentation-generator fixtures (seeded):** performance series, risk snapshots, enterprise risks (legacy catalog; Risk Analysis now rolls up themed signals + inferred customer-note matches), report schedules, sample chat sessions.

## Decision outcomes (decision briefs)

| Recommendation | Meaning |
| --- | --- |
| **Authorize** | No major blockers; ready to proceed |
| **Authorize, with conditions** | Proceed with stated safeguards |
| **Hold** | Do not send to production yet |

API values remain `go` / `go_with_conditions` / `defer`.

## What Impact is not

- Not a replacement for Jira, ServiceNow, or monitoring tools
- Not an automated deployer — it recommends; people decide
- Not an AI that invents numeric risk scores or unsupported evidence
- Not real auth/roles (navigation-only in the demo)
- Not a live file-ingest pipeline (upload chips route by filename for the demo)
- Not a cron executor for schedules (API remains; UI no longer exposes CRUD)

## Related docs

- Domain language and sample story: [domain.md](domain.md)
- How to run the demo: [../README.md](../README.md)
