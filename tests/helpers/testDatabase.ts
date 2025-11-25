import { DataSource } from 'typeorm';
import { User } from '../../src/models/user';

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: Number(process.env.TEST_DB_PORT) || 5432,
    username: process.env.TEST_DB_USER || 'testuser',
    password: process.env.TEST_DB_PASSWORD || 'testpass',
    database: process.env.TEST_DB_NAME || 'testdb',
    entities: [User],
    synchronize: true,
    logging: false,
    dropSchema: false,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
}

export async function closeTestDataSource(dataSource: DataSource): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

