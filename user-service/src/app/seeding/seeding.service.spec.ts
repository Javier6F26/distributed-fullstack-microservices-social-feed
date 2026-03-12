import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeedingService } from './seeding.service';
import { User, UserDocument } from '../schemas/user.schema';

describe('SeedingService', () => {
  let service: SeedingService;
  let model: Model<UserDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedingService,
        {
          provide: getModelToken(User.name),
          useValue: {
            insertMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeedingService>(SeedingService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedUsers', () => {
    it('should call userModel.insertMany with the correct number of users', async () => {
      const count = 10;
      await service.seedUsers(count);
      expect(model.insertMany).toHaveBeenCalledWith(expect.any(Array));
      const users = (model.insertMany as jest.Mock).mock.calls[0][0];
      expect(users.length).toBe(count);
    });
  });
});
