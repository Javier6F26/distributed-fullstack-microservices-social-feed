import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // Can be email or username

  @IsNotEmpty()
  @IsString()
  password: string;
}
