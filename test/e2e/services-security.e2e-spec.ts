// test/e2e/services-security.e2e-spec.ts
import { Test } from '@nestjs/testing';
import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ServicesService } from '../../src/services/services.service';
import { FirebaseAuthGuard } from '../../src/auth/guards/firebase-auth.guard';
import { RolesGuard } from '../../src/auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';

function authAs(role: Role, id = 'u-test'): CanActivate {
  return {
    canActivate(ctx: ExecutionContext) {
      const req = ctx.switchToHttp().getRequest();
      req.appUser = { id, role };
      return true;
    },
  };
}

async function bootstrap(
  role: Role,
  allowRoleGuard: boolean,
): Promise<INestApplication> {
  const servicesStub = {
    create: jest.fn().mockResolvedValue({ id: 's-created' }),
  };

  const prismaStub: Partial<PrismaService> = {
    client: { $connect: jest.fn(), $disconnect: jest.fn() } as any,
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ServicesService).useValue(servicesStub)
    .overrideProvider(PrismaService).useValue(prismaStub) // ⬅️ add
    .overrideGuard(FirebaseAuthGuard).useValue(authAs(role))
    .overrideGuard(RolesGuard).useClass(RolesGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Services Security (E2E)', () => {
  it('POST /services en CUSTOMER → 403', async () => {
    const app = await bootstrap(Role.CUSTOMER, false); // guard refuse
    const server = app.getHttpServer();

    const res = await request(server)
      .post('/services')
      .send({ name: 'X', durationMin: 30, priceCents: 2500 });

    // utile si ça retombe pas à 403:
    if (res.status !== 403) {
      console.error('Body:', res.body || res.text);
    }
    expect(res.status).toBe(403);

    await app.close();
  });

  it('POST /services en OWNER → 201', async () => {
    const app = await bootstrap(Role.OWNER, true); // guard accepte
    const server = app.getHttpServer();

    const res = await request(server)
      .post('/services')
      .send({ name: 'Y', durationMin: 30, priceCents: 2500 });

    if (res.status !== 201) {
      console.error('Body:', res.body || res.text);
    }
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 's-created' });

    await app.close();
  });
});
