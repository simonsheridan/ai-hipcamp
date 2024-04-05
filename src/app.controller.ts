import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // TODO validate the input
  @Post()
  getAIResponse(@Body() body: any): Promise<any> {
    return this.appService.getAIResponse(body.input);
  }
}
