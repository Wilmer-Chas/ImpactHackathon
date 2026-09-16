# Domain: AML Transaction Monitoring MOC

## Audience

**Primary user:** Product Owner of the Rule- and AI Model Based Transaction Monitoring (TM) application portfolio (banking / AML).

Accountable for portfolio application performance. Works with application managers, incident drivers, and technical experts so apps meet **business and regulatory requirements** and operate at expected quality.

Prepares **Management Oversight Committee** material so upper organization can make data-driven decisions.

**Secondary readers:** application managers, incident drivers, technical experts, compliance/audit stakeholders, MOC attendees.

## Whose risk we reduce

| Risk | Meaning for this PO |
| --- | --- |
| Regulatory / AML effectiveness | Rule/model changes weaken detection without due diligence |
| Operational performance | TM apps unstable, alert backlog, failed jobs, incidents around change |
| Quality vs plan | Releases do not behave as intended |
| Audit / demonstrability | Cannot show the change was assessed with evidence before go-live |

## Glossary

- **MOC (Management Oversight Committee)** — Governance forum where upper organization reviews portfolio risk and authorizes (or holds) material changes. Impact prepares the briefing pack and decision briefs for that forum.
- **MOC briefing pack** — Org-wide overview: portfolio risk posture plus an agenda of decision items the PO brings to the committee.
- **Decision brief** — Per-agenda-item memo: evidence + recommendation (Authorize / Authorize with conditions / Hold). Code type name: `MocReport`.
- **Change request / CRQ** — Ticket describing what will change (rules, models, thresholds, platform, feeds). Becomes an agenda input for MOC. Demo IDs: **Change #1001**, **#1002**, **#1003**.
- **TM** — Transaction Monitoring: rules and AI models that flag suspicious transactions for AML.
- **Finding** — A risk flag from the intelligence engine, always tied to evidence.
- **Residual risk** — Risk left after known controls for a class of change.
- **Alert backlog** — Unworked TM alerts waiting for investigation.
- **Release window** — Planned time to deploy; may conflict with freeze or audit periods.
- **Data-quality caveat** — Missing or incomplete fields that reduce confidence in the assessment (does not invent a risk score).

> Earlier drafts called MOC “Management of Change.” That single-ticket framing is not the product intent.

## Sample story: TM portfolio MOC

**Context:** The TM Product Owner prepares the September MOC briefing for upper organization.

**Org posture:** Open high-severity on TM-Core, elevated investigation backlog, audit period active on the September release, incomplete incident root-cause data.

**Agenda includes Change #1001:** Lower automatic-alert thresholds for scenario rule `SCR-WIRE-CROSSBORDER` on app **TM-Core**.

**PO decision ask for MOC:** Should this ship in the next release while the PO remains accountable for AML effectiveness and TM stability?

### What each input answers

| Input | Question for the PO / MOC |
| --- | --- |
| Change request | What exactly changes, on which app, by whom, when? |
| Risk matrix | How risky is this *class* of rule-threshold change historically? |
| Incidents | Is TM-Core already unstable (open severity, recurring root causes)? |
| Process volumes / delays | Is the investigation chain already overloaded? |
| Performance | Are monitoring jobs healthy enough to absorb the change? |
| Release planning | Does timing collide with freeze or audit? |
| Data quality | Can we trust the evidence above? |

### Authorize / Authorize with conditions / Hold

- **Authorize** — Quiet incidents, healthy backlog/performance, acceptable change-class risk, safe window, usable data quality.
- **Authorize with conditions** — Proceed only with monitoring period, rollback plan, wait for an incident to close, or limit scope.
- **Hold** — Open high-severity on the same app, critical backlog, bad timing, or evidence too incomplete to defend in audit.

In the demo fixtures, Change #1001 is designed to surface real tension (open severity on TM-Core + elevated backlog) so the decision brief recommendation is non-trivial.

## MOC briefing outline

1. Title — meeting identity + LLM one-line “why this MOC matters”  
2. Org risk posture — LLM-prioritized risk signals with evidence citations (not raw source dumps)  
3. Agenda for decision — CRQs plus LLM notes on why each item needs a stance  

## Decision brief outline

1. Header — title, app, owner, planned release  
2. Oversight recommendation — Authorize / Authorize with conditions / Hold + one-sentence rationale  
3. Basis for decision — flagged risks with plain-language reasons  
4. Supporting evidence — incidents, volumes/delays, performance, risk class, release fit, data quality  
5. Limitations — what is incomplete  

## How conclusions are produced

**Evidence pack first.** The backend normalizes portfolio (and per-change) facts from demo fixtures — stand-ins for Jira, ServiceNow, risk register, and ops extracts. Fixtures are structured data only; they are not the presentation.

**Then the local Ollama model** (default `mistral`) authors two kinds of structured output:

1. **MOC briefing narrative** (`GET /api/moc/briefing`)
   - `titleSummary`, `postureSummary`, `postureSignals[]` (headline + detail + severity + evidenceRefs)
   - `agendaIntro`, `agendaNotes` per change id  
2. **Decision brief** (`GET /api/reports/:changeId`)
   - `recommendation` — `go` / `go_with_conditions` / `defer` (Authorize / with conditions / Hold)
   - `rationale`, `findings`, `caveats`

The model must not invent evidence IDs or numeric risk scores. If Ollama is unreachable or returns invalid structure, the API fails (no silent fallback).

Signals the engine is expected to weigh include:

- Open high-severity incident on the same TM app → stability risk  
- Alert backlog or processing delay → operational load risk  
- Change type with high residual risk in the risk table → change-class risk  
- Release overlaps freeze/audit → timing risk  
- Missing key fields → evidence confidence caveat  

## Demo scope (current)

The UI is **MOC-first**: open the org briefing → pick an agenda item → see Authorize / Hold / Authorize with conditions → read why.

Portfolio-wide operational alerts and an organization dashboard are later work, not part of this demo.

## Non-goals (v1)

- No Jira / ServiceNow integrations  
- No standalone real-time alerts product  
- No invented numeric risk scores or unsupported evidence  
- Not claims settlement or generic insurance ops  
- Not a live multi-approver voting console (yet)  
