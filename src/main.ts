// src/main.ts
// APM must be started before any other imports
const apm = require('elastic-apm-node');

apm.start({
  // Override service name from package.json
  serviceName: process.env.APM_SERVICE_NAME || 'payment-service-v2',
  serverUrl: process.env.APM_SERVER_URL || 'https://apm.konga.com',
  environment: process.env.APM_SERVICE_ENVIRONMENT || process.env.NODE_ENV || 'production',
  active: false, //process.env.ELASTIC_APM_ACTIVE !== 'false',
  logLevel: 'info',
  captureBody: 'all',
  captureHeaders: true,
  captureErrorLogStackTraces: 'always',
  centralConfig: false,
  metricsInterval: '30s',
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // CORS
  app.enableCors({
    origin: configService.get<string[]>('ALLOWED_ORIGINS', ['*']),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('KongaPay Payment API')
    .setDescription('KongaPay Payment Gateway API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
