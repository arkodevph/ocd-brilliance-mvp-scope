# OCD Brilliance operations prototype

A navigable frontend demonstration of the first-release scope in the internal MVP PRD (version 1.2). Open [the live demo](https://ocd-demo-system.vercel.app/prototype/) or serve this repository locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/prototype/`. No package installation or build step is needed.

## Suggested client walkthrough

1. Start in **Office → Overview**. Open the enquiry, cover and visit-review tasks.
2. Switch to **Public**. Book a discovery call and submit intake with the same email. Return to **Office → Enquiries** to see one linked case.
3. Review the intake suggestion and email draft. Mark the enquiry ready for agreement, create its participant record, then generate an agreement draft. The office approval and signed result are simulated.
4. Open **Office → Calendar**. Move between months and select a day to see service visits, booked discovery calls and still-open public call times. Open a booking or call from the day panel. **Office → Schedule** keeps the weekly booking and cover workflow. In **Office → Booking map**, select a service date or worker, then select a booking to see its location, driving route and arrival preview. Use **Service location** to zoom into the 3D buildings, or switch to **2D**.
5. Switch to **Worker → Visit map** and open Olivia's 5 October booking. Play the simulated journey, pause it, mark arrival or stop sharing. Switch to **My calendar** to see that worker's confirmed and completed visits by month. Open an assigned visit to record demo clock times and a progress note, or report unavailability. Return to **Office → Visit records** to review or correct a time with a reason.
6. Switch to **Client → Track worker** to follow the same journey and see the remaining demo arrival time. View the participant's bookings and documents, send a booking-change request, or update permitted details. Use **Demo portal account** to see Farah's view as her recorded representative, Samira. Her map shows no bookings until she has an assigned service. Return to the office participant record to handle a request.
7. Open **Office → Routes & fees**. Compare an illustrative route estimate with actual distance. Enter an approved rate reference for a transport proposal. For cancellation, start with a recorded cancelled booking, enter an example rule, then review the proposed fee.

## Prototype boundaries

- All names, contacts, dates, distances and documents are fictional examples. Actions are saved in this browser's `localStorage`; use **Reset demo data** in the office sidebar to start again.
- The role switch is presentation navigation, not authentication. The final system requires secure accounts, permissions, backups and a server.
- The month calendars and booking maps reflect the browser's demo records. Mapbox supplies the 3D basemap and driving routes for fictional coordinates. Worker movement and arrival times are simulated; AI suggestions, email sending, external office-calendar sync, the sample fee-route responses and electronic signing are simulated.
- Agreement wording, rates and cancellation rules are placeholders. The client must approve the real template, vendors and policies. The public website currently has differing cancellation notice wording.
- Fee calculations create proposals for office review. They do not invoice or submit NDIS claims. Final invoicing and verified actual-kilometre records remain in the current system during the pilot, until cutover checks pass.

The interface follows the current PRD, with booking maps and arrival previews added for this demonstration. The internal PRD is deliberately kept outside this public repository.

## Mapbox and arrival demo

The map uses [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/get-started/use-with-cdn/) with the Standard 3D basemap and the [Directions API](https://docs.mapbox.com/api/navigation/directions/) for a driving route from the sample Joondalup office. Service markers use approximate suburb coordinates, not real participant addresses. New participants need map coordinates before their location can be plotted.

Vercel stores the public `pk.` token in `MAPBOX_PUBLIC_TOKEN`. The build generates `dist/prototype/map-config.js` from that environment variable; tokens and generated files are kept out of Git. **Office → Booking map → Map connection** can connect or override the token for the current browser when serving the source locally. Secret `sk.` tokens are rejected. The map library is loaded when a map view opens; the rest of the prototype works if Mapbox or WebGL is unavailable. Public token URL restrictions should allow the demo's Vercel domain and any local development address in use.

To preview the production build locally, put `MAPBOX_PUBLIC_TOKEN` in the ignored `.env.local` file, then run:

```bash
node --env-file=.env.local scripts/build-vercel.cjs
python3 -m http.server 8000 --directory dist
```

Journey playback takes about a minute and stays in sync across the office, worker and client views, including tabs in the same browser. Tracking stops when the worker stops sharing, the booking is cancelled, the assignment or service time changes, or the service is marked as needing cover. Clocking in marks arrival. Playback does not use device GPS or live traffic. Real monitoring across separate devices needs worker location sharing and a server to publish location updates and recalculate arrival estimates.
