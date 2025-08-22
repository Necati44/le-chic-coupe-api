import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logInfo } from '@common/logging/logger';

const SLOW_MS = Number(process.env.DB_SLOW_MS ?? 200);

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

function createExtendedClient() {
  const base = new PrismaClient();
  return base.$extends({
    query: {
      $allModels: {
        $allOperations: async ({ model, operation, args, query }) => {
          const start = Date.now();
          const result = await query(args);
          const ms = Date.now() - start;
          if (ms >= SLOW_MS) {
            logInfo('db.slow_query', { model, action: operation, ms });
          }
          return result;
        },
      },
    },
  });
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public readonly client: ExtendedPrismaClient;

  constructor() {
    this.client = createExtendedClient();
  }

  async onModuleInit() {
    await this.client.$connect();
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
