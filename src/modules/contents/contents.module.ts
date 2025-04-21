import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentsService } from './contents.service';
import { ContentsController } from './contents.controller';
import { ContentsRepository } from './contents.repository';
import { Content, ContentSchema } from './contents.schema';
import { ContentLike, ContentLikeSchema } from './content_likes.schema';
import { ReviewsModule } from '../reviews/reviews.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Content.name, schema: ContentSchema },
      { name: ContentLike.name, schema: ContentLikeSchema },
    ]),
    ReviewsModule, // ✅ ici
    AuthModule, // Pour OptionalJwtAuthGuard
  ],
  controllers: [ContentsController],
  providers: [ContentsService, ContentsRepository],
  exports: [ContentsService, ContentsRepository, MongooseModule],
})
export class ContentsModule {}
