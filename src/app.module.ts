import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FollowersModule } from './modules/followers/followers.module';
import { AppController } from './app.controller';
import { ContentsModule } from './modules/contents/contents.module';
import { ReviewsModule } from './modules/reviews/reviews.module'; // 👈 ajouter cette ligne
import configuration from './config/configuration';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    FollowersModule,
    ContentsModule,
    ReviewsModule, // 👈 ajoute le module ici
  ],
  controllers: [AppController],
})
export class AppModule {}
