# AI showcase

Open **Clients & intake → Intake → Paste the request**. Paste fictional prose, then select **Extract with AI**. The result shows fields, exact source quotations, deterministic validation findings, and the model that answered. Saving the draft continues into the existing staff review flow.

Example:

> Hi, my name is Taylor Showcase. I need Domestic assistance in Joondalup, postcode 6027. My email is taylor.showcase@example.test.

Typing runs rule-based extraction on the server. Pressing the AI button sends the text to OpenRouter. PDF or image uploads automatically run AI extraction when configured. AI does not decide eligibility, approve care, create a ShiftCare profile, connect Gmail, or send messages.

For email drafting on enquiries, open **Clients & intake → Enquiries → a record → Email draft**, then select **Draft email with AI**.

The inbox prototype uses **Daily work → Automation → Email review → Add message**. Enter sender, subject and original message, then select **Review with AI**. Compare the summary, category, team and proposed reply with the original. Confirm or change the responsible team, edit the next action and select **Create assigned task**. The task retains the source and owner. Record a checked outcome to complete the follow-up. Reopening a reviewed message reuses its cached AI review and cannot create another assigned task.

Sample-loading and bulk-routing controls have been removed from this inbox. Previously seeded messages and their linked cases are removed from the prototype inbox on its first use; user-added messages are retained. Messages, reviews and tasks persist in this browser, not in a production mailbox or server job queue. Gmail is not connected; replies are copied for use elsewhere and nothing is sent automatically. AI suggestions do not mutate bookings or financial records.

PDF text is read with PDF.js. Pages without embedded text and image uploads use Tesseract.js OCR, with progress displayed and one worker reused across the document. Extracted text then goes through AI field extraction and deterministic checks. This text model does not see the original image and cannot reliably repair OCR mistakes. Compare names, contact details and numbers against the original; accuracy and speed have not been benchmarked on client documents.

The local configuration uses `OCD_AI_PROVIDER=openrouter`, `OCD_AI_MODEL=mistralai/mistral-nemo`, and `OCD_AI_DEMO=true`. The secret is stored in ignored `.env.local` as `OPENROUTER_API_KEY`; hosted environments need the same settings supplied as server environment variables. Never put the key in browser assets.

`mistralai/mistral-nemo` pins a low-cost extraction model rather than changing models between requests. Provider capacity is variable. Timeout, malformed output and provider failures produce an explicit error; unsupported field values fall back to literal source extraction. Output is capped at 2,000 tokens and requests time out after 45 seconds. No automatic paid fallback or retry runs.

Showcase mode permits text previews and PDF/scan imports while production extraction approval remains pending. File type, size, source evidence and manual ShiftCare handoff checks remain active. Download the fictional sample from the intake form and upload it using PDF or scan. AI extraction starts automatically when configured. Turn off `OCD_AI_DEMO` when preparing production approval.

References: [Mistral Nemo](https://openrouter.ai/mistralai/mistral-nemo), [API reference](https://openrouter.ai/docs/api/reference/overview).

Model selected from the current OpenRouter catalogue: $0.029 per million input tokens and $0.03 per million output tokens. Pricing can change.
