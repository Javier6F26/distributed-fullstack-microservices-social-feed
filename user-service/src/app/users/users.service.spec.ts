import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from './users.service';
import { User, UserDocument } from '../schemas/user.schema';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Minimal Unit Tests for UsersService
 * 
 * These tests validate the service layer business logic with mocked dependencies.
 * All external dependencies (MongoDB via Mongoose) are mocked for fast, isolated execution.
 */

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService (Unit)', () => {
  let usersService: UsersService;
  let mockUserModel: jest.Mocked<Model<UserDocument>>;

  beforeEach(async () => {
    // Create mock model with jest.Mock functions
    mockUserModel = {
      findById: jest.fn() as any,
      findOne: jest.fn() as any,
      findByIdAndUpdate: jest.fn() as any,
      insertMany: jest.fn() as any,
    } as jest.Mocked<Model<UserDocument>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('[P0] should return user when found by id', async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId().toString(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      } as UserDocument;
      
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act
      const result = await usersService.findById(mockUser._id.toString());

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id.toString());
    });

    it('[P2] should return null when user not found', async () => {
      // Arrange
      const nonExistentId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act
      const result = await usersService.findById(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('[P0] should return user when found by email', async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId().toString(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      } as UserDocument;
      
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act
      const result = await usersService.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('[P2] should return null when email not found', async () => {
      // Arrange
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act
      const result = await usersService.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('[P0] should return user when found by username', async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId().toString(),
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      } as UserDocument;
      
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      // Act
      const result = await usersService.findByUsername('testuser');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
    });

    it('[P2] should return null when username not found', async () => {
      // Arrange
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Act
      const result = await usersService.findByUsername('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('[P0] should return user profile without password', async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId().toString(),
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
      } as UserDocument;
      
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      } as any);

      // Act
      const result = await usersService.getProfile(mockUser._id.toString());

      // Assert
      expect(result).toEqual({
        _id: mockUser._id.toString(),
        username: mockUser.username,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('[P1] should throw NotFoundException when user not found', async () => {
      // Arrange
      const nonExistentId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      // Act & Assert
      await expect(usersService.getProfile(nonExistentId))
        .rejects
        .toThrow(NotFoundException);
      
      await expect(usersService.getProfile(nonExistentId))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('[P0] should update user profile successfully', async () => {
      // Arrange
      const userId = new Types.ObjectId().toString();
      const updateData = { username: 'updateduser' };
      const updatedUser = {
        _id: userId,
        username: 'updateduser',
        email: 'test@example.com',
      } as UserDocument;
      
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedUser),
        }),
      } as any);

      // Act
      const result = await usersService.updateProfile(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      );
    });

    it('[P1] should throw NotFoundException when user not found for update', async () => {
      // Arrange
      const nonExistentId = new Types.ObjectId().toString();
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      // Act & Assert
      await expect(usersService.updateProfile(nonExistentId, { username: 'new' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('bulkCreateUsers', () => {
    it('[P0] should create users successfully', async () => {
      // Arrange
      const usersData = [
        { username: 'user1', email: 'user1@test.com', password: 'password123' },
        { username: 'user2', email: 'user2@test.com', password: 'password123' },
      ];
      
      const createdUsers = [
        { _id: new Types.ObjectId(), username: 'user1', email: 'user1@test.com', passwordHash: 'hashed' },
        { _id: new Types.ObjectId(), username: 'user2', email: 'user2@test.com', passwordHash: 'hashed' },
      ];

      // Mock findOne to return null (no duplicates)
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Mock insertMany to return created users
      mockUserModel.insertMany.mockResolvedValue(createdUsers as any);

      // Act
      const result = await usersService.bulkCreateUsers(usersData);

      // Assert
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
    });

    it('[P1] should skip duplicate emails', async () => {
      // Arrange
      const usersData = [
        { username: 'user1', email: 'existing@test.com', password: 'password123' },
      ];
      
      const existingUser = {
        _id: new Types.ObjectId(),
        username: 'existing',
        email: 'existing@test.com',
      };

      // Mock findOne to return existing user
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      } as any);

      // Act
      const result = await usersService.bulkCreateUsers(usersData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Email already exists');
      expect(mockUserModel.insertMany).not.toHaveBeenCalled();
    });

    it('[P1] should skip duplicate usernames', async () => {
      // Arrange
      const usersData = [
        { username: 'existinguser', email: 'new@test.com', password: 'password123' },
      ];
      
      const existingUser = {
        _id: new Types.ObjectId(),
        username: 'existinguser',
        email: 'existing@test.com',
      };

      // Mock findOne to return existing user
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      } as any);

      // Act
      const result = await usersService.bulkCreateUsers(usersData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Username already exists');
    });

    it('[P2] should handle insert errors gracefully', async () => {
      // Arrange
      const usersData = [
        { username: 'user1', email: 'user1@test.com', password: 'password123' },
      ];

      // Mock findOne to return null (no duplicates)
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      // Mock insertMany to throw error with writeErrors (simulating MongoDB bulk write error)
      const mockWriteError = {
        index: 0,
        errmsg: 'Duplicate key error',
      };
      mockUserModel.insertMany.mockRejectedValue({
        message: 'Bulk insert failed',
        writeErrors: [mockWriteError],
      } as any);

      // Act
      const result = await usersService.bulkCreateUsers(usersData);

      // Assert
      expect(result.created).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Duplicate key error');
    });
  });
});
