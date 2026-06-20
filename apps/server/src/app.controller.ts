import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth-guard';
import type { Request } from 'express';
import { Token } from './auth/jwt.strategy';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected(@Req() req: Request): string {
    const user = req.user as Token;
    console.log('Authenticated user:', user);
    return 'This is a protected route';
  }
}
