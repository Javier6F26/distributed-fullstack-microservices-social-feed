import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeedingService } from './seeding.service';
import { Comment, CommentDocument } from '../schemas/comment.schema';

describe('SeedingService', () => {
  let service: SeedingService;
  let model: Model<CommentDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedingService,
        {
          provide: getModelToken(Comment.name),
          useValue: {
            insertMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeedingService>(SeedingService);
    model = module.get<Model<CommentDocument>>(getModelToken(Comment.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedComments', () => {
    it('should call commentModel.insertMany with the correct number of comments', async () => {
      const count = 10;
      await service.seedComments(count);
      expect(model.insertMany).toHaveBeenCalledWith(expect.any(Array));
      const comments = (model.insertMany as jest.Mock).mock.calls[0][0];
      expect(comments.length).toBe(count);
    });
  });
});
