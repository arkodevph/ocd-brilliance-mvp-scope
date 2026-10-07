# OCD Brilliance — Client Needs and Automation Requirements

- **Meeting date:** 5 October 2026
- **Prepared:** 6 October 2026
- **Status:** Draft for client review
- **Source:** [dialpad_transcript_20261005_0923.csv](../dialpad_transcript_20261005_0923.csv)
- **Review coverage:** 1,198 transcript entries
- **Companion register:** [27-entry requirements register](OCD_Automation_Requirements_Register.csv)

A validated account of the client's needs, the system features discussed, and the decisions still required before an agreed implementation scope can be set.

## 1. Executive summary

The client wants less manual administration, more reliable service delivery and more time for participant communication. Their strongest repeated request is to move information from emailed onboarding forms and scanned assessments into the correct places in ShiftCare and Xero, with staff checking the results. They also want automated confirmation and cancellation handling, better enquiry follow-through, simpler bookkeeping checks and clearer arrival information.

### Scope principle

Simplify interactions with the existing ShiftCare setup. The client questioned duplicating functions already available there, especially participant records, scheduling and documents. Existing financial exports and the worker app must be considered when designing the automation.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L429), CSV lines 429 (10:57); 544 (11:18); 722 (11:52); 745 (11:57); 831 (12:17); 836 (12:19); 846 (12:21). Times are as recorded, PST.

## 2. Review method and source status

All 1,198 transcript entries were reviewed, including the recruitment interviews, system demonstration and closing discussion. Evidence references use physical CSV line numbers and original transcript timestamps. The shared speaker label 'Adriana and Felician' does not reliably identify which individual spoke. The automatic transcript contains unclear wording and numbers; this report paraphrases the meaning and identifies decisions requiring confirmation. Source support does not establish contractual approval or implementation status.

| Source status | Meaning |
| --- | --- |
| Direct client request | The client expressly asks for an automation or improvement. |
| Operating need / constraint | An existing process, concern or restriction that the automation must account for. |
| Discussed feature | A team proposal with positive or qualified feedback; its detailed scope remains open. |
| Broader business want | A business direction without a fully specified software module. |
| Later user instruction | An explicit addition from this conversation after the meeting. |

The register contains 27 identified needs, features and business wants. Proposed review owners and delivery steps below are recommendations.

## 3. Validated client needs

These include requested automations and operating requirements that an automation must support. Source status describes the evidence, not approval or delivery.

### A01 — Participant and worker onboarding

**Source status:** Direct client request

**Need:** Extract information from emailed intake and onboarding forms and scanned assessments; place participant and employee information in the appropriate ShiftCare and Xero records for staff review.

**Conditions and open scope:** Confirm the forms, fields, record matching and review steps with Adriana and the current admin. Referrals can also arrive through the website, phone, support coordinators or other providers.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L351), CSV lines 351 (10:40); 855 (12:23); 857 (12:23); 873 (12:27); 1134 (13:16); 1168 (13:22); 1174 (13:23). Times are as recorded, PST.

### A02 — Service area screening

**Source status:** Direct client request

**Need:** Check the address or suburb before the full intake form and clearly tell the person whether OCD currently serves the area.

**Conditions and open scope:** An area's coverage must consider actual capacity, preferred hours, new hires and departures. Adjacent areas can be negotiated case by case; proximity alone does not guarantee availability.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L358), CSV lines 358 (10:41); 389 (10:49); 404 (10:52); 415 (10:54); 418 (10:54); 419 (10:55). Times are as recorded, PST.

### A03 — Email handling and follow-up

**Source status:** Direct client request + operating need

**Need:** Reduce overlooked enquiries and duplicated admin attention. Recognize invoice complaints, identify the relevant invoice and flag urgent matters. Process incoming forms into the correct records.

**Conditions and open scope:** An assigned owner, next action and follow-up queue are recommended implementation choices. Automatic outgoing replies and financial adjustments were not defined in the meeting.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L365), CSV lines 365 (10:43); 368 (10:43); 871 (12:27); 873 (12:27). Times are as recorded, PST.

### A04 — Reminders, confirmations and cancellations

**Source status:** Direct client request

**Need:** Support the existing three-day service reminder, capture yes/no responses and cancellation reasons, and update the cancellation in ShiftCare automatically. Reduce daily manual response checking.

