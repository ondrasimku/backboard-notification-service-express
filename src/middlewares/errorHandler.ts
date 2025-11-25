import { Request, Response, NextFunction } from 'express';
import { ILogger } from '../logging/logger.interface';

export class AppError extends Error {
  public status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createErrorHandler = (logger: ILogger) => {
  return (err: AppError | Error, req: Request, res: Response, next: NextFunction) => {
    const status = 'status' in err ? err.status : 500;
    const message = err.message || 'Internal Server Error';

    const context = {
      method: req.method,
      path: req.path,
      status,
    };

    if (status >= 500) {
      logger.error('Server error', err, context);
    } else if (status >= 400) {
      logger.warn(`Client error: ${message}`, context);
    }

    res.status(status).json({ message });
  };
};
