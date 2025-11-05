import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mysql',
  connectorPackage: 'mysql2',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT ?? '3306', 10),
  username: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASS || 'secretpassword',
  database: process.env.DATABASE_NAME || 'kongapay-payment',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  // Option 1: Disable SSL entirely if not needed
  ssl: false,
  
  // Option 2: If you need SSL in production, configure it properly
  // ssl: process.env.NODE_ENV === 'production'
  //   ? {
  //       rejectUnauthorized: false, // Set to true with proper certs in production
  //     }
  //   : false,
  
  charset: 'utf8mb4',
  timezone: '+00:00',
  extra: {
    connectionLimit: 10,
  },
}));