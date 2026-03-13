import { IsArray, IsNotEmpty, ValidateNested, IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Individual user data for bulk creation
 */
export class BulkUserDto {
  @ApiProperty({
    description: 'Username for the new account',
    example: 'johndoe',
    type: String,
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username!: string;

  @ApiProperty({
    description: 'Email address for the new account',
    example: 'john@example.com',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'Password for the new account (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    example: 'SecurePass123!',
    type: String,
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;
}

/**
 * Data Transfer Object for bulk user creation.
 * Used for seeding and batch operations.
 *
 * Validation Rules:
 * - users: required, array of 1-100 users
 * - Each user must have valid username, email, and password
 */
export class BulkCreateUsersDto {
  @ApiProperty({
    description: 'Array of users to create (max 100)',
    type: [BulkUserDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @IsNotEmpty({ message: 'Users array is required' })
  @ValidateNested({ each: true })
  @Type(() => BulkUserDto)
  users!: BulkUserDto[];
}
