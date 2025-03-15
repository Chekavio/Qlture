import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { ContentsRepository } from './contents.repository';
import { Content, ContentSchema } from './contents.schema';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
    ReviewsModule, // ✅ ici
  ],
  controllers: [ContentsController],
  providers: [ContentsService, ContentsRepository],
  exports: [ContentsService, ContentsRepository],
})
export class ContentsModule {}

