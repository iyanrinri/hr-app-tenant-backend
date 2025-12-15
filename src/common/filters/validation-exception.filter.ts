import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Extract validation errors
    let message = exceptionResponse.message || 'Validation failed';
    let errors = [];

    if (Array.isArray(exceptionResponse.message)) {
      errors = exceptionResponse.message;
      message = 'Validation failed';
    } else if (exceptionResponse.error === 'Bad Request' && exceptionResponse.message) {
      // Could be a single error message
      message = exceptionResponse.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
