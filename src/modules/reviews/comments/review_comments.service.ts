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
import { Content } from '../../contents/contents.schema';

@Injectable()
export class ReviewCommentsService {
  constructor(
    @InjectModel(ReviewComment.name)
    private readonly commentModel: Model<ReviewComment>,
    @InjectModel(ReviewCommentLike.name)
    private readonly likeModel: Model<ReviewCommentLike>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,
    @InjectModel(Content.name)
    private readonly contentModel: Model<Content>,
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async create(reviewId: string, userId: string, comment: string, replyToCommentId?: string) {
    const review = await this.reviewModel.findById(String(reviewId));
    if (!review) throw new NotFoundException('Review not found');

    let finalComment = comment;
    let replyToUserId: string | undefined = undefined;

    if (replyToCommentId) {
      const repliedComment = await this.commentModel.findById(replyToCommentId);
      if (!repliedComment) throw new NotFoundException('Commentaire cible introuvable');
      replyToUserId = repliedComment.userId;
      // Optionnel: préfixe le commentaire avec le @username (et non @id)
      const userToMention = await this.prisma.user.findUnique({ where: { id: replyToUserId }, select: { username: true } });
      const mention = userToMention && userToMention.username ? `@${userToMention.username} ` : '';
      finalComment = `${mention}${comment}`;
    }

    const created = await this.commentModel.create({
      reviewId: String(reviewId),
      userId,
      comment: finalComment,
      replyToCommentId: replyToCommentId ?? null,
      likesCount: 0,
    });

    // MAJ compteur de commentaires sur la review (+1)
    await this.reviewsService.updateReviewCommentsCount(String(reviewId));

    // MAJ compteur de commentaires sur le content (+1)
    if (review.contentId) {
      await this.contentModel.updateOne(
        { _id: review.contentId },
        { $inc: { comments_count: 1 } }
      );
    }

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
    await this.reviewsService.updateReviewCommentsCount(String(reviewId));
    // MAJ compteur de commentaires sur le content
    if (comment.reviewId) {
      // On récupère le contentId via la review
      const review = await this.reviewModel.findById(comment.reviewId);
      if (review && review.contentId) {
        await this.contentModel.updateOne(
          { _id: review.contentId },
          { $inc: { comments_count: -1 } }
        );
      }
    }
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
        .find({ reviewId: String(reviewId) })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ reviewId: String(reviewId) }),
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
    let sortOrder: Record<string, SortOrder> = { createdAt: -1 };

    if (sort === 'date_asc') sortOrder = { createdAt: 1 };
    if (sort === 'likes_desc') sortOrder = { likesCount: -1, createdAt: 1 };

    const [rawComments, total] = await Promise.all([
      this.commentModel
        .find({ reviewId: String(reviewId) })
        .sort(sortOrder)
        .lean(),
      this.commentModel.countDocuments({ reviewId: String(reviewId) }),
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
      user: usersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
      likesCount: c.likesCount || 0,
      isLiked: likedSet.has(String(c._id)),
      replyToCommentId: c.replyToCommentId || null,
    }));

    const paginatedRoots = enriched.slice(skip, skip + limit);

    return {
      data: paginatedRoots,
      total: enriched.length,
      page,
      totalPages: Math.ceil(enriched.length / limit),
    };
  }

  async getAllCommentsForReview(
    reviewId: string,
    userId?: string,
    page = 1,
    limit = 10,
    sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
  ) {
    const skip = (page - 1) * limit;
    let sortOrder: Record<string, SortOrder> = { createdAt: -1 };
    if (sort === 'date_asc') sortOrder = { createdAt: 1 };
    if (sort === 'likes_desc') sortOrder = { likesCount: -1, createdAt: 1 };
    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ reviewId: String(reviewId) })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ reviewId: String(reviewId) }),
    ]);
    const userIds = [...new Set(comments.map((r) => r.userId))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return {
      data: comments.map((c) => ({
        id: c._id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: usersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
        likesCount: c.likesCount || 0,
        isLiked: false, // à adapter selon logique
        replyToCommentId: c.replyToCommentId || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRepliesForComment(
    commentId: string,
    userId?: string,
    page = 1,
    limit = 5,
    sort: 'date_desc' | 'date_asc' | 'likes_desc' = 'date_desc',
  ) {
    const skip = (page - 1) * limit;
    let sortOrder: Record<string, SortOrder> = { createdAt: -1 };
    if (sort === 'date_asc') sortOrder = { createdAt: 1 };
    if (sort === 'likes_desc') sortOrder = { likesCount: -1, createdAt: 1 };
    const [replies, total] = await Promise.all([
      this.commentModel
        .find({ replyToCommentId: commentId })
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments({ replyToCommentId: commentId }),
    ]);
    const userIds = [...new Set(replies.map((r) => r.userId))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return {
      data: replies.map((c) => ({
        id: c._id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: usersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
        likesCount: c.likesCount || 0,
        isLiked: false, // à adapter selon logique
        replyToCommentId: c.replyToCommentId || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
