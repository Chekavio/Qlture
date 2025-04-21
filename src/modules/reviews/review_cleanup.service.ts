import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewLike } from './likes/review_likes.schema';
import { ReviewComment } from './comments/review_comments.schema';
import { ReviewCommentLike } from './comments/likes/review_comment_likes.schema';
import { Content } from '../contents/contents.schema';

@Injectable()
export class ReviewCleanupService {
  constructor(
    @InjectModel(ReviewLike.name) private readonly reviewLikeModel: Model<ReviewLike>,
    @InjectModel(ReviewComment.name) private readonly reviewCommentModel: Model<ReviewComment>,
    @InjectModel(ReviewCommentLike.name) private readonly reviewCommentLikeModel: Model<ReviewCommentLike>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
  ) {}

  async cleanupReviewData(reviewId: string, contentId?: string) {
    // 1. Récupère tous les commentaires liés à la review
    const commentIds = await this.reviewCommentModel
      .find({ reviewId })
      .distinct('_id');

    // 2. Supprime les likes sur la review
    // 3. Supprime les likes sur les commentaires de la review
    // 4. Supprime les commentaires de la review
    await Promise.all([
      this.reviewLikeModel.deleteMany({ reviewId }),
      this.reviewCommentLikeModel.deleteMany({ commentId: { $in: commentIds } }),
      this.reviewCommentModel.deleteMany({ reviewId }),
    ]);

    // 5. Décrémente le compteur de commentaires du content pour chaque commentaire supprimé
    if (contentId && commentIds.length > 0) {
      await this.contentModel.updateOne(
        { _id: contentId },
        { $inc: { comments_count: -commentIds.length } }
      );
    }
  }
}
