import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { handleJourneyRequest } from './journeys.handler';

// Nest owns routing; validation, ETA calculation and persistence stay in functions.
@Controller('api/journeys')
export class JourneysController {
  @All()
  handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    return handleJourneyRequest(req, res);
  }
}
