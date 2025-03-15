import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ReviewCommentLike,
  ReviewCommentLikeSchema,
} from './review_comment_likes.schema';
import { ReviewCommentLikesService } from './review_comment_likes.service';
import { ReviewCommentLikesController } from './review_comment_likes.controller';
import { AuthModule } from '../../../auth/auth.module';
import { Review, ReviewSchema } from '../../reviews.schema'; // ✅ Ajouté ici
import { PrismaModule } from '../../../../prisma/prisma.module';
import { ReviewComment, ReviewCommentSchema } from '../review_comments.schema';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
        { name: ReviewComment.name, schema: ReviewCommentSchema },
        { name: ReviewCommentLike.name, schema: ReviewCommentLikeSchema }, // 👈 ajoute cette ligne
        { name: Review.name, schema: ReviewSchema }, // ✅ Ajouté ici
    ]),
    AuthModule, // ✅ Ajoute ceci
  ],
  controllers: [ReviewCommentLikesController],
  providers: [ReviewCommentLikesService],
  exports: [ReviewCommentLikesService],
})
export class ReviewCommentLikesModule {}
