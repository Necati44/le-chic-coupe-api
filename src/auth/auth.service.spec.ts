import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// --- Mocks firebase-admin & logger ---
const verifyIdTokenMock = jest.fn();
const createSessionCookieMock = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: verifyIdTokenMock,
    createSessionCookie: createSessionCookieMock,
  }),
}));

jest.mock('@common/logging/logger', () => ({
  logInfo: jest.fn(),
}));

describe('AuthService (unit)', () => {
  let users: jest.Mocked<UsersService>;
  let service: AuthService;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    users = {
      findByFirebaseUid: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    service = new AuthService(users);
    verifyIdTokenMock.mockReset();
    createSessionCookieMock.mockReset();
  });

  it('rejette si idToken est manquant/vidé', async () => {
    await expect(service.loginWithIdToken('')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.loginWithIdToken('  ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retourne {authenticated:false, reason:no_email} si le token n’a pas d’email', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({ uid: 'u1' }); // pas d’email

    const out = await service.loginWithIdToken('t');
    expect(verifyIdTokenMock).toHaveBeenCalledWith('t', true);
    expect(out).toEqual({ authenticated: false, reason: 'no_email' });
    expect(createSessionCookieMock).not.toHaveBeenCalled();
  });

  it('retourne needsProfile=false + user si déjà existant', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({ uid: 'u1', email: 'a@b.com', name: 'Alice', picture: 'x' });
    createSessionCookieMock.mockResolvedValueOnce('sess-cookie');
    users.findByFirebaseUid.mockResolvedValueOnce({
      id: 'db1', email: 'a@b.com', firstName: 'Alice', lastName: 'Doe',
    } as any);

    const out = await service.loginWithIdToken('t');

    expect(verifyIdTokenMock).toHaveBeenCalledWith('t', true);
    expect(createSessionCookieMock).toHaveBeenCalledWith('t', { expiresIn: 1000 * 60 * 60 * 24 * 7 });
    expect(users.findByFirebaseUid).toHaveBeenCalledWith('u1');

    expect(out.authenticated).toBe(true);
    expect((out as any).needsProfile).toBe(false);
    expect((out as any).user).toEqual({
      id: 'db1',
      email: 'a@b.com',
      firstName: 'Alice',
      lastName: 'Doe',
    });
    expect((out as any).sessionCookie).toBe('sess-cookie');
    expect((out as any).expiresIn).toBe(1000 * 60 * 60 * 24 * 7);
  });

  it('retourne needsProfile=true + prefill si inexistant', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({ uid: 'u2', email: 'z@y.com', name: 'Zed', picture: 'p' });
    createSessionCookieMock.mockResolvedValueOnce('sess2');
    users.findByFirebaseUid.mockResolvedValueOnce(null);

    const out = await service.loginWithIdToken('t2');

    expect(out.authenticated).toBe(true);
    expect((out as any).needsProfile).toBe(true);
    expect((out as any).prefill).toEqual({
      email: 'z@y.com',
      displayName: 'Zed',
      photoURL: 'p',
    });
    expect((out as any).sessionCookie).toBe('sess2');
    expect((out as any).expiresIn).toBe(1000 * 60 * 60 * 24 * 7);
  });
});
