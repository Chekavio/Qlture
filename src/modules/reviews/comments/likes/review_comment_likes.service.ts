import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewCommentLike } from './review_comment_likes.schema';
import { ReviewComment } from '../review_comments.schema';
import { ReviewsService } from '../../reviews.service';

@Injectable()
export class ReviewCommentLikesService {
  constructor(
    @InjectModel(ReviewCommentLike.name)
    private readonly likeModel: Model<ReviewCommentLike>,
    @InjectModel(ReviewComment.name)
    private readonly commentModel: Model<ReviewComment>,
    private readonly reviewsService: ReviewsService,
  ) {}

  async toggleLike(commentId: string, userId: string): Promise<{ liked: boolean }> {
    // ✅ Vérifie que le commentaire existe
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    const existing = await this.likeModel.findOne({ commentId, userId });

    if (existing) {
      await this.likeModel.deleteOne({ _id: existing._id });
      await this.reviewsService.updateCommentLikesCount(commentId);
      return { liked: false };
    }

    await this.likeModel.create({ commentId, userId });
    await this.reviewsService.updateCommentLikesCount(commentId);
    return { liked: true };
  }

  async getLikeCount(commentId: string): Promise<number> {
    const comment = await this.commentModel.findById(commentId);
    return comment?.likesCount || 0;
  }

  async hasUserLiked(commentId: string, userId: string): Promise<boolean> {
    return !!(await this.likeModel.findOne({ commentId, userId }));
  }

  async getLikeCountsForCommentIds(commentIds: string[]): Promise<Record<string, number>> {
    const comments = await this.commentModel
      .find({ _id: { $in: commentIds } }, '_id likesCount')
      .lean();

    return Object.fromEntries(
      comments.map((comment) => [String(comment._id), comment.likesCount || 0])
    );
  }
}
