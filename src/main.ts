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
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');

  console.log('='.repeat(60));
  console.log('🚀 HR App Backend - Starting...');
  console.log('='.repeat(60));

  // Connect RabbitMQ microservice as hybrid app (graceful handling)
  if (rabbitmqUrl) {
    console.log(`→ RabbitMQ URL: ${rabbitmqUrl}`);
    
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'hr_app_queue',
        queueOptions: {
          durable: true,
        },
      },
    });
  } else {
    console.log('⚠ RABBITMQ_URL not configured - RabbitMQ disabled');
  }

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
  console.log('='.repeat(60));
  console.log(`✓ HTTP server: http://localhost:${port}`);
  console.log(`✓ Swagger docs: http://localhost:${port}/api`);
  console.log(`✓ WebSocket: ws://localhost:${port}/attendance`);
  console.log('='.repeat(60));
  
  // Start RabbitMQ microservice in background (non-blocking)
  if (rabbitmqUrl) {
    app.startAllMicroservices()
      .then(() => {
        console.log('✓ RabbitMQ microservice connected');
        console.log(`✓ Queue: hr_app_queue`);
        console.log('='.repeat(60));
      })
      .catch((error) => {
        console.error('✗ RabbitMQ connection failed:', error.message);
        console.log('→ Application continues without RabbitMQ');
        console.log('='.repeat(60));
      });
  } else {
    console.log('→ RabbitMQ microservice disabled');
    console.log('='.repeat(60));
  }
}
bootstrap();
