import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description: 'Whether to remember the user session (7 days) or use session-only cookie',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
