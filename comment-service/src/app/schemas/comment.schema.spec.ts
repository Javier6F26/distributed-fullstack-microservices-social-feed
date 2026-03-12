import { Comment, CommentSchema } from './comment.schema';

describe('CommentSchema', () => {
  it('should be defined', () => {
    expect(CommentSchema).toBeDefined();
  });

  it('should have required fields', () => {
    const comment = new Comment();
    
    // Required fields should be defined in schema
    expect(CommentSchema.path('postId')).toBeDefined();
    expect(CommentSchema.path('userId')).toBeDefined();
    expect(CommentSchema.path('authorUsername')).toBeDefined();
    expect(CommentSchema.path('body')).toBeDefined();
    expect(CommentSchema.path('createdAt')).toBeDefined();
  });

  it('should have optional fields', () => {
    expect(CommentSchema.path('authorAvatar')).toBeDefined();
    expect(CommentSchema.path('deleted')).toBeDefined();
    expect(CommentSchema.path('deletedAt')).toBeDefined();
  });

  it('should have body validation (minlength: 1, maxlength: 1000)', () => {
    const bodyPath = CommentSchema.path('body');
    expect(bodyPath).toBeDefined();
    
    // Check validators
    const validators = (bodyPath as any).validators;
    expect(validators).toBeDefined();
    
    const minlengthValidator = validators.find((v: any) => v.type === 'minlength');
    const maxlengthValidator = validators.find((v: any) => v.type === 'maxlength');
    
    expect(minlengthValidator).toBeDefined();
    expect(minlengthValidator?.minlength).toBe(1);
    expect(maxlengthValidator).toBeDefined();
    expect(maxlengthValidator?.maxlength).toBe(1000);
  });

  it('should have indexes defined', () => {
    const indexes = CommentSchema.indexes();
    
    expect(indexes).toBeDefined();
    expect(indexes.length).toBeGreaterThan(0);
    
    // Check for postId + createdAt index
    const postIdIndex = indexes.find((idx: any) => idx[0][0] === 'postId' && idx[0][1] === -1);
    expect(postIdIndex).toBeDefined();
    
    // Check for userId + createdAt index
    const userIdIndex = indexes.find((idx: any) => idx[0][0] === 'userId' && idx[0][1] === -1);
    expect(userIdIndex).toBeDefined();
  });
});
