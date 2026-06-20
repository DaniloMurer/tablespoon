import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

type LogtoTokenPayoad = {
  sub: string;
  email: string;
  roles: string[];
  scope: string;
};

export type Token = {
  userId: string;
  email: string;
  scope: string[];
};

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: process.env.OIDC_JWKS_URL ?? '',
        cache: true,
        rateLimit: true
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.OIDC_AUDIENCE ?? '',
      issuer: process.env.OIDC_ISSUER ?? '',
      algorithms: ['ES384']
    });
  }

  validate(payload: LogtoTokenPayoad): Token {
    return {
      userId: payload.sub,

      email: payload.email,

      scope: payload.scope.split(' ')
    };
  }
}
