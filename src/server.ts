import { shutdownTracing } from './tracing';
import http from 'http';
import app from './app';
import config from './config/config';
import container from './config/container';
import { IEventPublisher } from './events/eventPublisher';
import { ILogger } from './logging/logger.interface';
import { TYPES } from './types/di.types';
import { IConsumer } from './events/consumer/consumer.interface';
import { initializeDatabase, closeDatabase } from './config/initDatabase';

const logger = container.get<ILogger>(TYPES.Logger);

let server: http.Server | undefined;
let isShuttingDown = false;
const sockets = new Set<import('net').Socket>();

let eventPublisher: IEventPublisher | undefined;
const consumers: IConsumer[] = [];

async function gracefulShutdown(reason: string, err?: unknown) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (err) logger.error('Fatal error, starting shutdown', err instanceof Error ? err : new Error(String(err)));
  logger.warn(`Shutdown requested: ${reason}`);

  const closeHttp = async () =>
    new Promise<void>((resolve) => {
      if (!server) return resolve();
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
      setTimeout(() => {
        logger.warn('Forcing lingering sockets to close');
        for (const s of sockets) s.destroy();
      }, Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000)).unref();
    });

  const closeResources = async () => {
    try {
      try {
        for (const consumer of consumers) {
          try {
            await consumer.stop();
            logger.info('Consumer stopped', { isRunning: consumer.isRunning() });
          } catch (consumerErr) {
            logger.error('Error stopping consumer', consumerErr as any);
          }
        }
      } catch (consumerErr) {
        logger.error('Error stopping consumers', consumerErr as any);
      }

      try {
        await closeDatabase(logger);
      } catch (dbErr) {
        logger.error('Error closing database', dbErr as any);
      }

      try {
        if (eventPublisher?.disconnect) {
          await eventPublisher.disconnect();
          logger.info('Event publisher disconnected');
        }
      } catch (mqErr) {
        logger.error('Error disconnecting event publisher', mqErr as any);
      }

      try {
        await shutdownTracing();
        logger.info('Tracing shut down');
      } catch (otelErr) {
        logger.warn('Tracing shutdown error', otelErr as any);
      }
    } catch (e) {
      logger.error('Unexpected error during resource shutdown', e as any);
    }
  };

  await closeHttp();
  await closeResources();

  process.exit(err ? 1 : 0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => gracefulShutdown('unhandledRejection', reason));
process.on('uncaughtException', (error) => gracefulShutdown('uncaughtException', error));

const startServer = async () => {
  try {
    logger.info('Starting notification service', { environment: config.nodeEnv, port: config.port });

    await initializeDatabase(logger);
    logger.info('Database initialized successfully');

    eventPublisher = container.get<IEventPublisher>(TYPES.EventPublisher);
    try {
      await eventPublisher.connect();
      logger.info('Event publisher connected successfully');
    } catch (error) {
      logger.warn('Failed to connect to RabbitMQ. Continuing without event publishing', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const userEventsConsumer = container.get<IConsumer>(TYPES.UserEventsConsumer);
    consumers.push(userEventsConsumer);
    
    try {
      await userEventsConsumer.start();
      logger.info('User events consumer started successfully');
    } catch (error) {
      logger.warn('Failed to start user events consumer. Continuing without consuming events', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    server = http.createServer(app);

    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });

    server.on('error', (srvErr) => {
      logger.error('HTTP server error', srvErr as any);
      gracefulShutdown('server.error', srvErr);
    });

    server.listen(config.port, () => {
      logger.info('Server started successfully', { port: config.port });
    });

  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error(String(error)));
    try { await shutdownTracing(); } catch {}
    process.exit(1);
  }
};

startServer();