# macOS-inspired workspace styling

20 October 2026. Design-only update to the existing OCD workspace. The existing layouts, routes, account controls, record state, APIs and Companion feature flag remain in place.

## Chosen direction

Primary reference: [Things — official feature tour](https://culturedcode.com/things/features/). Visually inspected its Mac Today and Headings screenshots. Use its restrained type hierarchy, white content surfaces, light grouped controls, fine separators and breathing room. Keep OCD's existing dashboard composition and green action accent; do not copy Things artwork, text or window controls.

Supporting reference: [Apple sidebar guidance](https://developer.apple.com/design/human-interface-guidelines/sidebars). Preserve the existing navigation hierarchy and mobile navigation instead of adding another navigation system.

## References reviewed

Research included more than three minutes of live exploration and these distinct sources. Dribbble descriptions were readable, but the fetched previews contained no usable shot image; those concepts were not used as the primary visual reference.

| Reference | Decision |
| --- | --- |
| [Things feature tour](https://culturedcode.com/things/features/) | Primary: typography, whitespace, separators and quiet controls; Mac screenshots inspected. |
| [Things product page](https://culturedcode.com/things/) | Supporting product and interaction context. |
| [Apple sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) | Supporting navigation guidance. |
| [Dispatch macOS dashboard](https://dribbble.com/shots/27419854-Dispatch-macOS-SaaS-Dashboard-UI-UX) | Relevant native-app direction; no usable fetched shot preview. |
| [Task manager sidebar, Outcrowd](https://dribbble.com/shots/26595955-Task-manager-navigation-sidebar-UX-UI-design) | Navigation candidate; no usable fetched shot preview. |
| [Desktop calendar, Tamer Mancar](https://dribbble.com/shots/2349917-Desktop-Calendar-App-UI-Concept) | Mac calendar candidate; no usable fetched shot preview. |
| [Minimal healthcare dashboard](https://dribbble.com/shots/26448749-Minimal-Dashboard-UI-Design-for-Healthcare-and-Telemedicine) | Domain comparison; no usable fetched shot preview. |
| [Minimal task manager](https://dribbble.com/shots/25601101-Task-Manager-App-Minimal-Productive-UI) | Mobile hierarchy comparison; no usable fetched shot preview. |
| [Cadence calendar](https://dribbble.com/shots/27655787-Cadence-Calendar-App-UI) | Mobile density comparison; no usable fetched shot preview. |
| [Craft](https://www.craft.do/) | Reviewed; public preview was brand artwork, not a suitable workspace reference. |
| [Linear features](https://linear.app/features) | Reviewed for product context; not the chosen visual grammar. |

## Implementation

The existing `frontend/macos-premium.css` is the final workspace style layer. It defines neutral canvas/surface/border/text tokens and maps the office, employee and client theme variables to them. It also styles Companion and shared dialogs.

- System typography uses the platform's native font where available, with standard sans-serif fallbacks.
- Content cards use solid white surfaces and continuous neutral borders. Color stays in actions, icons, chart data and readable status labels.
- Translucency is limited to window chrome and the floating companion, with solid fallbacks for reduced transparency.
- Segmented view controls retain their existing buttons and selected state.
- Hover and focus feedback uses short color/border transitions; only the page content and Companion entrance use a small opacity/position transition. Content cards do not lift or stagger.
- Reduced-motion mode disables the added motion. Mobile controls retain touch targets, safe-area spacing and 16px text-entry sizing.

Verification artifacts are captured under `/tmp/ocd-mac-design/`. These are temporary screenshots and browser reports, not shipped application assets.
