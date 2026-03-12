import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { faker } from '@faker-js/faker';

@Injectable()
export class SeedingService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async seedPosts(count: number): Promise<Post[]> {
    const posts = [];
    for (let i = 0; i < count; i++) {
      const post = {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(),
        author: faker.person.fullName(),
      };
      posts.push(post);
    }
    return this.postModel.insertMany(posts);
  }
}
