import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeedingService } from './seeding.service';
import { Post, PostDocument } from '../schemas/post.schema';

describe('SeedingService', () => {
  let service: SeedingService;
  let model: Model<PostDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedingService,
        {
          provide: getModelToken(Post.name),
          useValue: {
            insertMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeedingService>(SeedingService);
    model = module.get<Model<PostDocument>>(getModelToken(Post.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedPosts', () => {
    it('should call postModel.insertMany with the correct number of posts', async () => {
      const count = 10;
      await service.seedPosts(count);
      expect(model.insertMany).toHaveBeenCalledWith(expect.any(Array));
      const posts = (model.insertMany as jest.Mock).mock.calls[0][0];
      expect(posts.length).toBe(count);
    });
  });
});
