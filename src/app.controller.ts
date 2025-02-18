import { AppService } from './app.service';

import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  getHome(): string {
    return '🚀 Backend NestJS est bien accessible via ngrok!';
  }
}

