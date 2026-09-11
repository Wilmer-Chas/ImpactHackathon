# Domain: AML Transaction Monitoring MOC

## Audience

**Primary user:** Product Owner of the Rule- and AI Model Based Transaction Monitoring (TM) application portfolio (banking / AML).

Accountable for portfolio application performance. Works with application managers, incident drivers, and technical experts so apps meet **business and regulatory requirements** and operate at expected quality.

**Secondary readers:** application managers, incident drivers, technical experts, compliance/audit stakeholders.

## Whose risk we reduce

| Risk | Meaning for this PO |
| --- | --- |
| Regulatory / AML effectiveness | Rule/model changes weaken detection without due diligence |
| Operational performance | TM apps unstable, alert backlog, failed jobs, incidents around change |
| Quality vs plan | Releases do not behave as intended |
| Audit / demonstrability | Cannot show the change was assessed with evidence before go-live |

## Glossary

- **MOC (Management of Change)** — Decision memo used before a change hits TM production: evidence + recommendation (Go / Go with conditions / Defer).
- **Change request** — Ticket describing what will change (rules, models, thresholds, platform, feeds). Demo ID: **Change #1001**.
- **TM** — Transaction Monitoring: rules and AI models that flag suspicious transactions for AML.
- **Finding** — A risk flag produced by a plain if/then rule, always tied to evidence.
- **Residual risk** — Risk left after known controls for a class of change.
- **Alert backlog** — Unworked TM alerts waiting for investigation.
- **Release window** — Planned time to deploy; may conflict with freeze or audit periods.
- **Data-quality caveat** — Missing or incomplete fields that reduce confidence in the assessment (does not invent a risk score).

## Sample story: Change #1001

**Change:** Lower automatic-alert thresholds for scenario rule `SCR-WIRE-CROSSBORDER` on app **TM-Core**.

**PO decision:** Should this ship in the next release while I remain accountable for AML effectiveness and TM stability?

### What each input answers

| Input | Question for the PO |
| --- | --- |
| Change request | What exactly changes, on which app, by whom, when? |
| Risk matrix | How risky is this *class* of rule-threshold change historically? |
| Incidents | Is TM-Core already unstable (open severity, recurring root causes)? |
| Process volumes / delays | Is the investigation chain already overloaded? |
| Performance | Are monitoring jobs healthy enough to absorb the change? |
| Release planning | Does timing collide with freeze or audit? |
| Data quality | Can I trust the evidence above? |

### Go / Go with conditions / Defer

- **Go** — Quiet incidents, healthy backlog/performance, acceptable change-class risk, safe window, usable data quality.
- **Go with conditions** — Proceed only with monitoring period, rollback plan, wait for an incident to close, or limit scope.
- **Defer** — Open high-severity on the same app, critical backlog, bad timing, or evidence too incomplete to defend in audit.

In the demo fixtures, Change #1001 is designed to surface real tension (open severity on TM-Core + elevated backlog) so the memo recommendation is non-trivial.

## MOC report outline

1. Header — title, app, owner, planned release  
2. Recommendation — Go / Go with conditions / Defer + one-sentence rationale  
3. Findings — flagged risks with plain-language reasons  
4. Evidence — incidents, volumes/delays, performance, risk class, release fit, data quality  
5. Caveats — what is incomplete  

## How risk is flagged (no AI)

Transparent rules only, for example:

- Open high-severity incident on the same TM app → stability risk  
- Alert backlog or processing delay above threshold → operational load risk  
- Change type with high residual risk in the risk table → change-class risk  
- Release overlaps freeze/audit → timing risk  
- Missing key fields above a % → evidence confidence warning  

## Non-goals (v1)

- No Jira / ServiceNow integrations  
- No standalone real-time alerts product  
- No AI-generated risk scores or narratives  
- Not claims settlement or generic insurance ops  