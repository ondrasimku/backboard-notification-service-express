import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as path from 'path';

const CONTAINER_STATE_FILE = path.join(__dirname, '.testcontainer-state.json');

export default async () => {
  console.log('Starting PostgreSQL test container...');

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withPassword('testpass')
    .start();

  const connectionConfig = {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
    containerId: container.getId(),
  };

  process.env.TEST_DB_HOST = connectionConfig.host;
  process.env.TEST_DB_PORT = String(connectionConfig.port);
  process.env.TEST_DB_NAME = connectionConfig.database;
  process.env.TEST_DB_USER = connectionConfig.username;
  process.env.TEST_DB_PASSWORD = connectionConfig.password;

  fs.writeFileSync(CONTAINER_STATE_FILE, JSON.stringify(connectionConfig, null, 2));

  console.log('PostgreSQL test container started:', {
    host: connectionConfig.host,
    port: connectionConfig.port,
    database: connectionConfig.database,
  });

  (global as any).__TESTCONTAINER__ = container;
};

