import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './config/database.module';
import { FollowersModule } from './modules/followers/followers.module';
import { AppController } from './app.controller';
import { ContentsModule } from './modules/contents/contents.module';

@Module({
  imports: [
    DatabaseModule, // ✅ Assure-toi que ce module est bien importé !
    UsersModule,
    AuthModule,
    FollowersModule,
    ContentsModule
  ],

  controllers: [AppController], // ✅ Ajoute ici si ce n'est pas déjà fait

})
export class AppModule {}
