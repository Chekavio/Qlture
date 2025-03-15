import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { ReviewComment } from './review_comments.schema';
import { ReviewCommentLike } from './likes/review_comment_likes.schema';
import { PrismaService } from '../../../prisma/prisma.service';
import { Review } from '../reviews.schema';
import { ReviewsService } from '../reviews.service';

type LeanComment = {
  _id: any;
  comment: string;
  userId: string;
  createdAt: Date;
};

@Injectable()
export class ReviewCommentsService {
  constructor(
    @InjectModel(ReviewComment.name)
    private readonly commentModel: Model<ReviewComment>,
    @InjectModel(ReviewCommentLike.name)
    private readonly likeModel: Model<ReviewCommentLike>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async create(reviewId: string, userId: string, comment: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review introuvable');

    const created = await this.commentModel.create({ reviewId, userId, comment });

    await this.reviewsService.incrementReviewCommentsCount(reviewId, 1);
    return created;
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    if (comment.userId !== userId) {
      throw new ForbiddenException('Non autorisé à supprimer ce commentaire');
    }

    await this.commentModel.deleteOne({ _id: commentId });
    await this.reviewsService.incrementReviewCommentsCount(comment.reviewId, -1);
    await this.likeModel.deleteMany({ commentId });

    return { deleted: true };
  }

  async findByReview(
    reviewId: string,
    page = 1,
    limit = 10,
    sort: 'date_desc' | 'date_asc' = 'date_desc',
    userId?: string,
  ) {
    const skip = (page - 1) * limit;
    const sortBy: Record<string, { [key: string]: SortOrder }> = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
    };

    const [rawComments, total] = await Promise.all([
      this.commentModel
        .find({ reviewId })
        .sort(sortBy[sort])
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ reviewId }),
    ]);

    const comments = rawComments as unknown as LeanComment[];
    const userIds = [...new Set(comments.map(c => c.userId))];
    const commentIds = comments.map(c => String(c._id));

    const [users, likesData, userLikedData] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatar: true },
      }),
      this.likeModel.aggregate([
        { $match: { commentId: { $in: commentIds } } },
        { $group: { _id: '$commentId', count: { $sum: 1 } } },
      ]),
      userId ? this.likeModel.find({ commentId: { $in: commentIds }, userId }).lean() : [],
    ]);

    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    const likeMap = Object.fromEntries(likesData.map(l => [l._id, l.count]));
    const likedSet = new Set(userLikedData.map(like => like.commentId));

    const enriched = comments.map(comment => ({
      id: comment._id,
      comment: comment.comment,
      createdAt: comment.createdAt,
      user: usersMap[comment.userId] || { username: 'Utilisateur inconnu', avatar: null },
      likesCount: likeMap[String(comment._id)] || 0,
      isLiked: likedSet.has(String(comment._id)),
    }));

    return {
      data: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
