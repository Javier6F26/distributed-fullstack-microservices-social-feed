import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Model, Document } from 'mongoose';
import { Post, PostDocument, PostSchema } from './post.schema';

describe('Post Schema', () => {
  let postModel: Model<PostDocument>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot('mongodb://localhost:27017/test-posts'),
        MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
      ],
    }).compile();

    postModel = module.get<Model<PostDocument>>(getModelToken(Post.name));
  });

  afterAll(async () => {
    await postModel.deleteMany({});
    await (postModel as any).connection.close();
  });

  beforeEach(async () => {
    await postModel.deleteMany({});
  });

  it('should create a post successfully with valid data', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'Valid Post Title',
      body: 'This is a valid post body with enough characters for testing.',
    };

    const post = new postModel(postData);
    const savedPost = await post.save();

    expect(savedPost._id).toBeDefined();
    expect(savedPost.userId).toBe(postData.userId);
    expect(savedPost.title).toBe(postData.title);
    expect(savedPost.body).toBe(postData.body);
    expect(savedPost.createdAt).toBeDefined();
    expect(savedPost.commentCount).toBe(0);
    expect(savedPost.deleted).toBe(false);
  });

  it('should fail when title is less than 5 characters', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'Short',
      body: 'This is a valid post body with enough characters.',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when title is more than 100 characters', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'a'.repeat(101),
      body: 'This is a valid post body with enough characters.',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when body is less than 10 characters', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'Valid Post Title',
      body: 'Short',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when body is more than 5000 characters', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'Valid Post Title',
      body: 'a'.repeat(5001),
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when userId is missing', async () => {
    const postData = {
      title: 'Valid Post Title',
      body: 'This is a valid post body with enough characters.',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when title is missing', async () => {
    const postData = {
      userId: 'test-user-123',
      body: 'This is a valid post body with enough characters.',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should fail when body is missing', async () => {
    const postData = {
      userId: 'test-user-123',
      title: 'Valid Post Title',
    };

    const post = new postModel(postData);
    await expect(post.save()).rejects.toThrow();
  });

  it('should have correct indexes', async () => {
    const indexes = await postModel.getIndexes();
    
    expect(indexes).toBeDefined();
    expect(indexes.find(idx => idx[0]?.createdAt)).toBeDefined(); // createdAt index
    expect(indexes.find(idx => idx[0]?.userId)).toBeDefined(); // userId index
  });
});
