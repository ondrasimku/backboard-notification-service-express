import 'reflect-metadata';
import { TEST_JWT_PRIVATE_KEY, TEST_JWT_PUBLIC_KEY } from '../helpers/testKeys';

process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY = TEST_JWT_PRIVATE_KEY;
process.env.JWT_PUBLIC_KEY = TEST_JWT_PUBLIC_KEY;

