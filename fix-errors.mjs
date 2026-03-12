import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, searchRegex, replaceWith) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(searchRegex, replaceWith);
  fs.writeFileSync(fullPath, content);
}

const dir = 'api-gateway/src/app';

// 1. auth.controller.ts
replaceInFile(`${dir}/auth/auth.controller.ts`, /import { Controller, Post, Body, Res, Req, ForwardReference, Inject, UseGuards, Delete } from '@nestjs\/common';/, "import { Controller, Post, Body, Res, Req, UseGuards, Delete } from '@nestjs/common';");
replaceInFile(`${dir}/auth/auth.controller.ts`, /import { Response, Request } from 'express';/, "import type { Response, Request } from 'express';");
replaceInFile(`${dir}/auth/auth.controller.ts`, /private authService: AuthService,\s+/, "");
replaceInFile(`${dir}/auth/auth.controller.ts`, /@Throttle\(5, 60\)/g, "@Throttle({ default: { limit: 5, ttl: 60000 } })");
replaceInFile(`${dir}/auth/auth.controller.ts`, /@Throttle\(10, 60\)/g, "@Throttle({ default: { limit: 10, ttl: 60000 } })");
// remove unused Any types warnings by not caring since we are doing tsc --noEmit
replaceInFile(`${dir}/auth/auth.controller.ts`, /@Body\(\) registerUserDto: any/, "@Body() registerUserDto: any");

// 2. jwt-auth.guard.ts
replaceInFile(`${dir}/auth/jwt-auth.guard.ts`, /canActivate\(context: ExecutionContext\)/, "override canActivate(context: ExecutionContext)");

// 3. jwt.strategy.ts
replaceInFile(`${dir}/auth/jwt.strategy.ts`, /private readonly configService: ConfigService/, "configService: ConfigService");

// 4. comments.controller.ts
replaceInFile(`${dir}/comments/comments.controller.ts`, /@Throttle\(30, 60\)/, "@Throttle({ default: { limit: 30, ttl: 60000 } })");
replaceInFile(`${dir}/comments/comments.controller.ts`, /pending: true,\n\s*deleted: false,/, "pending: true,\n          deleted: false,\n        } as any");

// 5. http.service.ts
replaceInFile(`${dir}/http/http.service.ts`, /error\.message/g, "(error as Error).message");

// 6. logging.service.ts
replaceInFile(`${dir}/logging/logging.service.ts`, /private readonly configService: ConfigService/, "configService: ConfigService");

// 7. posts.controller.ts
replaceInFile(`${dir}/posts/posts.controller.ts`, /await this\.cacheManager\.reset\(\);/, "await this.cacheManager.clear();");
replaceInFile(`${dir}/posts/posts.controller.ts`, /@Throttle\(10, 60\)/, "@Throttle({ default: { limit: 10, ttl: 60000 } })");

// 8. rabbitmq.service.ts
replaceInFile(`${dir}/rabbitmq/rabbitmq.service.ts`, /import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs\/common';/, "import { Injectable, OnModuleInit, Logger } from '@nestjs/common';");
replaceInFile(`${dir}/rabbitmq/rabbitmq.service.ts`, /private postClient: ClientProxy;/, "private postClient!: ClientProxy;");
replaceInFile(`${dir}/rabbitmq/rabbitmq.service.ts`, /private commentClient: ClientProxy;/, "private commentClient!: ClientProxy;");
replaceInFile(`${dir}/rabbitmq/rabbitmq.service.ts`, /error\.message/g, "(error as Error).message");

// 9. throttler.guard.ts
const guardContent = `import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(context: ExecutionContext, throttlerLimitDetail: ThrottlerLimitDetail): Promise<void> {
    const retryAfter = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);
    throw new ThrottlerException(\`Too many requests. Please slow down and try again later. Retry after \${retryAfter} seconds.\`);
  }
}
`;
fs.writeFileSync(path.resolve(`${dir}/throttler/throttler.guard.ts`), guardContent);

// 10. throttler.module.ts
replaceInFile(`${dir}/throttler/throttler.module.ts`, /import \{\n  DEFAULT_TTL,\n  DEFAULT_LIMIT,\n  AUTH_TTL,\n  AUTH_LIMIT,\n  RATE_LIMIT_TTL_KEY,\n  RATE_LIMIT_MAX_KEY,\n  RATE_LIMIT_AUTH_TTL_KEY,\n  RATE_LIMIT_AUTH_MAX_KEY,\n\} from '.\/throttler.constants';/, `import {
  DEFAULT_TTL,
  DEFAULT_LIMIT,
  RATE_LIMIT_TTL_KEY,
  RATE_LIMIT_MAX_KEY,
} from './throttler.constants';`);

replaceInFile(`${dir}/throttler/throttler.module.ts`, /skipIf: \(req, res\)/, "skipIf: (context)");
replaceInFile(`${dir}/throttler/throttler.module.ts`, /return req\.url === '\/health' \|\| req\.url === '\/api\/health';/, "const req = context.switchToHttp().getRequest();\n          return req.url === '/health' || req.url === '/api/health';");

console.log("Done");
