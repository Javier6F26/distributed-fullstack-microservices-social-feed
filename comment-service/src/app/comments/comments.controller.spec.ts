import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    findByPostId: jest.fn(),
    findAllByPostId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByPostId', () => {
    it('should return recent comments with default limit', async () => {
      const mockComments = [{ _id: '1', text: 'Comment 1', postId: 'post-1' }];
      mockCommentsService.findByPostId.mockResolvedValue(mockComments);

      const result = await controller.findByPostId('post-1');
      expect(result).toEqual({ success: true, data: mockComments });
      expect(service.findByPostId).toHaveBeenCalledWith('post-1', 4);
    });

    it('should return recent comments with custom limit', async () => {
      const mockComments = [{ _id: '1', text: 'Comment 1', postId: 'post-1' }];
      mockCommentsService.findByPostId.mockResolvedValue(mockComments);

      const result = await controller.findByPostId('post-1', '10');
      expect(result).toEqual({ success: true, data: mockComments });
      expect(service.findByPostId).toHaveBeenCalledWith('post-1', 10);
    });
  });

  describe('findAllByPostId', () => {
    it('should return all comments for a post', async () => {
      const mockComments = [
        { _id: '1', text: 'Comment 1', postId: 'post-1' },
        { _id: '2', text: 'Comment 2', postId: 'post-1' },
      ];
      mockCommentsService.findAllByPostId.mockResolvedValue(mockComments);

      const result = await controller.findAllByPostId('post-1');
      expect(result).toEqual({ success: true, data: mockComments });
      expect(service.findAllByPostId).toHaveBeenCalledWith('post-1');
    });
  });
});
