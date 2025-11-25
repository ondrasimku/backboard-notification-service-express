import AppDataSource from './database';
import { ILogger } from '../logging/logger.interface';

export const initializeDatabase = async (logger: ILogger): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database', error as Error);
    throw error;
  }
};

export const closeDatabase = async (logger: ILogger): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed successfully');
    }
  } catch (error) {
    logger.error('Error closing database connection', error as Error);
    throw error;
  }
};
