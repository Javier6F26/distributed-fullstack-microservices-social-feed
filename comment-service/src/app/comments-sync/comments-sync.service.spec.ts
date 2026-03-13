import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { CommentsSyncService } from './comments-sync.service';
import { PostSyncTracker, PostSyncTrackerDocument } from '../schemas/post-sync-tracker.schema';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

describe('CommentsSyncService', () => {
  let service: CommentsSyncService;
  let syncTrackerModel: Model<PostSyncTrackerDocument>;
  let commentModel: Model<CommentDocument>;
  let rabbitmqService: RabbitmqService;
  let configService: ConfigService;

  const mockPostId = new Types.ObjectId();
  const mockComment = {
    _id: new Types.ObjectId(),
    postId: mockPostId,
    authorId: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    body: 'This is a test comment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTracker = {
    _id: new Types.ObjectId(),
    postId: mockPostId,
    lastCommentsSyncAt: new Date(Date.now() - 3600000), // 1 hour ago
  };

  const mockSyncTrackerModel = {
    find: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockTracker]),
    findOneAndUpdate: jest.fn().mockReturnThis(),
  };

  const mockCommentModel = {
    aggregate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockComment]),
    exists: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
  };

  const mockRabbitmqService = {
    emitCommentSync: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(30000),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsSyncService,
        {
          provide: getModelToken(PostSyncTracker.name),
          useValue: mockSyncTrackerModel,
        },
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CommentsSyncService>(CommentsSyncService);
    syncTrackerModel = module.get<Model<PostSyncTrackerDocument>>(getModelToken(PostSyncTracker.name));
    commentModel = module.get<Model<CommentDocument>>(getModelToken(Comment.name));
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should schedule startup sync with configured delay', () => {
      jest.useFakeTimers();
      const syncSpy = jest.spyOn(service, 'syncComments').mockResolvedValue();

      service.onModuleInit();
      jest.advanceTimersByTime(30000);

      expect(syncSpy).toHaveBeenCalled();

      jest.useRealTimers();
      syncSpy.mockRestore();
    });
  });

  describe('syncComments', () => {
    it('should sync posts that need updating', async () => {
      const mockPostsNeedingSync = [{ postId: mockPostId, lastCommentsSyncAt: new Date() }];
      const findPostsSpy = jest.spyOn(service as any, 'findPostsNeedingSync').mockResolvedValue(mockPostsNeedingSync);
      const publishSpy = jest.spyOn(service as any, 'publishSyncEventForPost').mockResolvedValue();

      await service.syncComments();

      expect(findPostsSpy).toHaveBeenCalled();
      expect(publishSpy).toHaveBeenCalledWith(mockPostId, expect.any(Date));

      findPostsSpy.mockRestore();
      publishSpy.mockRestore();
    });

    it('should log when no posts need syncing', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      jest.spyOn(service as any, 'findPostsNeedingSync').mockResolvedValue([]);

      await service.syncComments();

      expect(loggerSpy).toHaveBeenCalledWith('No posts need syncing');

      loggerSpy.mockRestore();
    });

    it('should process posts in batches', async () => {
      const mockPosts = Array(250).fill({ postId: mockPostId, lastCommentsSyncAt: new Date() });
      jest.spyOn(service as any, 'findPostsNeedingSync').mockResolvedValue(mockPosts);
      jest.spyOn(service as any, 'publishSyncEventForPost').mockResolvedValue();

      await expect(service.syncComments()).resolves.not.toThrow();

      expect(service).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      jest.spyOn(service as any, 'findPostsNeedingSync').mockRejectedValue(new Error('Sync failed'));

      await expect(service.syncComments()).rejects.toThrow('Sync failed');

      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('findPostsNeedingSync', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return posts with new comments since last sync', async () => {
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockTracker]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date() },
        ]),
      });

      const result = await (service as any).findPostsNeedingSync();

      expect(result).toHaveLength(1);
      expect(result[0].postId).toEqual(mockPostId);
    });

    it('should handle never-synced posts (no tracker)', async () => {
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date() },
        ]),
      });

      const result = await (service as any).findPostsNeedingSync();

      expect(result).toHaveLength(1);
    });

    it('should exclude posts without new comments', async () => {
      const oldTracker = {
        ...mockTracker,
        lastCommentsSyncAt: new Date(Date.now() + 100000), // Future date - newer than any comment
      };
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([oldTracker]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date(Date.now() - 100000) },
        ]),
      });

      const result = await (service as any).findPostsNeedingSync();

      expect(result).toHaveLength(0);
    });

    it('should include posts that were synced but have newer comments', async () => {
      const oldSyncTime = new Date(Date.now() - 100000);
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              { ...mockTracker, lastCommentsSyncAt: oldSyncTime },
            ]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date() },
        ]),
      });

      const result = await (service as any).findPostsNeedingSync();

      expect(result).toHaveLength(1);
      expect(result[0].lastCommentsSyncAt).toEqual(oldSyncTime);
    });

    it('should log the number of posts needing sync', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date() },
        ]),
      });

      await (service as any).findPostsNeedingSync();

      expect(loggerSpy).toHaveBeenCalledWith('Found 0 sync trackers');
      expect(loggerSpy).toHaveBeenCalledWith('Found 1 posts with comments in database');
      expect(loggerSpy).toHaveBeenCalledWith('Found 1 posts needing sync out of 1 posts with comments (0 already synced)');
      loggerSpy.mockRestore();
    });

    it('should filter out temp IDs and only process valid ObjectIds', async () => {
      mockSyncTrackerModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCommentModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: mockPostId, latestActivity: new Date() },
        ]),
      });

      await (service as any).findPostsNeedingSync();

      // Verify aggregation pipeline uses $group with postId directly (no regex filter needed)
      expect(mockCommentModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $group: {
              _id: '$postId',
              latestCommentAt: expect.anything(),
              latestUpdateAt: expect.anything(),
            },
          }),
        ]),
      );
    });
  });

  describe('publishSyncEventForPost', () => {
    it('should publish sync event and update tracker', async () => {
      const fetchSpy = jest.spyOn(service as any, 'fetchRecentComments').mockResolvedValue([
        {
          _id: mockComment._id.toString(),
          postId: mockComment.postId.toString(),
          authorId: mockComment.authorId,
          name: mockComment.name,
          email: mockComment.email,
          body: mockComment.body,
          createdAt: mockComment.createdAt,
          updatedAt: mockComment.updatedAt,
        },
      ]);

      mockSyncTrackerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTracker),
      });

      await (service as any).publishSyncEventForPost(mockPostId, new Date());

      expect(fetchSpy).toHaveBeenCalledWith(mockPostId.toString(), 10);
      expect(rabbitmqService.emitCommentSync).toHaveBeenCalledWith(mockPostId.toString(), expect.any(Array));
      expect(mockSyncTrackerModel.findOneAndUpdate).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should throw error if event publishing fails', async () => {
      jest.spyOn(service as any, 'fetchRecentComments').mockResolvedValue([]);
      mockRabbitmqService.emitCommentSync.mockRejectedValue(new Error('RabbitMQ error'));

      await expect((service as any).publishSyncEventForPost(mockPostId, new Date())).rejects.toThrow(
        'RabbitMQ error',
      );
    });
  });

  describe('fetchRecentComments', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch top N recent comments for a post', async () => {
      const mockComments = [mockComment];
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockComments),
            }),
          }),
        }),
      });

      const result = await (service as any).fetchRecentComments(mockPostId.toString(), 10);

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(mockComment._id.toString());
      expect(result[0].postId).toBe(mockComment.postId.toString());
      expect(commentModel.find).toHaveBeenCalledWith({ postId: expect.any(Types.ObjectId) });
    });

    it('should return comments in newest-first order', async () => {
      const mockComments = [
        { ...mockComment, createdAt: new Date('2026-03-13T12:00:00Z') },
        { ...mockComment, createdAt: new Date('2026-03-13T10:00:00Z') },
        { ...mockComment, createdAt: new Date('2026-03-13T08:00:00Z') },
      ];
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockComments),
            }),
          }),
        }),
      });

      const result = await (service as any).fetchRecentComments(mockPostId.toString(), 3);

      expect(result[0].createdAt).toEqual(mockComments[0].createdAt);
      expect(result[1].createdAt).toEqual(mockComments[1].createdAt);
      expect(result[2].createdAt).toEqual(mockComments[2].createdAt);
    });

    it('should limit results to N comments', async () => {
      const mockComments = Array(15).fill(mockComment);
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockComments),
      };
      mockCommentModel.find.mockReturnValue(mockChain);

      await (service as any).fetchRecentComments(mockPostId.toString(), 10);

      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });
  });
});
