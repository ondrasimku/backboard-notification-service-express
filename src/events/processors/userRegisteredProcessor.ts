import { injectable, inject } from 'inversify';
import { ILogger } from '../../logging/logger.interface';
import { TYPES } from '../../types/di.types';
import { IEventProcessor } from './eventProcessor.interface';

export interface UserRegisteredData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string | Date;
}

@injectable()
export class UserRegisteredProcessor implements IEventProcessor<UserRegisteredData> {
  constructor(
    @inject(TYPES.Logger) private readonly logger: ILogger
  ) {}

  async process(data: UserRegisteredData): Promise<void> {
    this.logger.info('Processing user.registered event', {
      userId: data.userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      createdAt: data.createdAt,
    });
  }
}

