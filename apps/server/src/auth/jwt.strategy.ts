import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

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

  validate(payload: any) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      userId: payload.sub,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      email: payload.email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      roles: payload.roles ?? []
    };
  }
}
