import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  username: process.env.REDIS_USERNAME ?? 'default', // Redis Cloud default
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10),
  tls: process.env.REDIS_TLS === 'true', // 👈 enable TLS for cloud Redis
}));
