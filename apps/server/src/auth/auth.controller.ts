import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import express from 'express';
import { OidcAuthGuard } from './oidc-auth.guard';
import { LoggedInGuard } from './logged-in.guard';

@Controller('auth')
export class AuthController {
  @Get('login')
  @UseGuards(OidcAuthGuard)
  login() {
    // Passport OIDC strategy handles the redirect to Logto
  }

  @Get('callback')
  @UseGuards(LoggedInGuard)
  callback(@Req() req: express.Request, @Res() res: express.Response) {
    // Passport validates t he OIDC callback and populates req.user
    // Ensure session is saved before redirecting
    console.log('callback hit');
    console.log('req.user =', req.user);
    console.log('isAuthenticated =', req.isAuthenticated?.());
    console.log('sessionID =', req.sessionID);
    console.log('session =', req.session);
    const session = req.session;
    if (session) {
      session.save((err) => {
        if (err) {
          res.status(500).json({ message: 'Session save failed' });
          return;
        }
        res.redirect('http://localhost:4000');
      });
    } else {
      res.redirect('http://localhost:4000');
    }
  }

  @Get('profile')
  @UseGuards(LoggedInGuard)
  getProfile(@Req() req: express.Request) {
    return { user: (req as any).user };
  }

  @Get('logout')
  @UseGuards(LoggedInGuard)
  logout(@Req() req: express.Request, @Res() res: express.Response) {
    req.logout((err: any) => {
      if (err) {
        res.status(500).json({ message: 'Logout failed' });
        return;
      }
      res.redirect(
        process.env.LOGTO_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000'
      );
    });
  }
}
