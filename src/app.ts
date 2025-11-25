import 'reflect-metadata';
import express from 'express';
import container from './config/container';
import { TYPES } from './types/di.types';
import { ILogger } from './logging/logger.interface';
import { asyncContextMiddleware } from './middlewares/asyncContext';
import { createHttpLoggerMiddleware } from './middlewares/httpLogger';
import { createErrorHandler } from './middlewares/errorHandler';
import healthRoutes from './routes/healthRoutes';

const app = express();

const logger = container.get<ILogger>(TYPES.Logger);

app.use(asyncContextMiddleware);
app.use(createHttpLoggerMiddleware(logger));
app.use(express.json());

app.use('/health', healthRoutes);
app.use(createErrorHandler(logger));

export default app;
