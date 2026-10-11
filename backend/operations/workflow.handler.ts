import type { Request, Response } from 'express';
import type { JsonObject, ErrorDetails } from '../http';
import { startVideo, appendVideo, streamVideo } from '../intake/video-store';
const crypto = require('node:crypto');
const { IntakeRepository } = require('../../lib/intake-repository.cjs');
const { IntakeService } = require('../../lib/intake-service.cjs');
const { WorkflowError, clean } = require('../../lib/intake-domain.cjs');
const { config: aiConfig, emailDraft, emailReview } = require('../../lib/intake-ai.cjs');
const {
  intakeOwner,
  ownerOptions,
  configured,
  staffSession: cookie,
  sessionCookie,
  originAllowed,
  authenticate,
  staffRole,
  permits,
} = require('../../lib/staff-auth.cjs');
const R = require('../../lib/intake-rules.cjs');

const storage = () => IntakeRepository.configured();

function send(
  res: Response,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(
    JSON.stringify(data, (key, value) =>
      ['operations', 'creationKey', 'creationHash', 'creationResult'].includes(key)
        ? undefined
        : value,
    ),
  );
}
async function body(req: Request): Promise<JsonObject> {
  const action = new URL(req.url, 'http://localhost').searchParams.get('action');
  const limit = action === 'intake' ? 4300000 : action === 'draft' ? 3000000 : 20000;
  const validate = (value: unknown): JsonObject => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new WorkflowError(400, 'Request body must be a JSON object.');
    return value as JsonObject;
  };
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body)) > limit)
      throw new WorkflowError(413, 'Request too large');
    return validate(req.body);
  }
  let text = '';
  for await (const part of req) {
    text += part;
    if (Buffer.byteLength(text) > limit) throw new WorkflowError(413, 'Request too large');
  }
  let parsed;
  try {
    parsed = JSON.parse(text || '{}');
  } catch (_) {
    throw new WorkflowError(400, 'Request body must be valid JSON.');
  }
  return validate(parsed);
}
async function assignmentBody(req: Request) {
  const data = await body(req);
  if (!ownerOptions().some((user: { email: string }) => user.email === data.owner))
    throw new WorkflowError(422, 'Select an owner from the staff search results.');
  return data;
}
function covered(postcode: string) {
  if (!configured() || !storage() || !intakeOwner())
    return {
      status: 'unconfigured',
      message: 'Requests are not open yet. Please contact the office.',
    };
  const approved = (process.env.SERVICE_POSTCODES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!approved.length)
    return {
      status: 'unconfigured',
      message: 'Service area has not been configured. Please contact the office.',
    };
  if (!/^\d{4}$/.test(postcode))
    return {
      status: 'invalid',
      message: 'Enter a four-digit Australian postcode.',
    };
  return approved.includes(postcode)
    ? {
        status: 'covered',
        message: 'We may be able to help in this area. Availability is confirmed after review.',
      }
    : {
        status: 'outside',
        message:
          'We are not currently taking intake requests in this postcode. Please contact the office if you need advice.',
      };
}
export async function handleWorkflow(req: Request, res: Response): Promise<void> {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action');
    if (!originAllowed(req)) return send(res, 403, { error: 'Request origin is not allowed.' });
    if (action === 'area' && req.method === 'GET')
      return send(res, 200, covered(clean(url.searchParams.get('postcode'), 10)));
    if (action === 'session' && req.method === 'GET')
      return send(res, 200, {
        email: cookie(req),
        role: staffRole(cookie(req)),
        configured: configured(),
        storageReady: Boolean(storage()),
      });
    if (action === 'login' && req.method === 'POST') {
      const data = await body(req);
      if (!configured())
        return send(res, 503, {
          error: 'Staff sign-in has not been configured.',
        });
      const email = authenticate(data.email, data.password);
      if (!email)
        return send(res, 401, {
          error: 'Email or username, or password is incorrect.',
        });
      return send(
        res,
        200,
        { email, role: staffRole(email) },
        { 'Set-Cookie': sessionCookie(email, req) },
      );
    }
    if (action === 'logout' && req.method === 'POST')
      return send(
        res,
        200,
        { ok: true },
        {
          'Set-Cookie': 'ocd_staff=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
        },
      );
    const db = storage();
    if (!db) return send(res, 503, { error: 'Server storage is not configured.' });
    if (action === 'video-start' && req.method === 'POST') {
      const data = await body(req);
      if (covered(clean(data.postcode, 10)).status !== 'covered' || data.consent !== true)
        return send(res, 422, {
          error: 'Check your service postcode and consent before uploading.',
        });
      return send(res, 201, await startVideo(data));
    }
    if (action === 'video-upload' && req.method === 'POST') {
      const offset = url.searchParams.get('offset');
      if (!offset || !/^\d+$/.test(offset))
        return send(res, 422, { error: 'Supply an upload offset.' });
      return send(
        res,
        200,
        await appendVideo(req, url.searchParams.get('id') || '', Number(offset)),
      );
    }
    if (action === 'intake' && req.method === 'POST') {
      const data = await body(req);
      const postcode = clean(data.postcode, 10);
      if (covered(postcode).status !== 'covered')
        return send(res, 422, {
          error: 'Please check a covered postcode before submitting.',
        });
      const name = clean(data.name, 120),
        email = clean(data.email, 200),
        phone = clean(data.phone, 40);
      const service = clean(data.service, 120),
        suburb = clean(data.suburb, 120),
        notes = clean(data.notes, 2000);
      if (
        !name ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        !phone ||
        !service ||
        !suburb ||
        data.consent !== true
      )
        return send(res, 422, {
          error: 'Complete the required details and consent before submitting.',
        });
      const record = await new IntakeService(db, covered).createDraft(
        {
          name,
          email,
          phone,
          service,
          suburb,
          postcode,
          notes,
          serviceVideo: data.serviceVideo,
          serviceVideos: data.serviceVideos,
          bookingRequest: data.bookingRequest,
          source: 'Website',
          sourceName: 'Website request',
          consent: true,
          idempotencyKey: data.idempotencyKey,
        },
        intakeOwner(),
      );
      return send(res, 201, {
        id: record.id,
        message: 'Request received. The office will review it and contact you.',
      });
    }
    const staff = cookie(req);
    if (!staff) return send(res, 401, { error: 'Sign in to continue.' });
    const permission =
      action === 'handoff-approve' || action === 'handoff-verify'
        ? 'approve'
        : req.method === 'GET'
          ? 'read'
          : 'write';
    if (!permits(staff, permission))
      return send(res, 403, {
        error: 'Your role does not permit this action.',
      });
    if (action === 'video' && req.method === 'GET') {
      const record = await db.get(clean(url.searchParams.get('recordId'), 40));
      const video = record?.onboarding?.serviceVideos?.find(
        (item: { id: string }) => item.id === url.searchParams.get('id'),
      );
      if (!video) return send(res, 404, { error: 'Video not found on this intake.' });
      return streamVideo(req, res, video);
    }
    if (action === 'owners' && req.method === 'GET')
      return send(res, 200, { owners: ownerOptions() });
    if (action === 'staff-intake' && req.method === 'POST') {
      const data = await body(req);
      const name = clean(data.name, 120),
        email = clean(data.email, 200),
        phone = clean(data.phone, 40);
      const service = clean(data.service, 120),
        suburb = clean(data.suburb, 120),
        postcode = clean(data.postcode, 10),
        notes = clean(data.notes, 2000),
        source = clean(data.source, 30);
      if (
        !name ||
        (!email && !phone) ||
        (email && !/^\S+@\S+\.\S+$/.test(email)) ||
        !service ||
        !['Email', 'Phone', 'Coordinator'].includes(source) ||
        (postcode && !/^\d{4}$/.test(postcode))
      )
        return send(res, 422, {
          error: 'Add a name, contact method, service, and source.',
        });
      const record = await new IntakeService(db, covered).createDraft(
        {
          name,
          email,
          phone,
          service,
          suburb,
          postcode,
          notes,
          source,
          idempotencyKey: data.idempotencyKey,
        },
        staff,
      );
      return send(res, 201, { record });
    }
    if (action === 'intakes' && req.method === 'GET') {
      const records = await db.all();
      records.sort((a: { createdAt: string }, b: { createdAt: string }) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      return send(res, 200, { records });
    }
    const service = new IntakeService(db, covered);
    if (action === 'ai-email-review' && req.method === 'POST') {
      if (!aiConfig().demo)
        throw new WorkflowError(422, 'Email review is available in showcase mode.');
      return send(res, 200, await emailReview(await body(req)));
    }
    if (action === 'ai-email' && req.method === 'POST') {
      const data = await body(req);
      if (data.id) {
        const record = await db.get(clean(data.id, 40));
        if (!record) throw new WorkflowError(404, 'Enquiry not found.');
        return send(
          res,
          200,
          await emailDraft({
            fields: record,
            sourceText: record.onboarding?.sourceText || record.notes,
          }),
        );
      }
      if (!aiConfig().demo)
        throw new WorkflowError(422, 'Select a saved enquiry before drafting an email.');
      return send(res, 200, await emailDraft(data));
    }
    if (action === 'rules' && req.method === 'GET') {
      const ai = aiConfig();
      return send(res, 200, {
        rules: service.policy,
        extractionAllowed: R.extractionAllowed(service.policy),
        documentAllowed: ai.demo || R.extractionAllowed(service.policy),
        aiConfigured: Boolean(ai.key),
        aiAllowed: Boolean(ai.key) && (ai.demo || R.extractionAllowed(service.policy)),
        aiDemo: ai.demo,
        aiProvider: ai.provider,
      });
    }
    if (action === 'queue' && req.method === 'GET')
      return send(res, 200, { items: await service.queue() });
    if (action === 'handoff-approve' && req.method === 'POST')
      return send(res, 200, {
        record: await service.approve(await body(req), staff),
      });
    if (action === 'handoff-failure' && req.method === 'PATCH')
      return send(res, 200, {
        record: await service.failure(await assignmentBody(req), staff),
      });
    if (action === 'draft-preview' && req.method === 'POST') {
      const data = await body(req);
      return send(res, 200, await service.previewText(data.text, data.ai === true));
    }
    if (action === 'csv-preview' && req.method === 'POST') {
      const data = await body(req);
      return send(res, 200, {
        rows: await service.previewCsv(data.text, data.mapping),
      });
    }
    if (action === 'draft' && req.method === 'POST')
      return send(res, 201, {
        record: await service.createDraft(await body(req), staff),
      });
    if (action === 'draft-review' && req.method === 'PATCH')
      return send(res, 200, {
        record: await service.update(await assignmentBody(req), staff, true),
      });
    if (action === 'handoff-verify' && req.method === 'PATCH')
      return send(res, 200, {
        record: await service.verify(await body(req), staff),
      });
    if (action === 'handoff' && req.method === 'GET')
      return send(res, 200, {
        text: await service.handoff(
          clean(url.searchParams.get('id'), 40),
          clean(url.searchParams.get('revision'), 100),
        ),
      });
    if (action === 'record' && req.method === 'PATCH')
      return send(res, 200, {
        record: await service.update(await assignmentBody(req), staff),
      });
    return send(res, 404, { error: 'Unknown action.' });
  } catch (error) {
    if (error instanceof WorkflowError) {
      const failure = error as ErrorDetails;
      return send(res, failure.status, {
        error: failure.message,
        ...failure.details,
      });
    }
    console.error('Workflow request failed:', error);
    send(res, 500, { error: 'The request could not be completed.' });
  }
}
