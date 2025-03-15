import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReviewCommentLike } from './likes/review_comment_likes.schema';

@Injectable()
export class CommentCleanupService {
  constructor(
    @InjectModel(ReviewCommentLike.name)
    private readonly commentLikeModel: Model<ReviewCommentLike>,
  ) {}

  async deleteLikesForComment(commentId: string) {
    await this.commentLikeModel.deleteMany({ commentId });
  }
}
