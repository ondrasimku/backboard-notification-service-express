import { Request, Response, NextFunction } from 'express';
import type { ILogger } from '../logging/logger.interface';

export const createHttpLoggerMiddleware = (logger: ILogger) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logContext = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
      };

      const message = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

      if (res.statusCode >= 500) {
        logger.error(message, undefined, logContext);
      } else if (res.statusCode >= 400) {
        logger.warn(message, logContext);
      } else {
        logger.info(message, logContext);
      }
    });

    next();
  };
};

