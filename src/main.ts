import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  // Create HTTP application
  const app = await NestFactory.create(AppModule);

  // Connect Kafka microservice as hybrid app
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'hr-app-consumer',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9093'],
      },
      consumer: {
        groupId: 'hr-app-attendance-group',
      },
    },
  });

  // Enable validation with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Register global exception filters
  app.useGlobalFilters(new ValidationExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('HR App - Tenants Backend')
    .setDescription(
      'Multi-tenant HR application backend with authentication and tenant management',
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token',
      name: 'Authorization',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Enable persistent auth token in Swagger UI
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    },
  });

  // Enable CORS for WebSocket
  app.enableCors({
    origin: '*', // Configure based on your frontend URL
    credentials: true,
  });

  // Start all microservices
  await app.startAllMicroservices();
  console.log('✓ Kafka microservice started');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`✓ Application is running on http://localhost:${port}`);
  console.log(`✓ Swagger documentation available at http://localhost:${port}/api`);
  console.log(`✓ WebSocket server running on ws://localhost:${port}/attendance`);
  console.log(`✓ Kafka consumer group: hr-app-attendance-group`);
}
bootstrap();
