import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { ConfigService } from '@nestjs/config';

// Global BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

async function bootstrap() {
  // Create HTTP application
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const broker = configService.get<string>('KAFKA_BROKER');

  console.log(broker);
  console.log('→ Attempting to connect to Kafka broker...');
  if (!broker) {
    throw new Error('KAFKA_BROKER is not defined');
  }
  // Connect Kafka microservice as hybrid app
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'hr-app-consumer',
        brokers: [broker],
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

  const port = process.env.PORT ?? 3000;
  
  // Start HTTP server first
  await app.listen(port);
  console.log(`✓ HTTP server started on http://localhost:${port}`);
  console.log(`✓ Swagger documentation available at http://localhost:${port}/api`);
  console.log(`✓ WebSocket server running on ws://localhost:${port}/attendance`);
  
  // Start Kafka microservice in background (deferred)
  app.startAllMicroservices()
    .then(() => {
      console.log('✓ Kafka microservice connected');
      console.log(`✓ Kafka consumer group: hr-app-attendance-group`);
    })
    .catch((error) => {
      console.error('✗ Failed to start Kafka microservice:', error.message);
      console.log('→ Application will continue without Kafka');
    });
}
bootstrap();
