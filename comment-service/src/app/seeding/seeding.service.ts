import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { faker } from '@faker-js/faker';

@Injectable()
export class SeedingService {
  constructor(@InjectModel(Comment.name) private commentModel: Model<CommentDocument>) {}

  async seedComments(count: number): Promise<Comment[]> {
    // In a real application, you'd want to get existing post IDs
    // For this seeding script, we'll just use random strings
    const comments = [];
    for (let i = 0; i < count; i++) {
      const comment = {
        text: faker.lorem.sentence(),
        postId: faker.string.uuid(),
      };
      comments.push(comment);
    }
    return this.commentModel.insertMany(comments);
  }
}
