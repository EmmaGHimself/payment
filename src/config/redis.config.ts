import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const isTls = process.env.REDIS_TLS === 'true';

  return {
    host,
    username: process.env.REDIS_USERNAME ?? 'default',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10),

    // 👇 Use full TLS object with SNI
    tls: isTls
      ? {
          servername: host,          // 👈 required for Redis Cloud SNI
          rejectUnauthorized: false, // 👈 avoid cert issues
        }
      : undefined,
  };
});
