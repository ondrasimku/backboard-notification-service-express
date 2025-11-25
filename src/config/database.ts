import { DataSource } from 'typeorm';
import config from './config';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  migrationsTableName: "notification_service_migrations",
  subscribers: [],
});

export default AppDataSource;

