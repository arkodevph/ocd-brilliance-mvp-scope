import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JourneysController } from './journeys/journeys.controller';
import { OperationsController } from './operations/operations.controller';

@Module({ controllers: [JourneysController, OperationsController] })
class OperationsModule {}

let application: Promise<NestExpressApplication> | undefined;

async function bootstrap(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(OperationsModule, { logger: false, abortOnError: false, bodyParser: false });
  await app.init();
  return app;
}

export function getApplication(): Promise<NestExpressApplication> {
  application ||= bootstrap().catch(error => { application = undefined; throw error; });
  return application;
}
