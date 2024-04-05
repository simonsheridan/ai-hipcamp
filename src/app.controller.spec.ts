import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getAIResponse', () => {
    it('should return a promise', async () => {
      const mockResponse = 'finished';
      jest.spyOn(appService, 'getAIResponse').mockResolvedValue(mockResponse);
      const result = await appController.getAIResponse(
        'some sample user input',
      );
      expect(result).toBe(mockResponse);
    });
    // it('should return a promise"', () => {
    //   expect(appController.getAIResponse('some sample user input')).toBe('');
    // });
  });
});
