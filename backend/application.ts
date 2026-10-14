import { Hono } from 'hono';
import { getRequestListener, type HttpBindings } from '@hono/node-server';
import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response';
import type { ApiHandler } from './http';
import { handleJourneyRequest } from './journeys/journeys.handler';
import { handleWorkflow } from './operations/workflow.handler';
import { handlePush } from './operations/push.handler';
import { createProofHandler } from './operations/proof.handler';
import { createShiftCareHandler } from './shiftcare/shiftcare.handler';

export const application = new Hono<{ Bindings: HttpBindings }>({ strict: false });

const routes: Record<string, ApiHandler> = {
  '/api/workflow': handleWorkflow,
  '/api/push': handlePush,
  '/api/shiftcare': createShiftCareHandler(),
  '/api/integration-proof': createProofHandler(),
  '/api/journeys': handleJourneyRequest,
};

for (const [path, handler] of Object.entries(routes)) {
  application.all(path, async (context) => {
    // Keep raw streams, pre-parsed Vercel bodies and socket-based push checks intact.
    await handler(context.env.incoming, context.env.outgoing);
    return RESPONSE_ALREADY_SENT;
  });
}

application.onError((_error, context) => {
  if (context.env.outgoing.headersSent) {
    context.env.outgoing.destroy();
    return RESPONSE_ALREADY_SENT;
  }

  return context.json({ error: 'The backend service is unavailable.' }, 503, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
});

// One listener serves both the local Node server and the existing Vercel functions.
export const dispatch = getRequestListener(application.fetch, { overrideGlobalObjects: false });
