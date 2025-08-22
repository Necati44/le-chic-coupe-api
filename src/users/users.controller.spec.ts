import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController (unit)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findByFirebaseUid: jest.fn(),
            createFromFirebase: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
    usersService = moduleRef.get(UsersService);
  });

  it('finalize: retourne needsProfile=false si le profil existe déjà', async () => {
    usersService.findByFirebaseUid.mockResolvedValueOnce({
      id: 'u1',
      email: 'e@x',
    } as any);

    const req: any = { firebase: { uid: 'uid-1', email: 'e@x' } };
    const dto: any = { firstName: 'A', lastName: 'B' };

    const res = await controller.finalize(dto, req);

    expect(res).toEqual({
      needsProfile: false,
      user: { id: 'u1', email: 'e@x' },
    });
    expect(usersService.createFromFirebase).not.toHaveBeenCalled();
  });

  it('finalize: crée le profil si inexistant', async () => {
    usersService.findByFirebaseUid.mockResolvedValueOnce(null);
    usersService.createFromFirebase.mockResolvedValueOnce({
      id: 'u2',
      email: 'e@x',
    } as any);

    const req: any = { firebase: { uid: 'uid-2', email: 'e@x' } };
    const dto: any = { firstName: 'A', lastName: 'B' };

    const res = await controller.finalize(dto, req);

    expect(usersService.createFromFirebase).toHaveBeenCalledWith(
      'uid-2',
      'e@x',
      dto,
    );
    expect(res).toEqual({
      needsProfile: false,
      user: { id: 'u2', email: 'e@x' },
    });
  });
});
