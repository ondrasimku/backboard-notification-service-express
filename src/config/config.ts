import dotenv from 'dotenv';

dotenv.config({ debug: false });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres';
  logging: boolean;
}

interface RabbitMQConfig {
  url: string;
  vhost: string;
  exchange: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface AuthConfig {
  jwksUrl: string;
  issuer: string;
  audience: string;
  jwksCacheTtl: number;
}

interface Config {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  rabbitmq: RabbitMQConfig;
  smtp: SmtpConfig;
  resetPasswordBaseUrl: string;
  emailVerificationBaseUrl: string;
  auth: AuthConfig;
}

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'notificationservice',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://backboard:backboardpass@backboard-rabbitmq:5672',
    vhost: process.env.RABBITMQ_VHOST || '/',
    exchange: process.env.RABBITMQ_EXCHANGE || 'user.events',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
  },
  resetPasswordBaseUrl: process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000',
  emailVerificationBaseUrl: process.env.EMAIL_VERIFICATION_BASE_URL || process.env.RESET_PASSWORD_BASE_URL || 'http://localhost:3000',
  auth: {
    jwksUrl: process.env.AUTH_JWKS_URL || 'http://user-service:3000/.well-known/jwks.json',
    issuer: process.env.AUTH_ISSUER || 'http://user-service:3000',
    audience: process.env.AUTH_AUDIENCE || 'backboard',
    jwksCacheTtl: Number(process.env.AUTH_JWKS_CACHE_TTL) || 15 * 60 * 1000, // 15 minutes
  },
};

export default config;