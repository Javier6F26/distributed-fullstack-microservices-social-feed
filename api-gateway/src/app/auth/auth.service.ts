import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private getUserServiceUrl(): string {
    return this.configService.get<string>('USER_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Validate user token with user-service
   */
  async validateToken(accessToken: string) {
    try {
      const userServiceUrl = this.getUserServiceUrl();
      const result = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/auth/validate`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return result.data;
    } catch (error) {
      return null;
    }
  }
}
