import { IsNotEmpty, IsString, IsObject } from 'class-validator';
import { User } from '../../schemas/user.schema';

export class AuthResponseDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsObject()
  user: {
    _id: string;
    username: string;
    email: string;
  };

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsString()
  tokenType: string;

  @IsNotEmpty()
  @IsString()
  expiresIn: number;
}

export class RefreshTokenResponseDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  tokenType: string;

  @IsNotEmpty()
  @IsString()
  expiresIn: number;
}
