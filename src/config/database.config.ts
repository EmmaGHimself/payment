import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from "typeorm-naming-strategies"

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mysql',
  driver: require("mysql2"),
  host: process.env.DATABASE_HOST || '127.0.0.1', // use service name if inside docker-compose
  port: parseInt(process.env.DATABASE_PORT ?? '3306', 10),
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'secretpassword', // must match MYSQL_ROOT_PASSWORD
  database: process.env.DATABASE_NAME || 'kongapay-payment',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,// process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  charset: 'utf8mb4',
  timezone: '+00:00',
  extra: {
    connectionLimit: 10,
  },
}));