**Conditions and open scope:** Prefer reminders and communication in the same platform. Confirm the cancellation policy, exceptions and notification behaviour before configuring actions.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L536), CSV lines 536 (11:16); 540 (11:17); 593 (11:25); 596 (11:26); 607 (11:28); 644 (11:35). Times are as recorded, PST.

### A05 — Booking and worker availability controls

**Source status:** Operating constraint + discussed feature

**Need:** Protect recurring bookings and respect worker hours and personal commitments. New or rescheduled work must be checked with the worker; an unbooked calendar slot is not sufficient evidence of availability.

**Conditions and open scope:** Accept/decline requests and offering declined work to another worker were proposed and received positive feedback. Detailed approval and escalation rules remain open.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L415), CSV lines 415 (10:54); 611 (11:29); 614 (11:30); 626 (11:32); 631 (11:32); 635 (11:33); 640 (11:34). Times are as recorded, PST.

### A06 — Service continuity and replacement coverage

**Source status:** Operating need

**Need:** Respond to last-minute sickness, resignations and repeated missed visits. Maintain participant communication and arrange replacement coverage or a human follow-up when a service is at risk.

**Conditions and open scope:** Fully automatic replacement selection was a team proposal. Staff still need to handle cases where no suitable worker is available; the system cannot create missing capacity.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L113), CSV lines 113 (09:47); 260 (10:18); 266 (10:20); 404 (10:52); 426 (10:56); 662 (11:39); 663 (11:40); 917 (12:37); 973 (12:47). Times are as recorded, PST.

### A07 — Worker documents and data cleanup

**Source status:** Direct client request + operating need

**Need:** Track missing and expiring worker documents, including checks and first aid. Review and correct records that incorrectly mark non-expiring documents as expired.

**Conditions and open scope:** ShiftCare already provides expiry tracking. Confirm the document types, dates and renewal/follow-up process; this includes a data cleanup task, not only new reminders.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L93), CSV lines 93 (09:44); 105 (09:46); 446 (11:00). Times are as recorded, PST.

### A08 — Visit records, duration and important notes

**Source status:** Operating need

**Need:** Compare rostered and actual service duration, capture extra time and progress notes, and preserve explanations of tasks and outcomes. Bring significant issues to the office's attention.

**Conditions and open scope:** Confidential office notes must remain restricted. The exact alert criteria and bookkeeping review steps need the current team's input.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L476), CSV lines 476 (11:04); 478 (11:04); 693 (11:45); 697 (11:46); 701 (11:47); 702 (11:47). Times are as recorded, PST.

### A09 — Invoicing and payroll review

**Source status:** Operating need + discussed automation

**Need:** Support the correct invoice recipient for the participant's funding arrangement and review actual hours, kilometres and travel payments. Existing routines include Tuesday invoicing and fortnightly payroll; rejected invoices and incorrect pay are concerns.

**Conditions and open scope:** ShiftCare-to-Xero export/invoicing already operates. Reduce repetitive checking around it. Confirm rates and travel rules with the bookkeeper; the rare decimal/rounding export problem was explicitly lower priority.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L82), CSV lines 82 (09:42); 85 (09:43); 89 (09:43); 197 (10:04); 204 (10:05); 211 (10:07); 285 (10:26); 481 (11:05); 486 (11:06); 676 (11:42); 679 (11:43); 688 (11:44); 690 (11:44); 719 (11:51); 722 (11:52); 726 (11:53); 762 (12:01); 766 (12:02); 771 (12:02); 773 (12:03); 775 (12:04); 791 (12:06); 1013 (12:55). Times are as recorded, PST.

### A10 — Service agreements and document filing

**Source status:** Existing workflow + discussed feature

**Need:** Account for the existing service agreement/sign-request process and filing received forms under the correct participant in ShiftCare. Agreement copies in the participant portal were proposed.

**Conditions and open scope:** A replacement signing platform or automatic generation of legally approved agreements was not established. Confirm existing templates and the document return/filing process.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L806), CSV lines 806 (12:12); 814 (12:13); 817 (12:13); 819 (12:14); 821 (12:14). Times are as recorded, PST.

### A11 — Communication, privacy and retained history

**Source status:** Direct client request + operating constraint

**Need:** Consolidate messages and reminders, preferably using app notifications. Protect personal phone numbers and worker home addresses. Give administrators access to retained communication history as evidence of what was communicated.

