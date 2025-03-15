import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './reviews.schema';
import { Content, ContentSchema } from '../contents/contents.schema';
import { ReviewLike, ReviewLikeSchema } from './likes/review_likes.schema';
import { ReviewComment, ReviewCommentSchema } from './comments/review_comments.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewLikesService } from './likes/review_likes.service';
import { ReviewLikesController } from './likes/review_likes.controller';
import { ReviewCommentsService } from './comments/review_comments.service';
import { ReviewCommentsController } from './comments/review_comments.controller';
import { ReviewCommentLike, ReviewCommentLikeSchema } from './comments/likes/review_comment_likes.schema';
import { ReviewCommentLikesService } from './comments/likes/review_comment_likes.service';
import { ReviewCommentLikesController } from './comments/likes/review_comment_likes.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReviewCleanupService } from './review_cleanup.service';
import { AuthModule } from '../auth/auth.module'; // ✅ Ajout

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Content.name, schema: ContentSchema },
      { name: ReviewLike.name, schema: ReviewLikeSchema },
      { name: ReviewComment.name, schema: ReviewCommentSchema },
      { name: ReviewCommentLike.name, schema: ReviewCommentLikeSchema },
    ]),
    PrismaModule,
    AuthModule, // ✅ Import nécessaire pour JwtAuthGuard (TokenService)
  ],
  providers: [
    ReviewsService,
    ReviewLikesService,
    ReviewCommentsService,
    ReviewCommentLikesService,
    ReviewCleanupService,
  ],
  controllers: [
    ReviewsController,
    ReviewLikesController,
    ReviewCommentsController,
    ReviewCommentLikesController,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
