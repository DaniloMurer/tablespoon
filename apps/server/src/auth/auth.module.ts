import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { LogtoStrategy } from './logto.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [PassportModule],
  providers: [LogtoStrategy],
  controllers: [AuthController],
  exports: [PassportModule]
})
export class AuthModule {}
