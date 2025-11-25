import { injectable, inject } from 'inversify';
import { DataSource } from 'typeorm';
import { IEventPublisher } from '../events/eventPublisher';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';

type ServiceStatus = 'healthy' | 'unhealthy';

type DependencyHealth = {
  status: ServiceStatus;
  message?: string;
};

export type HealthStatus = {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  dependencies: {
    database: DependencyHealth;
    rabbitmq: DependencyHealth;
  };
};

export interface IHealthService {
  getHealth(): Promise<HealthStatus>;
}

@injectable()
export class HealthService implements IHealthService {
  constructor(
    @inject(TYPES.DataSource) private dataSource: DataSource,
    @inject(TYPES.EventPublisher) private eventPublisher: IEventPublisher,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const databaseHealth = await this.checkDatabase();
    const rabbitmqHealth = this.checkRabbitMQ();

    const overallStatus: ServiceStatus = 
      databaseHealth.status === 'healthy' && rabbitmqHealth.status === 'healthy'
        ? 'healthy'
        : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: databaseHealth,
        rabbitmq: rabbitmqHealth,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyHealth> {
    try {
      if (!this.dataSource.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Database not initialized',
        };
      }

      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkRabbitMQ(): DependencyHealth {
    try {
      const isHealthy = this.eventPublisher.isHealthy();
      
      if (!isHealthy) {
        return {
          status: 'unhealthy',
          message: 'RabbitMQ not connected',
        };
      }

      return {
        status: 'healthy',
      };
    } catch (error) {
      this.logger.error('RabbitMQ health check failed', error as Error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

