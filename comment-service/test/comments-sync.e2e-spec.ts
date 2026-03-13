import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { CommentsSyncModule } from '../src/app/comments-sync/comments-sync.module';
import { CommentsSyncService } from '../src/app/comments-sync/comments-sync.service';
import { PostSyncTracker, PostSyncTrackerDocument } from '../src/app/schemas/post-sync-tracker.schema';
import { Comment, CommentDocument } from '../src/app/schemas/comment.schema';
import { RabbitmqService } from '../src/app/rabbitmq/rabbitmq.service';

describe('Comments Sync E2E Tests', () => {
  let app: INestApplication;
  let syncService: CommentsSyncService;
  let syncTrackerModel: Model<PostSyncTrackerDocument>;
  let commentModel: Model<CommentDocument>;
  let mockRabbitmqService: Partial<RabbitmqService>;

  const testPostId = new Types.ObjectId();
  const testAuthorId = 'test-user-123';

  const mockComments = [
    {
      _id: new Types.ObjectId(),
      postId: testPostId,
      authorId: testAuthorId,
      name: 'Test User 1',
      email: 'test1@example.com',
      body: 'Comment 1',
      createdAt: new Date(Date.now() - 10000), // 10 seconds ago
    },
    {
      _id: new Types.ObjectId(),
      postId: testPostId,
      authorId: testAuthorId,
      name: 'Test User 2',
      email: 'test2@example.com',
      body: 'Comment 2',
      createdAt: new Date(Date.now() - 20000), // 20 seconds ago
    },
    {
      _id: new Types.ObjectId(),
      postId: testPostId,
      authorId: testAuthorId,
      name: 'Test User 3',
      email: 'test3@example.com',
      body: 'Comment 3',
      createdAt: new Date(Date.now() - 30000), // 30 seconds ago
    },
  ];

  beforeAll(async () => {
    mockRabbitmqService = {
      emitCommentSync: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CommentsSyncModule,
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot('mongodb://localhost:27017/test-comments-sync'),
      ],
    })
      .overrideProvider(RabbitmqService)
      .useValue(mockRabbitmqService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    syncService = app.get<CommentsSyncService>(CommentsSyncService);
    syncTrackerModel = app.get<Model<PostSyncTrackerDocument>>(getModelToken(PostSyncTracker.name));
    commentModel = app.get<Model<CommentDocument>>(getModelToken(Comment.name));
  });

  afterAll(async () => {
    await syncTrackerModel.deleteMany({});
    await commentModel.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await syncTrackerModel.deleteMany({});
    await commentModel.deleteMany({});
  });

  describe('CommentsSyncService', () => {
    it('should be defined', () => {
      expect(syncService).toBeDefined();
    });

    it('should find posts needing sync when no trackers exist', async () => {
      // Insert test comments
      await commentModel.insertMany(mockComments);

      const postsNeedingSync = await (syncService as any).findPostsNeedingSync();

      expect(postsNeedingSync).toHaveLength(1);
      expect(postsNeedingSync[0].postId.toString()).toBe(testPostId.toString());
    });

    it('should not find posts needing sync when no new comments exist', async () => {
      // Insert test comments
      await commentModel.insertMany(mockComments);

      // Create tracker with current timestamp (all comments are older)
      await syncTrackerModel.create({
        postId: testPostId,
        lastCommentsSyncAt: new Date(),
      });

      const postsNeedingSync = await (syncService as any).findPostsNeedingSync();

      expect(postsNeedingSync).toHaveLength(0);
    });

    it('should find posts with comments newer than last sync', async () => {
      // Insert test comments
      await commentModel.insertMany(mockComments);

      // Create tracker with old timestamp
      const oldSyncTime = new Date(Date.now() - 60000); // 1 minute ago
      await syncTrackerModel.create({
        postId: testPostId,
        lastCommentsSyncAt: oldSyncTime,
      });

      const postsNeedingSync = await (syncService as any).findPostsNeedingSync();

      expect(postsNeedingSync).toHaveLength(1);
    });

    it('should fetch recent comments in correct order', async () => {
      await commentModel.insertMany(mockComments);

      const recentComments = await (syncService as any).fetchRecentComments(testPostId.toString(), 10);

      expect(recentComments).toHaveLength(3);
      expect(recentComments[0].body).toBe('Comment 1'); // Newest first
      expect(recentComments[1].body).toBe('Comment 2');
      expect(recentComments[2].body).toBe('Comment 3');
    });

    it('should limit fetched comments to N', async () => {
      const manyComments = mockComments.map((c, i) => ({
        ...c,
        _id: new Types.ObjectId(),
        body: `Comment ${i}`,
        createdAt: new Date(Date.now() - i * 1000),
      }));
      await commentModel.insertMany(manyComments.slice(0, 15));

      const recentComments = await (syncService as any).fetchRecentComments(testPostId.toString(), 10);

      expect(recentComments).toHaveLength(10);
    });

    it('should publish sync event and update tracker for a post', async () => {
      await commentModel.insertMany(mockComments);

      await (syncService as any).publishSyncEventForPost(testPostId, undefined);

      expect(mockRabbitmqService.emitCommentSync).toHaveBeenCalledWith(
        testPostId.toString(),
        expect.arrayContaining([
          expect.objectContaining({
            postId: testPostId.toString(),
            body: expect.any(String),
          }),
        ]),
      );

      const tracker = await syncTrackerModel.findOne({ postId: testPostId });
      expect(tracker).toBeDefined();
      expect(tracker?.lastCommentsSyncAt).toBeDefined();
    });

    it('should sync multiple posts in batch', async () => {
      const post2Id = new Types.ObjectId();
      const post3Id = new Types.ObjectId();

      const allComments = [
        ...mockComments,
        {
          ...mockComments[0],
          _id: new Types.ObjectId(),
          postId: post2Id,
          body: 'Post 2 Comment',
        },
        {
          ...mockComments[0],
          _id: new Types.ObjectId(),
          postId: post3Id,
          body: 'Post 3 Comment',
        },
      ];

      await commentModel.insertMany(allComments);

      await syncService.syncComments();

      expect(mockRabbitmqService.emitCommentSync).toHaveBeenCalledTimes(3);

      const trackers = await syncTrackerModel.find();
      expect(trackers).toHaveLength(3);
    });

    it('should handle empty comments collection gracefully', async () => {
      const postsNeedingSync = await (syncService as any).findPostsNeedingSync();

      expect(postsNeedingSync).toHaveLength(0);
    });

    it('should update existing tracker on sync', async () => {
      await commentModel.insertMany(mockComments);

      const oldTime = new Date(Date.now() - 120000); // 2 minutes ago
      await syncTrackerModel.create({
        postId: testPostId,
        lastCommentsSyncAt: oldTime,
      });

      await (syncService as any).publishSyncEventForPost(testPostId, oldTime);

      const tracker = await syncTrackerModel.findOne({ postId: testPostId });
      expect(tracker?.lastCommentsSyncAt?.getTime()).toBeGreaterThan(oldTime.getTime());
    });
  });

  describe('Sync Cron Job', () => {
    it('should have syncComments method defined', () => {
      expect(syncService.syncComments).toBeDefined();
      expect(typeof syncService.syncComments).toBe('function');
    });

    it('should complete sync without errors when no posts need syncing', async () => {
      await expect(syncService.syncComments()).resolves.not.toThrow();
    });

    it('should sync posts with new comments', async () => {
      await commentModel.insertMany(mockComments);

      await expect(syncService.syncComments()).resolves.not.toThrow();

      expect(mockRabbitmqService.emitCommentSync).toHaveBeenCalled();

      const trackers = await syncTrackerModel.find();
      expect(trackers.length).toBeGreaterThan(0);
    });
  });

  describe('PostSyncTracker Schema', () => {
    it('should create tracker with postId and lastCommentsSyncAt', async () => {
      const tracker = await syncTrackerModel.create({
        postId: testPostId,
        lastCommentsSyncAt: new Date(),
      });

      expect(tracker._id).toBeDefined();
      expect(tracker.postId.toString()).toBe(testPostId.toString());
      expect(tracker.lastCommentsSyncAt).toBeDefined();
    });

    it('should enforce unique postId', async () => {
      await syncTrackerModel.create({
        postId: testPostId,
        lastCommentsSyncAt: new Date(),
      });

      await expect(
        syncTrackerModel.create({
          postId: testPostId,
          lastCommentsSyncAt: new Date(),
        }),
      ).rejects.toThrow();
    });

    it('should allow optional lastCommentsSyncAt', async () => {
      const tracker = await syncTrackerModel.create({
        postId: new Types.ObjectId(),
      });

      expect(tracker.lastCommentsSyncAt).toBeUndefined();
    });
  });
});
