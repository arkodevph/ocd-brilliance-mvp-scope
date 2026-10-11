# Case workspace navigation

Primary visual reference: [Cosmo — Unified Inbox](https://dribbble.com/shots/26783582-Cosmo-Customer-Support-Dashboard-Unified-Inbox). Its narrow app navigation, adjacent case list, central reading pane and contextual detail area fit the existing automation screen. Keep neutral surfaces, hairline divisions, compact headings and restrained OCD green actions. Optional panels widen the central pane without navigating away from the current case.

Implementation: Hide/Show navigation in the shared top bar; Hide/Show cases and Hide/Show details above the case workspace. Details start hidden; other panels start visible. Preferences remain in this browser tab across routes and reloads. Native buttons provide keyboard interaction and expose aria-expanded/aria-controls. Hidden panels leave the focus order. No workflow data or approval state is changed by panel controls.

Reviewed gallery candidates:

- [Omnichannel support CRM](https://dribbble.com/shots/27464447-Omnichannel-Inbox-Support-CRM-Dashboard): useful adjacent panels, too many persistent columns.
- [Helpdesk analytics](https://dribbble.com/shots/27169872-Helpdesk-Ticket-Management-Admin-Dashboard-UI-UX-Design): rejected; analytics rather than case review.
- [Help Desk dashboard](https://dribbble.com/shots/27403165-Help-Desk-Ticket-Management-Dashboard-UI-UX-Design): rejected; retrieved image did not match requested case surface.
- [Helpdesk SaaS](https://dribbble.com/shots/27056160-Helpdesk-Saas-Dashboard): listing/drill-down candidate, no usable full case image retrieved.
- [Aivia tickets](https://dribbble.com/shots/26990881-Aivia-AI-Customer-Support-Dashboard-Ticket-Page): useful metadata hierarchy; table composition differs from existing review flow.
- [Keitoto inbox](https://dribbble.com/shots/26778695-Customer-Support-Dashboard-Inbox-Thread-Collaboration): retrieved mobile view informs list spacing, not desktop composition.
- [Cosmo](https://dribbble.com/shots/26783582-Cosmo-Customer-Support-Dashboard-Unified-Inbox): selected primary, includes visible panel-folding icon.
- [VALMAX support](https://dribbble.com/shots/27124063-AI-Customer-Support-Dashboard-UI): unavailable useful full image; not selected.
- [Spark Pixel customer service](https://dribbble.com/shots/26960957-AI-Customer-Service-Dashboard): unavailable useful full image; not selected.

Previously reviewed Closr and Crisply workspace references were also inspected for panel controls. They are secondary comparisons, not additional visual systems copied into the product.

Browser checks: automation regression passed with 6 captures and no uncaught errors. Targeted checks cover independent toggles, wider reading pane, preference persistence and mobile overflow.