**Conditions and open scope:** Define participant, worker, admin and owner access. Avoid fragmenting routine communication across additional channels or adding duplicate worker entry.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L395), CSV lines 395 (10:50); 397 (10:50); 399 (10:50); 478 (11:04); 544 (11:18); 560 (11:21); 579 (11:23); 581 (11:24); 588 (11:25); 596 (11:26); 597 (11:26); 601 (11:27); 604 (11:27); 607 (11:28). Times are as recorded, PST.

### A12 — Worker arrival and travel estimates

**Source status:** Discussed feature with client support

**Need:** Show the participant that the worker is on the way and an estimated arrival time, including delays. Help workers understand travel time to the next job and reduce calls to the office.

**Conditions and open scope:** The client raised concerns about exact location visibility. Confirm what is shared, with whom and during which part of a visit; always protect worker home addresses.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L514), CSV lines 514 (11:12); 557 (11:20); 558 (11:20); 565 (11:21); 568 (11:22); 571 (11:22); 574 (11:22). Times are as recorded, PST.

## 4. Portals discussed in the meeting

### P01 — Participant portal

**Source status:** Discussed feature

**Need:** Own profile, booking history, service and rescheduling requests, preferred workers, documents and agreements, preferences, messaging and arrival information.

**Conditions and open scope:** Client feedback was positive but qualified. Requests require availability checks and worker confirmation; the portal must also accommodate office-handled referrals.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L520), CSV lines 520 (11:13); 522 (11:14); 611 (11:29); 626 (11:32); 648 (11:36); 651 (11:36); 806 (12:12); 1134 (13:16). Times are as recorded, PST.

### P02 — Worker portal

**Source status:** Discussed feature

**Need:** Own assignments and schedule, accept/decline offers or cover requests, hours/pay overview, time in/out, notes and travel to the next job.

**Conditions and open scope:** The existing ShiftCare worker app must be considered. The client specifically raised comfort and duplicated-work concerns.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L428), CSV lines 428 (10:56); 429 (10:57); 500 (11:09); 544 (11:18); 565 (11:21); 631 (11:32); 635 (11:33); 686 (11:43); 688 (11:44); 757 (12:00). Times are as recorded, PST.

### P03 — Office workspace

**Source status:** Discussed feature

**Need:** An overview of enquiries, calendar, participant and worker records, assignments, documents, visit information and outstanding work; worker and service-type filters.

**Conditions and open scope:** Several functions already exist in ShiftCare. Confirm which views remove admin work before extending a separate CRM or duplicating records.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L442), CSV lines 442 (10:59); 444 (11:00); 464 (11:03); 466 (11:03); 527 (11:15); 530 (11:15); 823 (12:14); 829 (12:17); 831 (12:17); 836 (12:19). Times are as recorded, PST.

## 5. Later instruction: Mapbox 3D

### L01 — Mapbox 3D booking and arrival maps

**Source status:** Later user instruction

**Need:** Add Mapbox 3D maps to the Office, existing Worker workspace (selected for 'employer') and Participant/Client views so each can see the appropriate bookings and participants can monitor worker arrival time.

**Conditions and open scope:** This comes from the subsequent conversation. Role access and the meeting's location-privacy conditions still apply.

**Evidence:** Subsequent user messages in this conversation. This addition was made after the meeting.

## 6. Team proposals and scope qualifications

The team proposed the following additions. Positive meeting feedback does not define a final approved specification for each feature.

### T01 — Newsletter and promotional messages

**Source status:** Team proposal

**Need:** Use the participant portal to deliver newsletters and promotional information.

**Conditions and open scope:** Detailed scope and client approval were not established.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L554), CSV lines 554 (11:19). Times are as recorded, PST.

### T02 — Worker incentives

**Source status:** Team proposal

**Need:** Offer incentives to workers who take additional clients or hours.

**Conditions and open scope:** No incentive scheme was agreed.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L641), CSV lines 641 (11:34). Times are as recorded, PST.

### T03 — Broad AI quality checking

**Source status:** Team proposal

**Need:** Check entered financial information and other records for errors.

**Conditions and open scope:** The proposed capability was not validated. The client's rounding concern was an export issue, not a simple typing error, and was lower priority.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L712), CSV lines 712 (11:50); 715 (11:50); 718 (11:51); 719 (11:51); 726 (11:53); 751 (11:58); 752 (11:59). Times are as recorded, PST.

