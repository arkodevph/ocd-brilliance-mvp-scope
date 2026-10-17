import type { IncomingMessage, ServerResponse } from 'node:http';

// Vercel may provide a parsed body; local requests remain readable Node streams.
export type Request = IncomingMessage & { body?: unknown };

export type Response = ServerResponse;
export type ApiHandler = (req: Request, res: Response) => Promise<void>;
export type JsonObject = Record<string, unknown>;
export type ErrorDetails = Error & {
  status: number;
  code: string;
  retryAfter?: number;
  details: JsonObject;
  statusCode?: number;
};

export async function readRequestText(
  req: Request,
  limit: number,
  tooLarge: () => Error,
  unit: 'bytes' | 'characters' = 'bytes',
): Promise<string> {
  let text = '';

  for await (const chunk of req) {
    text += chunk;
    const size = unit === 'bytes' ? Buffer.byteLength(text) : text.length;

    if (size > limit) throw tooLarge();
  }

  return text;
}

export function sendJson(
  res: Response,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
  replacer?: (key: string, value: unknown) => unknown,
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });

  res.end(JSON.stringify(data, replacer));
}
