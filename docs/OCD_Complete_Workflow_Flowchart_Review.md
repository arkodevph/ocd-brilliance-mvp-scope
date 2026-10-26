# OCD complete workflow atlas — delivery review

Reviewed 25 October 2026. This review covers the proposed process diagrams and their viewer. It does not replace client discovery, integration acceptance, implementation testing or security review.

## Deliverables

- [Interactive offline workflow atlas](OCD_Complete_Workflow_Flowchart.html): five views with clickable process details, a 35-process selector, light/dark themes, zoom and SVG/PNG exports.
- [Editable Mermaid diagrams and coverage table](OCD_Complete_Workflow_Flowcharts.md).
- [Coverage register](../.archify/workflow-ocd-complete-20261025-165645/coverage.json): one numbered process node per opportunity, retaining scope, automation level, workflow-family mapping, human boundary and release gate.
- [Source manifest](../.archify/workflow-ocd-complete-20261025-165645/source-manifest.json): hashes of the actual local planning descriptions used. These are local planning snapshots, not committed-HEAD provenance claims.
- [Structural check results](../.archify/workflow-ocd-complete-20261025-165645/structural-review.json), [browser check results](../.archify/workflow-ocd-complete-20261025-165645/browser-evidence/browser-check.json) and [visual inspection record](../.archify/workflow-ocd-complete-20261025-165645/visual-review.json).

## Coverage

| View | Content | Numbered opportunities |
| --- | --- | --- |
| 01 — Execution and recovery | Scoped sources, evidence, release policy, exact approval, durable intent/outbox, fenced dispatch, native or manual execution, independent verification, partial outcomes and required child work | Shared subprocess; no duplicate opportunity numbers |
| 02 — Intake and documents | Enquiry ownership, relevant service-area screening, participant/worker preparation, original filing, metadata checks and renewal follow-up | 1–7, 18–21 |
| 03 — Roster and cover | Booking preparation, exact changes, travel estimates, instructions, native reminder replies, complete cancellation, replacement cover and optional arrival | 10–17, 35 |
| 04 — Finance and payroll | Billing evidence, native payer/credit checks, returns and payment follow-up, source checks, payroll handoff and native release | 22–30 |
| 05 — Care and follow-through | Correspondence, channel evidence, factual care exceptions, feedback/safety ownership, completion checks and later reporting | 8, 9, 31–34 |

The atlas contains **35 unique numbered opportunities**, **124 process/control nodes** and **168 directed relationships**, covering **W01–W14**. It preserves **20 core**, **five gated** and **ten later/native** dispositions. These opportunities reuse the 14 workflow families; they are not 35 separate automation engines.

The selected bounded automatic functions are opportunities **1, 4, 12, 19 and 33**. The other selected opportunities retain human decisions and/or owned native steps. Later reporting opportunity 34 is also a bounded automatic function when separately released; its later status is preserved.

## Critical content review and revisions

| Review issue | Revision or retained boundary | Validation |
| --- | --- | --- |
| A public enquiry must not require full intake before checking its area | Minimal capture/ownership precedes screening; full participant preparation follows the coverage decision | View 02 paths and source register 1–5 |
| Worker onboarding and existing-record work must not be rejected by participant coverage rules | Added a direct worker/existing-record route around area screening | View 02 explicit branch |
| Document checks and renewals are independent of new onboarding | Added a scheduled existing-record document source and a direct evidence-check route | Reachability from the scheduled source to 19/21 |
| A basic profile is not activation or HR/payroll readiness | Retained separate stage/service detail gate, HR decisions and required downstream handoffs | Process cards 5–7; shared completion gate |
| Document presence is not validity or proof that an agreement exists everywhere | Retained missing/present/unknown distinctions and human signature/authenticity checks | Cards 18–21; source fields preserved |
| Every external effect needs accepted scope and exact approval | Shared flow includes authorization, release policy, approval, durable intent, preflight and persisted dispatch before the native call | Required dispatch-to-native edge; shared execution blocks in business views |
| A lost response must not cause a duplicate action | Added explicit read-only reconciliation and a verified-no-effect route back to review | Shared recovery reachability and labels |
| A definite no-effect rejection differs from an uncertain effect | Kept a separate rejection/re-review route | Shared execution native-to-rejection branch |
| Cancellation can lock later native edits | Verified required travel cleanup precedes cancellation; partial cleanup-success/cancel-failure remains open | Required cleanup → cancel → verification edges; card 15 |
| Free time or a saved booking does not prove willingness or acceptance | Retained suitability review and a separate native worker-acceptance gate | View 03 booking path |
| Optional arrival visibility must not delay booking communication | Separated immediate verified-booking communication from the independent optional arrival branch | Direct current-arrangement → communication edge |
| No confirmed payroll API is available yet | Core 28 first checks ShiftCare sources and produces a reviewed handoff; two-sided comparison has a separate accepted-input gate | View 04 input branches and card 28 |
| Financial releases belong to the established platforms | Retained native ShiftCare-to-Xero draft export, bookkeeper decisions and native payroll payment/payslip authority | View 04 native boundary and cards 22–30 |
| Correspondence preparation is not sending or delivery | Separated message review, accepted-channel sending, gated channel evidence and actual required outcomes | View 05; cards 8/9/33 |
| Urgent safety action cannot wait for the queue | Retained immediate authorized human/native response and subsequent recorded follow-through | View 05 urgent branch; shared safety invariant |
| Parent completion must reflect the whole required outcome | Preserved mandatory child-work verification before closure | Required child-check → closure edges and recovery loops |
| Existing sources include uncommitted planning files | Recorded actual local hashes and source precedence; made no HEAD implementation-provenance claim | Source manifest |

