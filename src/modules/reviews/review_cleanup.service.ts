import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLike } from './likes/review_likes.schema';
import { ReviewComment } from './comments/review_comments.schema';
import { ReviewCommentLike } from './comments/likes/review_comment_likes.schema';

@Injectable()
export class ReviewCleanupService {
  constructor(
    @InjectModel(ReviewLike.name) private readonly reviewLikeModel: Model<ReviewLike>,
    @InjectModel(ReviewComment.name) private readonly reviewCommentModel: Model<ReviewComment>,
    @InjectModel(ReviewCommentLike.name) private readonly reviewCommentLikeModel: Model<ReviewCommentLike>,
  ) {}

  async cleanupReviewData(reviewId: string) {
    const commentIds = await this.reviewCommentModel
      .find({ reviewId })
      .distinct('_id');

    await Promise.all([
      this.reviewLikeModel.deleteMany({ reviewId }),
      this.reviewCommentLikeModel.deleteMany({ commentId: { $in: commentIds } }),
      this.reviewCommentModel.deleteMany({ reviewId }),
    ]);
  }
}
