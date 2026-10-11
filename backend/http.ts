import type { Request, Response } from 'express';
export type ApiHandler = (req: Request, res: Response) => Promise<void>;
export type JsonObject = Record<string, unknown>;
export type ErrorDetails = Error & { status: number; code: string; retryAfter?: number; details: JsonObject; statusCode?: number };
