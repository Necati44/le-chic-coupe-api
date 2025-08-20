// common/filters/prisma-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Importe la classe depuis le runtime
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // Quelques mappings utiles
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint (ex: email)
        const target = (exception.meta as any)?.target;
        const label = Array.isArray(target) ? target.join(', ') : target ?? 'unique field';
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: `${label} already exists`,
          error: 'Conflict',
        });
      }
      case 'P2025': {
        // Record not found (v6 remplace NotFoundError par ce code)
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        });
      }
      case 'P2003': {
        // Foreign key constraint
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Foreign key constraint failed',
          error: 'Conflict',
        });
      }
      default: {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
      }
    }
  }
}
