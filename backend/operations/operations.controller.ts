import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { handleWorkflow } from './workflow.handler';
import { handlePush } from './push.handler';
import { createProofHandler } from './proof.handler';
import { createShiftCareHandler } from '../shiftcare/shiftcare.handler';

const shiftCare = createShiftCareHandler();
const proof = createProofHandler();

@Controller('api')
export class OperationsController {
  @All('workflow')
  workflow(@Req() req: Request, @Res() res: Response): Promise<void> {
    return handleWorkflow(req, res);
  }

  @All('push')
  push(@Req() req: Request, @Res() res: Response): Promise<void> {
    return handlePush(req, res);
  }

  @All('shiftcare')
  shiftcare(@Req() req: Request, @Res() res: Response): Promise<void> {
    return shiftCare(req, res);
  }

  @All('integration-proof')
  evidence(@Req() req: Request, @Res() res: Response): Promise<void> {
    return proof(req, res);
  }
}
