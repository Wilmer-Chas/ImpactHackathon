# Impact — Product

Impact helps a Transaction Monitoring product owner decide whether a specific change should go to production.
It gathers evidence from change, incident, risk, workload, performance, release, and data-quality signals.
It returns a clear recommendation — go ahead, go ahead with conditions, or wait — with plain-language reasons.
It supports Management of Change (MOC) review; portfolio-wide operational alerts come later.

## Who it is for

**Primary user:** Product Owner of a rule- and AI-model based Transaction Monitoring (TM) application portfolio (banking / AML).

**Secondary readers:** application managers, incident drivers, technical experts, and compliance/audit stakeholders who need the same evidence pack.

## What the product does

1. Takes a **change ticket** as the starting point (for example Change #1001).
2. Collects related evidence for that change and its target application.
3. Runs **transparent if/then checks** (not AI risk scoring).
4. Produces a **MOC-style decision memo** with recommendation, findings, evidence, and caveats.
5. Lets the product owner accept, tighten conditions, or hold the change before production.

## Outputs

| Output | Purpose | Status |
| --- | --- | --- |
| **MOC / change report** | Decide if this change should ship | In current demo |
| **Operational / improvement alerts** | Flag ongoing portfolio or process problems | Planned later |

## Inputs (evidence types)

These are the kinds of information the product needs. In production they would come from existing systems; in the demo they are sample files.

**For the MOC report (today’s focus):**

- Change request (what is changing, which app, when)
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
| **Go ahead** | No major blockers in the checks; the change looks ready to proceed |
| **Go ahead, with conditions** | Proceed only with stated safeguards (for example closer monitoring or a rollback plan) |
| **Wait** | Do not send this change to production yet; clear the blocking issue first, then review again |

## What Impact is not

- Not a replacement for Jira, ServiceNow, or monitoring tools
- Not an automated deployer — it recommends; people decide
- Not an AI that invents risk scores
- Not a full organization dashboard in the current demo

## Related docs

- Domain language and sample story: [domain.md](domain.md)
- How to run the demo: [../README.md](../README.md)
