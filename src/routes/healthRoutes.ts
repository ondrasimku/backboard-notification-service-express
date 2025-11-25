import { Router } from 'express';
import container from '../config/container';
import { HealthController } from '../controllers/healthController';
import { TYPES } from '../types/di.types';

const router = Router();
const healthController = container.get<HealthController>(TYPES.HealthController);

router.get('/', healthController.getHealth);

export default router;

