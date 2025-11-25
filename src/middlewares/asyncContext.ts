import { Request, Response, NextFunction } from 'express';
import { asyncContext, RequestContext } from '../logging/context';

export const asyncContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context: RequestContext = {
    requestId: '',
  };

  asyncContext.run(context, () => {
    next();
  });
};

