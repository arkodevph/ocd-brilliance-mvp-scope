# Financial checks — macOS list redesign

## Behavior and flow

Office staff/bookkeeper routinely locate discrepancies in a service period, identify the affected person/record, compare evidence, assign responsibility, correct the source and recheck. The old rows gave repeated issue headings more weight than identity and separated ownership/actions across a wide empty gap. No staff task-time baseline is known. Production permissions remain outside this local visual change.

| Stage | Required context and action | Likely hesitation | Feedback/recovery and success |
|---|---|---|---|
| Locate | Period, readiness, area/state filters | Wrong period or interpreting counts as financial approval | Persistent scope, existing empty-period message and explicit limits |
| Identify | Person/record, date/ID, issue, state, owner | Confusing similarly named repeated checks | Aligned columns and independent identity block; same fields stack on phones |
| Investigate | Review check and compare evidence | Opening wrong subject or losing context | Descriptive accessible action name and unchanged detail context/back link |
| Correct/recover | Open source, record action/explanation, recheck | Believing an explanation permanently clears a changed record | Existing evidence validation, inline errors, persistent owner/history and source-change reopening |

## Evidence ledger

| Source and confidence | Task/finding and boundary | Decision and falsification |
|---|---|---|
| [Cowan 2001](https://pubmed.ncbi.nlm.nih.gov/11515286/): strong synthesis for constrained memory; UI transfer analogy-only | Reviews capacity studies with limits on rehearsal/grouping. Findings do not prescribe an exact list length or column count. | Externalize identity, evidence, state and owner in aligned groups. Disconfirm benefit if staff still misidentify subjects or repeatedly reread across rows. |
| [Scheibehenne et al. 2010](https://doi.org/10.1086/651235): strong meta-analysis; context-dependent product implication | Consumer choice experiments; average choice-overload effect is near zero with variation. This is not a bookkeeping performance study. | Preserve all checks and filter choices; improve comparability rather than blindly removing options. Validate against omissions/time finding a known discrepancy. |
| [WCAG reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): strong normative accessibility basis | Supports resizing without two-dimensional reading; automated viewport checks alone do not certify conformance. | Stack identical row fields at narrow widths, wrap descriptions, retain keyboard links and descriptive names. Check internal row overflow and keyboard operation. |

## Visual decisions

`user-expi → ui-design-index → ui-design-systems`. Continue the already reviewed Things-inspired workspace token system documented in `docs/design/macos-direction.md`; no new gallery-copy request or competing component library.

Patterns: quiet native toolbar, aligned list columns with fine separators, neutral state labels. Identity uses15px/600, issue15px/500, evidence14px regular; metadata13px. System font, shared border/radius/surface tokens. Compact summary counts with subordinate source links. Hover/focus-within uses a160ms background transition; reduced motion removes it. Existing financial computation remains synchronous, with existing empty/error states retained.

Changed files: financial-checks/page.mjs, financial-checks/styles.css, frontend/main.tsx (feature styles after shared macOS layer), workspace/sw.js (v86), scripts/prototype-browser-check.mjs (column/reflow/keyboard checks). The financial engine and saved case data are unchanged.

## Verification and unknowns

See browser-review.json and verification.json for exact results. Desktop and narrow screenshots were inspected. A staff usability trial, screen-reader user trial and subjective acceptance remain unknown; this change does not establish faster bookkeeping.
