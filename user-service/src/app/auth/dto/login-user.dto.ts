import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({
    description: 'Email or username for login',
    example: 'john@example.com',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  identifier: string; // Can be email or username

  @ApiProperty({
    description: 'Password for login',
    example: 'SecurePass123!',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
