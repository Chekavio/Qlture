import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLike } from './review_likes.schema';
import { Review } from '../reviews.schema';

@Injectable()
export class ReviewLikesService {
  constructor(
    @InjectModel(ReviewLike.name)
    private readonly likeModel: Model<ReviewLike>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,
  ) {}

  async toggleLike(reviewId: string, userId: string): Promise<{ liked: boolean }> {
    // ✅ Vérifie que la review existe
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review introuvable');

    const existing = await this.likeModel.findOne({ reviewId, userId });

    if (existing) {
      await this.likeModel.deleteOne({ _id: existing._id });
      await this.reviewModel.findByIdAndUpdate(reviewId, {
        $inc: { likesCount: -1 },
      });
      return { liked: false };
    }

    await this.likeModel.create({ reviewId, userId });
    await this.reviewModel.findByIdAndUpdate(reviewId, {
      $inc: { likesCount: 1 },
    });

    return { liked: true };
  }

  async getLikeCount(reviewId: string): Promise<number> {
    const review = await this.reviewModel.findById(reviewId);
    return review?.likesCount || 0;
  }

  async hasUserLiked(reviewId: string, userId: string): Promise<boolean> {
    return !!(await this.likeModel.findOne({ reviewId, userId }));
  }

  async getLikeCountsForReviewIds(reviewIds: string[]): Promise<Record<string, number>> {
    const reviews = await this.reviewModel
      .find({ _id: { $in: reviewIds } }, '_id likesCount')
      .lean();

    return Object.fromEntries(
      reviews.map((r) => [String(r._id), r.likesCount || 0])
    );
  }
}
