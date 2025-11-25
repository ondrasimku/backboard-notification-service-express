import 'reflect-metadata';
import express, { Router } from 'express';
import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { TYPES } from '../../src/types/di.types';
import { ILogger } from '../../src/logging/logger.interface';
import { UserRepository, IUserRepository } from '../../src/repositories/userRepository';
import { AuthService, IAuthService } from '../../src/services/authService';
import { UserService, IUserService } from '../../src/services/userService';
import { AuthController } from '../../src/controllers/authController';
import { UserController } from '../../src/controllers/userController';
import { IUserEventsPublisher } from '../../src/events/userEventsPublisher';
import { createErrorHandler } from '../../src/middlewares/errorHandler';
import { authenticateToken } from '../../src/middlewares/auth';
import { MockLogger } from './mockLogger';

export class MockEventPublisher implements IUserEventsPublisher {
  onUserRegistered = jest.fn();
  onPasswordResetRequested = jest.fn();
}

export function createTestApp(dataSource: DataSource) {
  const container = new Container();

  const mockLogger = new MockLogger();
  const mockEventPublisher = new MockEventPublisher();

  container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);
  container.bind<ILogger>(TYPES.Logger).toConstantValue(mockLogger);
  container.bind<IUserEventsPublisher>(TYPES.UserEventsPublisher).toConstantValue(mockEventPublisher);

  container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);
  container.bind<IAuthService>(TYPES.AuthService).to(AuthService);
  container.bind<IUserService>(TYPES.UserService).to(UserService);
  container.bind<AuthController>(TYPES.AuthController).to(AuthController);
  container.bind<UserController>(TYPES.UserController).to(UserController);

  const app = express();
  app.use(express.json());

  const authController = container.get<AuthController>(TYPES.AuthController);
  const userController = container.get<UserController>(TYPES.UserController);

  const authRouter = Router();
  authRouter.post('/register', authController.register);
  authRouter.post('/login', authController.login);
  authRouter.get('/verify/:token', authController.verifyEmail);
  authRouter.post('/change-password', authenticateToken, authController.changePassword);

  const userRouter = Router();
  userRouter.get('/me', authenticateToken, userController.getCurrentUser);
  userRouter.patch('/me', authenticateToken, userController.updateCurrentUserProfile);
  userRouter.get('/:id', authenticateToken, userController.getUserById);
  userRouter.get('/', authenticateToken, userController.getAllUsers);

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);

  app.use(createErrorHandler(mockLogger));

  return { app, container };
}

