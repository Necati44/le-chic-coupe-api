import { Test } from '@nestjs/testing';
import { INestApplication, CanActivate } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ServicesService } from '../../src/services/services.service';
import { RolesGuard } from '../../src/auth/guards/roles.guard';

describe('Services (PUBLIC) E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const servicesStub = {
      findAll: jest.fn().mockResolvedValue({
        items: [{ id: 's1', name: 'Coupe' }],
        total: 1,
        skip: 0,
        take: 10,
      }),
      findOne: jest.fn().mockResolvedValue({ id: 's1', name: 'Coupe' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ServicesService)
      .useValue(servicesStub)
      // ✅ évite l’injection UsersService dans RolesGuard
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /services → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/services?search=coupe&skip=0&take=10')
      .expect(200);

    expect(res.body).toEqual({
      items: [{ id: 's1', name: 'Coupe' }],
      total: 1,
      skip: 0,
      take: 10,
    });
  });

  it('GET /services/:id → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/services/s1')
      .expect(200);
    expect(res.body).toEqual({ id: 's1', name: 'Coupe' });
  });
});
