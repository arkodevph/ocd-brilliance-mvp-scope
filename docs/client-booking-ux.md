# Client booking experience

The client portal should let clients and authorised representatives request support on a phone without navigating an office dashboard. The requested audience includes people with disabilities; specific motor, visual, cognitive and assistive-technology needs still need testing with OCD's clients.

Flow: choose a labelled service → choose a preferred date → review the service/date and optional access needs → save a request → see a persistent receipt and pending request. Returning clients see upcoming services separately from past bookings. Cancelling review keeps the selection; duplicate pending service/date requests show an error. No availability, price or worker is inferred from an empty calendar.

| Evidence | Population/task and finding | Confidence and limits | Decision and falsification |
| --- | --- | --- | --- |
| [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Accessibility standard for pointer operation; minimum AA target is 24×24 CSS pixels with exceptions. Bigger controls can help users with reduced precision. | Strong conformance guidance; does not prove task speed or cover all disabilities. | Service/nav controls at least 44×44; calendar buttons at least 24 wide and 44 tall at 320px. Test accidental activations with clients; frequent errors would require larger spacing or a different date control. |
| [Choice-overload meta-analysis](https://doi.org/10.1086/651235) | 50 experiments, 5,036 participants; near-zero average effect with substantial variation. | Strong synthesis; transfer from varied choice tasks to disability-support booking is contextual. | Keep all six services visible with labels instead of assuming a universal choice limit. Test service-selection accuracy; persistent confusion would require clearer categories or service descriptions. |
| [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Accessibility standard for communicating results and errors without requiring users to discover them visually. | Strong conformance guidance; actual announcements vary with browser and assistive technology. | Persistent request receipt, pending cards, live status toast and alert errors. Test with screen readers; missed announcements or a mistaken belief that a booking is confirmed would invalidate the feedback design. |

`ui-design-index` routes desktop to `ui-design-systems` and phones to `ui-mobile-patterns`. Wide desktop uses horizontal header navigation and a compact, continuous grid: calendar in the left third, three service groups in the remaining space, then equal columns for bookings, requests and help. Smaller desktops use two columns. Phones use visible bottom navigation, six service tiles with labels and a review sheet. Mobile uses one column, safe-area spacing, relative font sizes and no added motion. Native date entry provides an alternative to calendar buttons. Help, documents, arrival and account information remain reachable.

## Reviewed visual references

Home shows the next booking and latest pending request, with View all links to the longer lists. Phone Home uses Book support, Upcoming and Requests views instead of stacking panels. The default home is checked without page scrolling at 1366×768, 1280×800, 1440×900 and 390×844. Shorter screens, enlarged text, full records and booking review can still scroll so controls and content remain reachable.

Primary desktop reference: [Ronas IT's patient portal](https://dribbble.com/shots/27735585-Medical-Website-Design-Patient-Portal). Its horizontal icon/text navigation, compact title, visible month calendar, four-pixel gutters and aligned two-row composition define the desktop layout. Three coloured service groups replace the clinical metric tiles: home services, support/transport, and specialist care. Each contains two labelled booking actions. Bookings, pending requests and help replace the reference's three lower panels. Dark selected navigation, warm neutral panels, worker portraits and a decorative heart retain the reference's visual hierarchy with OCD content and accessible control sizes. No clinical charts, proprietary artwork or fictitious health measurements are reproduced. No motion dependency is added.

Secondary phone reference: [Ajendra Sutariya's service-booking app](https://dribbble.com/shots/24970937-Service-Booking-Mobile-App-UI), for service-first selection and visible bottom tabs. Promotional banners and small horizontal category targets are omitted; labelled service buttons remain large. This pattern applies only at widths up to 760px. Desktop review uses a centred dialog; phones use a bottom sheet.

Additional shots opened and visually inspected during reference research:

- [Veyra patient portal](https://dribbble.com/shots/27641720-Patient-Portal-Dashboard-for-Labs-Medication-and-Virtual-Care): rejected as dark, dense and dependent on a body-map visual.
- [Anglara patient portal](https://dribbble.com/shots/27418572-Healthcare-Dashboard-UI-Medical-Management-System): rejected as a clinical summary rather than a booking-first screen.
- [Shireen's appointment dashboard](https://dribbble.com/shots/26742232-Patient-Dashboard-UI-Design-Appointment-Booking-Tracking): useful appointment grouping; banner/provider directory adds unnecessary choices.
- [Jahangir's health dashboard](https://dribbble.com/shots/26383625-Health-Dashboard-UI-UX-Design): rejected for icon-only navigation, treatment tables and competing actions.
- [Ghulam's doctor dashboard](https://dribbble.com/shots/24837908-Doctor-s-Appointment-Dashboard-UI-Design-Health-Management-A): rejected as a clinician workspace.
- [Umair's medical web app](https://dribbble.com/shots/27681103-Healthcare-SaaS-UI-Design-Medical-Web-App-Patient-Dashboard): horizontal navigation fits desktop, but metrics and appointment tables are too dense.
- [Mohsin's doctor dashboard](https://dribbble.com/shots/26513979-Doctor-Dashboard-UI-UX): rejected as an operations dashboard with charts and export controls.
- [TheRoom's LPG booking website](https://dribbble.com/shots/25634596-Case-Study-LPG-Beauty-Services-Booking-Website): rejected because the composition depends on treatment-equipment imagery and a promotional hero.
- [Quadrato patient portal](https://dribbble.com/shots/11350279-Patient-Portal-Medical-Dashboard-pt-3): readable appointment details, but sidebar hierarchy is larger than this client flow needs.

This is a browser demonstration. Production client identity/access checks, server-backed booking requests, real office delivery and live availability are not implemented here. Human follow-up remains necessary before a booking is confirmed.

Validation: test keyboard service/date selection, readable control labels, reflow at 320/390/768/1440px, short-screen dialogs, date boundaries, duplicate prevention, escaped notes, cancellation, persistence, representative switching and manual-only office routing. Browser checks cannot establish WCAG conformance or usability for all disabilities. A focused test with clients should measure unassisted request completion, wrong-service/date selections and understanding of pending versus confirmed bookings.
