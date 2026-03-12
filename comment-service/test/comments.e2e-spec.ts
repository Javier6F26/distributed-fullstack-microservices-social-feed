import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentsModule } from '../src/app/comments/comments.module';
import { Comment, CommentDocument } from '../src/app/schemas/comment.schema';
import { RabbitmqModule } from '../src/app/rabbitmq/rabbitmq.module';

describe('Comments API Integration Tests (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockCommentModel: Partial<Model<CommentDocument>>;

  const testUser = {
    userId: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
  };

  const mockComment: Partial<CommentDocument> = {
    _id: 'comment-test-id' as any,
    postId: 'post-123',
    userId: 'test-user-id',
    authorUsername: 'testuser',
    body: 'Test comment body',
    createdAt: new Date().toISOString(),
    deleted: false,
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    mockCommentModel = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockComment]),
      create: jest.fn().mockResolvedValue(mockComment),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommentsModule],
    })
    .overrideProvider(getModelToken(Comment.name))
    .useValue(mockCommentModel)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    jwtService = moduleFixture.get(JwtService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/comments (POST)', () => {
    it('should create a comment successfully', () => {
      const testComment = {
        postId: 'post-123',
        body: 'Integration test comment',
      };

      return request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
        .send(testComment)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.body).toBe(testComment.body);
          expect(res.body.data.postId).toBe(testComment.postId);
        });
    });

    it('should reject comment with empty body', () => {
      const invalidComment = {
        postId: 'post-123',
        body: '',
      };

      return request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
        .send(invalidComment)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.errors).toBeDefined();
        });
    });

    it('should reject comment with body > 1000 characters', () => {
      const invalidComment = {
        postId: 'post-123',
        body: 'a'.repeat(1001),
      };

      return request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
        .send(invalidComment)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.errors).toBeDefined();
        });
    });

    it('should reject comment without postId', () => {
      const invalidComment = {
        body: 'Test comment',
      };

      return request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
        .send(invalidComment)
        .expect(400);
    });

    it('should require authentication', () => {
      const testComment = {
        postId: 'post-123',
        body: 'Test comment',
      };

      return request(app.getHttpServer())
        .post('/comments')
        .send(testComment)
        .expect(401);
    });
  });

  describe('/comments/post/:postId (GET)', () => {
    it('should get recent comments for a post', () => {
      return request(app.getHttpServer())
        .get('/comments/post/post-123?limit=4')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should use default limit of 4', () => {
      return request(app.getHttpServer())
        .get('/comments/post/post-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('/comments/post/:postId/all (GET)', () => {
    it('should get all comments for a post', () => {
      return request(app.getHttpServer())
        .get('/comments/post/post-123/all')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Comment Schema Validation', () => {
    it('should enforce minlength: 1 on body', async () => {
      const invalidComment = {
        postId: 'post-123',
        userId: 'user-123',
        authorUsername: 'testuser',
        body: '',
      };

      try {
        const comment = new (app.get(getModelToken(Comment.name)))(invalidComment);
        await comment.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should enforce maxlength: 1000 on body', async () => {
      const invalidComment = {
        postId: 'post-123',
        userId: 'user-123',
        authorUsername: 'testuser',
        body: 'a'.repeat(1001),
      };

      try {
        const comment = new (app.get(getModelToken(Comment.name)))(invalidComment);
        await comment.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should require postId', async () => {
      const invalidComment = {
        userId: 'user-123',
        authorUsername: 'testuser',
        body: 'Test comment',
      };

      try {
        const comment = new (app.get(getModelToken(Comment.name)))(invalidComment);
        await comment.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should require userId', async () => {
      const invalidComment = {
        postId: 'post-123',
        authorUsername: 'testuser',
        body: 'Test comment',
      };

      try {
        const comment = new (app.get(getModelToken(Comment.name)))(invalidComment);
        await comment.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should require authorUsername', async () => {
      const invalidComment = {
        postId: 'post-123',
        userId: 'user-123',
        body: 'Test comment',
      };

      try {
        const comment = new (app.get(getModelToken(Comment.name)))(invalidComment);
        await comment.save();
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should allow up to 30 requests per minute', async () => {
      const testComment = {
        postId: 'post-123',
        body: 'Rate limit test',
      };

      // Send 30 requests (should all succeed)
      for (let i = 0; i < 30; i++) {
        await request(app.getHttpServer())
          .post('/comments')
          .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
          .send(testComment)
          .expect(201);
      }
    });

    it('should reject requests exceeding rate limit', async () => {
      const testComment = {
        postId: 'post-123',
        body: 'Rate limit exceeded test',
      };

      // Send 31 requests (last one should fail)
      for (let i = 0; i < 30; i++) {
        await request(app.getHttpServer())
          .post('/comments')
          .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
          .send(testComment);
      }

      // 31st request should be rate limited
      return request(app.getHttpServer())
        .post('/comments')
        .set('Authorization', `Bearer ${jwtService.sign(testUser)}`)
        .send(testComment)
        .expect(429);
    });
  });
});
