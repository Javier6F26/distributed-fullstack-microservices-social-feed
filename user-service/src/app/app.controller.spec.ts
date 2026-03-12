import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { AppController } from './app.controller';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: getConnectionToken(),
          useValue: { readyState: 1 },
        },
      ],
    }).compile();
  });

  describe('healthCheck', () => {
    it('should return { status: "ok", database: "connected" }', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.healthCheck()).toEqual({ status: 'ok', database: 'connected' });
    });
  });
});
