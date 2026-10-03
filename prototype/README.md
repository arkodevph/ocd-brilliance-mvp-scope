# OCD Brilliance operations prototype

A navigable frontend demonstration of the first-release scope in the internal MVP PRD (version 1.2). Open [the live demo](https://rovicsom.github.io/ocd-brilliance-mvp-scope/prototype/) or serve this repository locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/prototype/`. No package installation or build step is needed.

## Suggested client walkthrough

1. Start in **Office → Overview**. Open the enquiry, cover and visit-review tasks.
2. Switch to **Public**. Book a discovery call and submit intake with the same email. Return to **Office → Enquiries** to see one linked case.
3. Review the intake suggestion and email draft. Mark the enquiry ready for agreement, create its participant record, then generate an agreement draft. The office approval and signed result are simulated.
4. Open **Office → Schedule**. Resolve a booking that needs cover, or create a proposed recurring booking. Use the week arrows to see later occurrences, then confirm one after checking eligibility and participant agreement.
5. Switch to **Worker**. Open an assigned visit, record demo clock times and a progress note, or report unavailability. Return to **Office → Visit records** to review or correct a time with a reason.
6. Switch to **Client**. View a participant's bookings and documents, send a booking-change request, or update permitted details. Use **Demo portal account** to see Farah's view as her recorded representative, Samira. Return to the office participant record to handle a request.
7. Open **Office → Routes & fees**. Compare an illustrative route estimate with actual distance. Enter an approved rate reference for a transport proposal. For cancellation, start with a recorded cancelled booking, enter an example rule, then review the proposed fee.

## Prototype boundaries

- All names, contacts, dates, distances and documents are fictional examples. Actions are saved in this browser's `localStorage`; use **Reset demo data** in the office sidebar to start again.
- The role switch is presentation navigation, not authentication. The final system requires secure accounts, permissions, backups and a server.
- AI suggestions, email sending, office-calendar events, route responses and electronic signing are simulated. No external service is called.
- Agreement wording, rates and cancellation rules are placeholders. The client must approve the real template, vendors and policies. The public website currently has differing cancellation notice wording.
- Fee calculations create proposals for office review. They do not invoice or submit NDIS claims. Final invoicing and verified actual-kilometre records remain in the current system during the pilot, until cutover checks pass.

The interface uses the current PRD as its feature boundary. The internal PRD is deliberately kept outside this public repository.
