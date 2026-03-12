import {Module} from '@nestjs/common';
import {HttpModule} from '@nestjs/axios';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {PostsController} from './posts/posts.controller';
import {ConfigModule} from '@nestjs/config';
import {AuthModule} from './auth/auth.module';
import {RabbitmqModule} from './rabbitmq/rabbitmq.module';
import {CommentsModule} from './comments/comments.module';
import {ThrottlerModuleWrapper} from './throttler/throttler.module';
import {CacheModule} from "@nestjs/cache-manager";
import KeyvRedis, {Keyv} from "@keyv/redis";
import {CacheableMemory} from 'cacheable';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => {
                return {
                    stores: [
                        new Keyv({
                            store: new CacheableMemory({ttl: 60000, lruSize: 5000}),
                        }),
                        new KeyvRedis(`redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`),
                    ],
                };
            },
        }),
        HttpModule,
        ThrottlerModuleWrapper,
        AuthModule,
        RabbitmqModule,
        CommentsModule,
    ],
    controllers: [AppController, PostsController],
    providers: [AppService],
})
export class AppModule {
}
