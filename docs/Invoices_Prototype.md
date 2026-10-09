# Invoice walkthrough

Open **Team & finance → Invoices**, or select **Open invoices** from Bookkeeping review.

Two example drafts show completed visits for Olivia Hart and Daniel Wu. The $65 hourly rate is fictional, not an approved OCD or funding rate. Neither draft is reviewed, sent or paid initially.

1. Open an invoice to inspect the billing recipient, linked service visits, hours, hourly rates and AUD total.
2. Open each linked visit and compare attendance with the proposed billable hours. Draft hours initially use the scheduled duration; they are not inferred billing approval.
3. Edit recipient, hours, rates and rate source. Select **Save draft** to recalculate the preview. Changes return a previously reviewed invoice to Draft.
4. Confirm the review checkbox and select **Mark reviewed**. This records the signed-in reviewer locally. It does not issue an invoice or make a payment.
5. Select **Print / save PDF** for the invoice draft alone.

For a new invoice, choose a participant and date range, supply a rate and its reference, then select **Create invoice draft**. Only completed visits not already included in another invoice are included. In the examples, Daniel's visit on 5 October is available for a new draft. Linked bookkeeping checks are shown when the Tuesday invoice checklist has been prepared for those visits.

The prototype stores invoices in this browser. It does not connect Xero, send emails, determine tax treatment, calculate final payroll, or create payment transactions. Drafts explicitly show that they are not tax invoices. Production issuance would need verified business, recipient, pricing, tax and accounting integration details.

Validation: invoice arithmetic, invalid values and dates, completed-visit selection and duplicate prevention have unit coverage. Browser checks cover invoice creation, review confirmation, recalculation, reload persistence, mobile layout and printable PDF layout.
