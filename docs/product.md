# Impact — Product

Impact helps a Transaction Monitoring product owner prepare **Management Oversight Committee (MOC)** material for upper organization.
It gathers evidence from change requests, incidents, risk, workload, performance, release, and data-quality signals.
It returns a clear oversight recommendation — authorize, authorize with conditions, or hold — with plain-language reasons.
It supports org-wide MOC briefing packs; portfolio-wide operational alerts come later.

> **Note:** Earlier drafts used “MOC” to mean Management of Change (a single-ticket memo). That wording confused the product-owner role. In Impact, **MOC means Management Oversight Committee**.

## Who it is for

**Primary user:** Product Owner of a rule- and AI-model based Transaction Monitoring (TM) application portfolio (banking / AML).

The PO prepares briefing material that responds to upper organization — not a personal ticket inbox.

**Secondary readers:** application managers, incident drivers, technical experts, compliance/audit stakeholders, and MOC attendees who need the same evidence pack.

## What the product does

1. Assembles a **portfolio evidence pack** from change, incident, risk, workload, performance, release, and data-quality signals (seeded from `mock-data/` into SQLite today; Jira / ServiceNow / etc. later).
2. Runs an **intelligence engine** (OpenRouter or local Ollama) that authors the **MOC briefing presentation** from hybrid RAG-retrieved evidence — what matters for upper org, risk flags with citations — not a raw dump of source fields.
3. For each agenda item, runs the same engine on that item’s evidence to produce a **decision brief** (Authorize / with conditions / Hold).
4. Lets the product owner walk the committee through the deck before production.

The model must not invent evidence IDs or numeric risk scores. Slide copy comes from the LLM; numbers and IDs must come from the evidence pack.

## Outputs

| Output | Purpose | Status |
| --- | --- | --- |
| **MOC briefing pack** | Org risk posture + agenda for the committee | In current demo |
| **Decision brief (per agenda item)** | Decide if this change should ship | In current demo |
| **Operational / improvement alerts** | Flag ongoing portfolio or process problems | Planned later |

## Inputs (evidence types)

These are the kinds of information the product needs. In production they would come from existing systems; in the demo they are sample files.

**For the MOC briefing and decision briefs (today’s focus):**

- Change request / CRQ (what is changing, which app, when)
- Risk matrix / historical risk for that change type
- Incident data on the affected application
- Process / delay / backlog data
- Performance / health signals
- Release planning (window, freeze, audit timing)
- Data quality (missing or incomplete fields)

**Also needed later for operational alerts:**

- Performance trends
- Risk analysis
- Incident frequency and root cause patterns
- Open or upcoming change requests
- Release plan conflicts
- Process volumes
- Data-quality gaps

## Decision outcomes

| Recommendation | Meaning |
| --- | --- |
| **Authorize** | No major blockers in the checks; the change looks ready to proceed |
| **Authorize, with conditions** | Proceed only with stated safeguards (for example closer monitoring or a rollback plan) |
| **Hold** | Do not send this change to production yet; clear the blocking issue first, then review again |

API values remain `go` / `go_with_conditions` / `defer`.

## What Impact is not

- Not a replacement for Jira, ServiceNow, or monitoring tools
- Not an automated deployer — it recommends; people decide
- Not an AI that invents numeric risk scores or unsupported evidence
- Not a full organization dashboard in the current demo
- Not a multi-approver voting system (committee decisions are recorded outside this demo)

## Related docs

- Domain language and sample story: [domain.md](domain.md)
- How to run the demo: [../README.md](../README.md)
