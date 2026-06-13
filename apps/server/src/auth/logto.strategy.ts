import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-openidconnect';

@Injectable()
export class LogtoStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor() {
    super({
      issuer: process.env.LOGTO_ISSUER!,
      authorizationURL: process.env.LOGTO_AUTHORIZATION_ENDPOINT!,
      tokenURL: process.env.LOGTO_TOKEN_ENDPOINT!,
      userInfoURL: process.env.LOGTO_USERINFO_ENDPOINT!,
      clientID: process.env.LOGTO_CLIENT_ID!,
      clientSecret: process.env.LOGTO_CLIENT_SECRET!,
      callbackURL: process.env.LOGTO_REDIRECT_URI!,
      scope: ['openid', 'profile', 'email', 'offline_access']
    });
  }

  validate(issuer: string, profile: Profile, done: VerifyCallback): void {
    const user = {
      issuer,
      id: profile.id,
      displayName: profile.displayName,
      username: profile.username,
      emails: profile.emails ?? [],
      photos: profile.photos ?? [],
      provider: profile.provider,
      profile
    };

    done(null, user);
  }
}