### T04 — Reduce discovery calls

**Source status:** Team proposal

**Need:** Use online checklists and intake details to reduce some discovery calls.

**Conditions and open scope:** The client described predominantly website and coordinator enquiries. Eliminating all discovery calls was not agreed.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L347), CSV lines 347 (10:38); 348 (10:39); 351 (10:40). Times are as recorded, PST.

### T05 — Automatic matching and reassignment

**Source status:** Team proposal with qualified feedback

**Need:** Use service category, distance and availability to offer work or replacement cover.

**Conditions and open scope:** Worker confirmation, capacity limits and office exceptions apply. Fully autonomous assignment rules were not finalized.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L382), CSV lines 382 (10:46); 385 (10:48); 388 (10:49); 415 (10:54); 419 (10:55); 631 (11:32); 635 (11:33); 662 (11:39). Times are as recorded, PST.

### T06 — Live integration across systems

**Source status:** Team proposal

**Need:** Synchronize the workspace with ShiftCare and Xero using available integrations.

**Conditions and open scope:** The transcript mentions API/MCP but does not prove every read, write or live-sync capability. Each workflow needs technical validation.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L503), CSV lines 503 (11:10); 743 (11:57); 745 (11:57); 749 (11:57); 928 (12:39); 933 (12:40). Times are as recorded, PST.

## 7. Broader business wants

These directions do not establish complete software modules.

### B01 — HR and recruitment support

**Source status:** Broader business want

**Need:** More specialist help with interviews, choosing people and recruitment processes.

**Conditions and open scope:** No full HR software module was specified.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L908), CSV lines 908 (12:34); 909 (12:35). Times are as recorded, PST.

### B02 — Subcontractor relationships

**Source status:** Broader business want

**Need:** Gradually develop relationships and contracts with subcontractors who have ABNs, seeking more predictable delivery.

**Conditions and open scope:** This is a business direction. Employment classification and contract rules were not validated by the transcript review.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L911), CSV lines 911 (12:36); 913 (12:36); 915 (12:37); 917 (12:37); 924 (12:38). Times are as recorded, PST.

### B03 — Organic marketing and referrals

**Source status:** Broader business want

**Need:** Regular organic promotion, business development and growth through happy participants and referrals.

**Conditions and open scope:** No marketing automation programme or ad budget was agreed.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L909), CSV lines 909 (12:35); 924 (12:38); 1048 (13:02); 1051 (13:02); 1055 (13:03). Times are as recorded, PST.

### B04 — Future data portability

**Source status:** Broader business want

**Need:** Recognize the potential value of easier transfer if the business later changes its care management software.

**Conditions and open scope:** An immediate migration or independent full data repository was not approved.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L833), CSV lines 833 (12:18); 836 (12:19). Times are as recorded, PST.

### B05 — Cost, owner workload and service reliability

**Source status:** Business outcome

**Need:** Reduce admin effort and costs, improve responsiveness and participant retention, and make daily operations less dependent on the owners.

**Conditions and open scope:** Success measures and baselines have not been agreed.

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L860), CSV lines 860 (12:24); 862 (12:24); 902 (12:33); 904 (12:33); 919 (12:38); 950 (12:43); 952 (12:43); 1049 (13:02); 1055 (13:03); 1056 (13:04). Times are as recorded, PST.

## 8. Open decisions

Confirm these details with the people who run the current process. Review owners are suggested; they were not formally assigned in the meeting.

| Decision | Suggested reviewer | Information needed |
| --- | --- | --- |
| Forms and data mapping | Adriana / current admin | Actual forms, scans, mandatory fields, matching rules, target records and review steps. |
| Coverage and booking rules | Office / owners | Approved areas, capacity, worker hours, acceptance, rescheduling, exception and fallback rules. |
| Cancellation policy | Office / owners | Reasons, notice periods, charges, approval exceptions and notifications. |
| Financial rules | Bookkeeper / owners | Current rates, travel and kilometres, increments, actual versus planned time, funding recipients, payroll vendor and rounding exceptions. |
| Agreements and documents | Adriana / current admin | Existing templates, signing workflow, return/filing process, document types and correct expiry treatment. |
| Communication and access | Office / owners | Role permissions, retained history, urgent-note criteria, reminder channel and treatment of existing ShiftCare messages. |
| Arrival data | Office / workers | Location-sharing boundaries, when tracking starts/stops, ETA updates and behaviour when location data is unavailable. |
| Integration delivery | Development team | Available read/write operations, account access, supported fields, scheduling, failures and prevention of duplicate changes. |
| Scope, cost and timing | Owners / development team | Consult Adriana; agree the first phase, budget and delivery expectations. No fixed budget or deadline was set in the meeting. |

