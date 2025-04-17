import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { ReviewComment } from './review_comments.schema';
import { ReviewCommentLike } from './likes/review_comment_likes.schema';
import { PrismaService } from '../../../prisma/prisma.service';
import { Review } from '../reviews.schema';
import { ReviewsService } from '../reviews.service';

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

  async create(reviewId: string, userId: string, comment: string, parentCommentId?: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    let finalComment = comment;

    if (parentCommentId) {
      const parent = await this.commentModel.findById(parentCommentId);
      if (!parent) throw new NotFoundException('Commentaire parent introuvable');

      const parentUser = await this.prisma.user.findUnique({
        where: { id: parent.userId },
        select: { username: true },
      });

      const mention = parentUser?.username ? `@${parentUser.username} ` : '';
      finalComment = `${mention}${comment}`;
    }

    const created = await this.commentModel.create({
      reviewId,
      userId,
      comment: finalComment,
      parentCommentId: parentCommentId ?? null,
      likesCount: 0,
    });
    // MAJ compteur de commentaires sur la review
    await this.reviewsService.updateReviewCommentsCount(reviewId);
    return created;
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Commentaire introuvable');
    if (comment.userId !== userId) throw new ForbiddenException('Non autorisé');
    const reviewId = comment.reviewId;
    await this.commentModel.deleteOne({ _id: commentId });
    await this.likeModel.deleteMany({ commentId });
    // MAJ compteur de commentaires sur la review
    await this.reviewsService.updateReviewCommentsCount(reviewId);

    return { deleted: true };
  }

  async findByReview(
    reviewId: string,
    page = 1,
    limit = 10,
    sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit;
    let sortOrder: Record<string, SortOrder> = { createdAt: -1 };

    if (sort === 'date_asc') sortOrder = { createdAt: 1 };
    if (sort === 'likes_desc') sortOrder = { likesCount: -1, createdAt: 1 };

    const [rawComments, total] = await Promise.all([
      this.commentModel
        .find({ reviewId })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ reviewId }),
    ]);

    const userIds = [...new Set(rawComments.map((r) => r.userId))] as string[];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });

    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const likedCommentIds = currentUserId
      ? await this.likeModel
          .find({ commentId: { $in: rawComments.map((c) => c._id) }, userId: currentUserId })
          .distinct('commentId')
      : [];

    const likedSet = new Set(likedCommentIds.map(String));

    const enriched = rawComments.map((r) => ({
      id: r._id,
      comment: r.comment,
      createdAt: r.createdAt,
      user: usersMap[r.userId] || { id: r.userId, username: 'Utilisateur inconnu', avatar: null },
      likesCount: r.likesCount || 0,
      isLiked: likedSet.has(String(r._id)),
    }));

    return {
      data: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCommentsForReview(
    reviewId: string,
    userId?: string,
    page = 1,
    limit = 10,
    sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
  ) {
    const skip = (page - 1) * limit;

    const sortMap: Record<typeof sort, Record<string, SortOrder>> = {
      date_desc: { createdAt: -1 },
      date_asc: { createdAt: 1 },
      likes_desc: { likesCount: -1, createdAt: 1 },
    };

    const [rawComments, total] = await Promise.all([
      this.commentModel
        .find({ reviewId, parentCommentId: null })
        .sort(sortMap[sort])
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ reviewId, parentCommentId: null }),
    ]);

    const userIds = [...new Set(rawComments.map((c) => c.userId))] as string[];

    const [users, likedCommentIds] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatar: true },
      }),
      userId
        ? this.likeModel
            .find({
              userId,
              commentId: { $in: rawComments.map((c) => String(c._id)) },
            })
            .distinct('commentId')
        : [],
    ]);

    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const likedSet = new Set(likedCommentIds.map(String));

    const enriched = rawComments.map((c) => ({
      id: c._id,
      comment: c.comment,
      createdAt: c.createdAt,
      user: usersMap[c.userId] || {
        id: c.userId,
        username: 'Utilisateur inconnu',
        avatar: null,
      },
      likesCount: c.likesCount || 0,
      isLiked: likedSet.has(String(c._id)),
    }));

    return {
      data: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
