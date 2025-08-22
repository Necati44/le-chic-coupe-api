import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

jest.mock('@common/logging/logger', () => ({
  logInfo: jest.fn(),
}));

describe('AuthController (unit)', () => {
  let controller: AuthController;
  let authSvc: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    authSvc = {
      loginWithIdToken: jest.fn(),
    };
    controller = new AuthController(authSvc as AuthService);
  });

  it('login (existing): pose le cookie de session et retire sessionCookie/expiresIn du payload', async () => {
    authSvc.loginWithIdToken.mockResolvedValueOnce({
      authenticated: true,
      needsProfile: false,
      user: { id: 'u1', email: 'e@x', firstName: 'A', lastName: 'B' },
      sessionCookie: 'sess',
      expiresIn: 123456,
    });

    const res: any = { cookie: jest.fn() };

    const payload = await controller.login({ idToken: 'tok' } as any, res);

    expect(authSvc.loginWithIdToken).toHaveBeenCalledWith('tok');
    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'sess',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 123456,
        path: '/',
      }),
    );
    // payload ne contient plus sessionCookie / expiresIn
    expect(payload).toEqual({
      authenticated: true,
      needsProfile: false,
      user: { id: 'u1', email: 'e@x', firstName: 'A', lastName: 'B' },
    });
  });

  it('login (needsProfile): pose le cookie et renvoie payload sans les secrets', async () => {
    authSvc.loginWithIdToken.mockResolvedValueOnce({
      authenticated: true,
      needsProfile: true,
      prefill: { email: 'e@x', displayName: 'Zed', photoURL: 'p' },
      sessionCookie: 'sess2',
      expiresIn: 777,
    });

    const res: any = { cookie: jest.fn() };

    const payload = await controller.login({ idToken: 'tok2' } as any, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'sess2',
      expect.objectContaining({ maxAge: 777 }),
    );
    expect(payload).toEqual({
      authenticated: true,
      needsProfile: true,
      prefill: { email: 'e@x', displayName: 'Zed', photoURL: 'p' },
    });
  });

  it('login (no_email): ne pose pas de cookie et forward la réponse', async () => {
    authSvc.loginWithIdToken.mockResolvedValueOnce({
      authenticated: false,
      reason: 'no_email',
    });

    const res: any = { cookie: jest.fn() };
    const payload = await controller.login({ idToken: 't' } as any, res);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(payload).toEqual({ authenticated: false, reason: 'no_email' });
  });

  it('logout: clearCookie + {ok:true}', async () => {
    const res: any = { clearCookie: jest.fn() };
    const payload = await controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({ path: '/' }),
    );
    expect(payload).toEqual({ ok: true });
  });

  it('me: retourne req.user tel quel', () => {
    const req: any = { user: { uid: 'u1', email: 'e@x' } };
    const out = controller.me(req);
    expect(out).toEqual({ uid: 'u1', email: 'e@x' });
  });
});
