import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewCommentsController } from './review_comments.controller';
import { ReviewCommentsService } from './review_comments.service';
import { ReviewComment, ReviewCommentSchema } from './review_comments.schema';
import { ReviewCommentLike, ReviewCommentLikeSchema } from './likes/review_comment_likes.schema';
import { CommentCleanupService } from './comment_cleanup.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewComment.name, schema: ReviewCommentSchema },
      { name: ReviewCommentLike.name, schema: ReviewCommentLikeSchema },
    ]),
    PrismaModule,
  ],
  controllers: [ReviewCommentsController],
  providers: [ReviewCommentsService, CommentCleanupService],
  exports: [ReviewCommentsService],
})
export class ReviewCommentsModule {}