## Artifact checks

**75 structural checks passed.** They verify opportunity/scope counts, all 14 families, intended roots and terminals, required edges and reachability, no unreachable nodes, rendered node/edge coverage, standalone SVG contents and non-overlapping node bounding boxes. All **210 application-source files** checked against the existing planning baseline remain unchanged.

**24 real-browser checks passed** using headless Chrome. They cover all five tabs, all 35 process lookups, node details, zoom/fit/theme controls, unique DOM identifiers, no external viewer assets, desktop fit, per-view text bounds, sampled edges avoiding unrelated filled node shapes, successful SVG/PNG/Mermaid/coverage downloads, and the initial mobile layout at 390 px. HTTP and HTTPS asset requests were blocked; the viewer required none. No page JavaScript exceptions were recorded.

Visual inspection covered the five final light-theme diagram captures, the shared execution diagram in dark theme, and the mobile header/navigation capture. The dense roster view benefits from the 100% zoom control and the readable process-detail selector. SVG exports preserve the complete diagrams. This was not a full accessibility or cross-browser audit.

## Rendering limitation and recovery

The first Archify shared-flow candidate did **not** pass its showcase gate: return routes crossed or shared unrelated corridors. Focused route repairs and measured diagnostics did not produce an accepted Archify layout. Its failed attempt receipt remains under the request folder; it is not a delivery certificate for the final atlas.

The completed atlas uses an alternative **Viz.js / Graphviz** layout of the same process descriptions. Browser inspection found several curves crossing unrelated nodes. Measured port corrections and ordinary cluster ranking fixed those routes; all final per-view node/edge geometry checks passed. The final renderer reported no warnings.

No Archify showcase acceptance, nine-check artifact certificate or Archify browser receipt is claimed. The structural and browser results linked above belong to the actual alternative-rendered HTML. Edge-to-edge crossings are separate relationships, not junctions; the custom checks do not certify zero edge-to-edge crossings or every possible label intersection. Editable Mermaid is supplied as source and was not separately rendered by a Mermaid engine.

## Decisions still requiring client/account confirmation

The atlas retains the unresolved items in the [implementation plan](OCD_Custom_System_Implementation_Plan.md) and [plan registers](implementation-plan-2026-10-25/plan-data.json). In particular, approved business rules and owners, service-hour authority, actual mailbox formats/permissions, client-account API entitlements, exact accepted write fields/scopes, document date semantics, cancellation cleanup/charge rules, channel coverage, the payroll vendor/export, and optional arrival consent/device behavior still need their specified acceptance evidence.

Native feature documentation is not proof of account availability, adapter implementation or business acceptance. Later/native nodes show work staff continue doing; they do not release deferred automation. No new n8n dependency, direct accounting ledger, payroll engine, clinical decision system or continuous tracking service was added.

No live account operations, application implementation, deployment or production/security acceptance tests were performed. The requested diagram deliverables are complete; the underlying project release gates remain part of the implementation plan.
