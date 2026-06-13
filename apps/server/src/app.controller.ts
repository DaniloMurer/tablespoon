import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { OidcAuthGuard } from './auth/oidc-auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @UseGuards(OidcAuthGuard)
  getHello(): string {
    return this.appService.getHello();
  }
}
