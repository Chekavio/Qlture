import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { ContentsRepository } from './contents.repository';
import { Content, ContentSchema } from './contents.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }])],
  controllers: [ContentsController],
  providers: [ContentsService, ContentsRepository],
  exports: [ContentsService, ContentsRepository], // ✅ Permet de réutiliser dans `likes` ou `reviews`
})
export class ContentsModule {}
