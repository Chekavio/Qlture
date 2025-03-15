import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewLike, ReviewLikeSchema } from './review_likes.schema';
import { Review, ReviewSchema } from '../reviews.schema'; // ✅ Ajouté ici
import { ReviewLikesService } from './review_likes.service';
import { ReviewLikesController } from './review_likes.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReviewLike.name, schema: ReviewLikeSchema },
      { name: Review.name, schema: ReviewSchema }, // ✅ Ajouté ici
    ]),
    AuthModule,
  ],
  providers: [ReviewLikesService],
  controllers: [ReviewLikesController],
  exports: [ReviewLikesService],
})
export class ReviewLikesModule {}
