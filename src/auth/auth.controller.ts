import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { FirebaseLoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { logInfo } from '@common/logging/logger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: FirebaseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.authService.loginWithIdToken(body.idToken);
    logInfo('auth.login', {
      authenticated: out.authenticated,
      needsProfile: (out as any).needsProfile ?? null,
    });

    if (out.authenticated) {
      // Cookie de session
      res.cookie('session', out.sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // 'none' si cross-site + HTTPS
        domain: process.env.COOKIE_DOMAIN || undefined,
        maxAge: out.expiresIn,
        path: '/',
      });

      const { sessionCookie, expiresIn, ...payload } = out;
      return payload;
    }

    return out; // { authenticated:false, reason:'no_email' }
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session', {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return { ok: true };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return (req as any).user;
  }
}
