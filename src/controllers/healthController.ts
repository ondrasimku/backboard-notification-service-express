import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IHealthService } from '../services/healthService';
import { TYPES } from '../types/di.types';

@injectable()
export class HealthController {
  constructor(
    @inject(TYPES.HealthService) private healthService: IHealthService,
  ) {}

  getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await this.healthService.getHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  };
}

