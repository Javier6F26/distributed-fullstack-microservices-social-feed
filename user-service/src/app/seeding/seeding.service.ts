import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { faker } from '@faker-js/faker';

@Injectable()
export class SeedingService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async seedUsers(count: number): Promise<User[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = {
        name: faker.person.fullName(),
        email: faker.internet.email(),
      };
      users.push(user);
    }
    return this.userModel.insertMany(users);
  }
}