**Evidence:** [Meeting transcript](../dialpad_transcript_20261005_0923.csv#L334), CSV lines 334 (10:35); 481 (11:05); 540 (11:17); 565 (11:21); 681 (11:43); 762 (12:01); 766 (12:02); 771 (12:02); 773 (12:03); 775 (12:04); 1148 (13:18); 1155 (13:19); 1158 (13:19); 1166 (13:21); 1174 (13:23). Times are as recorded, PST.

## 9. Suggested delivery sequence

The following sequence is a recommendation from this review. It was not agreed as a delivery plan in the meeting.

**1. Confirm and pilot intake**

Capture the current process, agree field mappings and review steps, and pilot emailed/scanned onboarding into the appropriate ShiftCare/Xero records.

**2. Reduce routine follow-up**

Add service area screening, clear enquiry ownership and reminder/confirmation/cancellation handling with agreed exceptions.

**3. Improve operational review**

Address document cleanup, important visit notes, duration discrepancies and bookkeeping exceptions using the existing systems.

**4. Extend participant and worker access**

Add the selected portal features and Mapbox arrival views once access, booking controls and location-sharing rules are confirmed.

## 10. Validation findings

- This inventory includes agreement handling, visit records, retained communication history, portal features and broader business wants alongside the main automation needs.
- Travel figures and legal/rate claims in the automatic transcript are not treated as verified rules. Confirm the applicable calculations before configuration.
- The transcript's recruitment questions describe operating concerns; they do not automatically authorize a new software module for every concern.
- The vendor payment discussion concerns paying the service provider and does not establish a participant payment feature. Applicant suggestions and team claims are not treated as client requirements.
- The meeting ended with further consultation, a proposed follow-up demonstration and phased progress. It does not establish a final approved feature list.

### Review conclusion

The meeting supports a phased project around intake, confirmations, communication and bookkeeping. Final scope, budget and timing require the owners' review.

## 11. Researched integration design and interactive diagrams

The [ShiftCare integration and automation design](OCD_ShiftCare_Integration_and_Automation_Design.md) is the current implementation reference. It cross-checks these 27 scope items against official ShiftCare documentation, the authenticated MCP catalog, bounded read-only checks and the prototype code. It maps the current client process, repeated work, ownership, triggers, data, supported methods and human fallbacks. ShiftCare remains the source of truth; the OCD web app supplies the automation and exception layer.

- [System architecture and integration boundaries](../.archify/architecture-ocd-shiftcare-20261006-185221/ocd-shiftcare.html)
- [Participant and worker intake / document workflow](../.archify/architecture-ocd-shiftcare-intake-20261006-185221/ocd-shiftcare-intake.html)
- [Confirmation, cancellation and cover workflow](../.archify/architecture-ocd-shiftcare-service-20261006-185221/ocd-shiftcare-service.html)
- [Visit review, Tuesday invoices and fortnightly payroll workflow](../.archify/architecture-ocd-shiftcare-finance-20261006-185221/ocd-shiftcare-finance.html)
- [Capability evidence](ShiftCare_Capability_Validation_2026-10-06.json) and [diagram review record](OCD_ShiftCare_Diagram_Review.json)

All four diagrams passed 9/9 showcase checks, with zero errors and zero warnings, plus artifact and browser checks. Light and dark captures were inspected. Editable specifications and receipts sit beside each HTML file. Detailed charts allow vertical scrolling at smaller viewports.

This is a researched proposal. The connected trial account is not verified as OCD's production account; website REST authentication and write operations have not been tested. Production forms, policies, feature entitlement and the admin/bookkeeper's detailed process remain acceptance gates in the design.

The [earlier overview](../.archify/workflow-ocd-automation-20261006-170818/ocd-automation.html) is retained as a historical draft. Its rendering checks did not establish integration support; use the researched design and revised diagrams above for implementation.
