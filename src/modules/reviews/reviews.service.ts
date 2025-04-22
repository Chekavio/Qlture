import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder } from 'mongoose';
import { Review } from './reviews.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Content } from '../contents/contents.schema';
import { ReviewLike } from './likes/review_likes.schema';
import { ReviewComment } from './comments/review_comments.schema';
import { ReviewCleanupService } from './review_cleanup.service';
import { PublicReview } from './types/review.type';
import { ReviewCommentLike } from './comments/likes/review_comment_likes.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
    @InjectModel(ReviewLike.name) private readonly reviewLikeModel: Model<ReviewLike>,
    @InjectModel(ReviewComment.name) private readonly reviewCommentModel: Model<ReviewComment>,
    @InjectModel(ReviewCommentLike.name) private readonly reviewCommentLikeModel: Model<ReviewCommentLike>,
    private readonly prisma: PrismaService,
    private readonly cleanupService: ReviewCleanupService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
    const { contentId, rating, reviewText } = dto;

    if (!reviewText || reviewText.trim() === '') {
      throw new BadRequestException('Le commentaire (reviewText) est obligatoire.');
    }

    const existing = await this.reviewModel.findOne({ userId, contentId });
    if (existing) {
      // If review exists, update it (add reviewText and/or change rating)
      const hadText = typeof existing.reviewText === 'string' && existing.reviewText.trim() !== '';
      const newText = typeof reviewText === 'string' && reviewText.trim() !== '';
      const textChanged = newText && reviewText !== existing.reviewText;
      if (rating !== undefined) existing.rating = rating;
      existing.reviewText = reviewText;
      // Ajout : si on ajoute OU modifie le texte, set reviewTextAddedAt
      if (newText && (!hadText || textChanged)) {
        existing.reviewTextAddedAt = new Date();
      }
      await existing.save();
      // Si on passe d'une rating seule à une vraie review, incrémente le compteur
      if (!hadText && newText) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { review_count: { increment: 1 } },
        });
        await this.contentModel.updateOne(
          { _id: contentId },
          { $inc: { reviews_count: 1 } }
        );
      }
      await this.updateContentStats(contentId);
      return existing;
    }

    const content = await this.contentModel.findById(contentId);
    if (!content) throw new NotFoundException('Contenu introuvable');

    const type = content.type || null;

    const review = await this.reviewModel.create({
      userId,
      contentId,
      ...(rating !== undefined ? { rating } : {}),
      reviewText,
      type,
      likesCount: 0,
      commentsCount: 0,
      reviewTextAddedAt: reviewText ? new Date() : undefined,
    });

    await this.updateContentStats(contentId);
    // Increment user review_count atomically
    await this.prisma.user.update({
      where: { id: userId },
      data: { review_count: { increment: 1 } },
    });
    return review;
  }

  async createRating(userId: string, contentId: string, rating: number): Promise<Review> {
    const existing = await this.reviewModel.findOne({ userId, contentId });
    if (existing) {
      // Update only the rating, keep comment if present
      existing.rating = rating;
      await existing.save();
      await this.updateContentStats(contentId);
      return existing;
    }

    const content = await this.contentModel.findById(contentId);
    if (!content) throw new NotFoundException('Contenu introuvable');

    const type = content.type || null;

    const review = await this.reviewModel.create({
      userId,
      contentId,
      rating,
      type,
      likesCount: 0,
      commentsCount: 0,
    });

    await this.updateContentStats(contentId);
    return review;
  }

  async updateReview(userId: string, contentId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewModel.findOne({ userId, contentId });
    if (!review) throw new NotFoundException('Review not found');

    const hadReview = review.reviewText && review.reviewText.trim() !== '';
    const willHaveReview = dto.reviewText && dto.reviewText.trim() !== '';
    const hadText = typeof review.reviewText === 'string' && review.reviewText.trim() !== '';
    const newText = typeof dto.reviewText === 'string' && dto.reviewText.trim() !== '';
    const textChanged = newText && dto.reviewText !== review.reviewText;

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.reviewText !== undefined) {
      review.reviewText = dto.reviewText;
      // Ajout logique reviewTextAddedAt :
      if (!hadText && newText) {
        // Premier ajout de texte
        review.reviewTextAddedAt = new Date();
      } else if (hadText && textChanged) {
        // Texte modifié
        review.reviewTextAddedAt = new Date();
      } else if (hadText && !newText) {
        // Texte retiré : on supprime reviewTextAddedAt
        review.reviewTextAddedAt = undefined;
      }
    }

    await review.save();
    // Si on passe d'une review à une rating seule, décrémente le compteur
    if (hadReview && !willHaveReview) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { review_count: { decrement: 1 } },
      });
      await this.contentModel.updateOne(
        { _id: contentId },
        { $inc: { reviews_count: -1 } }
      );
    }
    // Si on passe d'une rating seule à une review, incrémente le compteur
    if (!hadReview && willHaveReview) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { review_count: { increment: 1 } },
      });
      await this.contentModel.updateOne(
        { _id: contentId },
        { $inc: { reviews_count: 1 } }
      );
    }
    await this.updateContentStats(contentId);
    return review;
  }

  async deleteReview(userId: string, contentId: string): Promise<void> {
    const review = await this.reviewModel.findOne({ userId, contentId });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewModel.deleteOne({ _id: review._id });
    await this.cleanupService.cleanupReviewData(String(review._id), contentId);
    await this.updateContentStats(contentId);
    // Decrement user review_count atomically
    await this.prisma.user.update({
      where: { id: userId },
      data: { review_count: { decrement: 1 } },
    });
  }

  async updateContentStats(contentId: string): Promise<void> {
    // Ultra performant: calcule moyenne et nombre de notes côté MongoDB
    const [agg] = await this.reviewModel.aggregate([
      { $match: { contentId, rating: { $ne: undefined } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);
    const avg = agg?.avg || 0;
    const count = agg?.count || 0;

    // Compte les reviews avec commentaire côté MongoDB
    const commentsCount = await this.reviewModel.countDocuments({ contentId, reviewText: { $exists: true, $ne: '' } });

    await this.contentModel.updateOne(
      { _id: contentId },
      {
        average_rating: avg,
        reviews_count: count,
        comments_count: commentsCount,
      },
    );
  }

  async incrementReviewCommentsCount(reviewId: string, inc = 1) {
    await this.reviewModel.findByIdAndUpdate(reviewId, {
      $inc: { commentsCount: inc },
    });
  }

  async updateReviewCommentsCount(reviewId: string): Promise<void> {
    // Ultra performant: compte les commentaires directs sur la review
    const commentsCount = await this.reviewCommentModel.countDocuments({ reviewId, parentCommentId: null });
    await this.reviewModel.updateOne(
      { _id: reviewId },
      { commentsCount }
    );
  }

  async getUserReviewForContent(contentId: string, userId: string): Promise<PublicReview | null> {
    const rawReview = await this.reviewModel.findOne({
      userId,
      contentId: contentId // ou juste contentId

    }).lean();

    if (!rawReview) return null;

    const reviewIdStr = String(rawReview._id);

    const [user, reviewComments, isLiked] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, avatar: true },
      }),
      this.reviewCommentModel
        .find({ reviewId: reviewIdStr, parentCommentId: null })
        .sort({ createdAt: 1 })
        .limit(2)
        .lean(),
      this.reviewLikeModel.findOne({ reviewId: reviewIdStr, userId }),
    ]);

    // 🔍 Récupère les likes sur les commentaires de cette review
    const commentIds = reviewComments.map((c) => String(c._id));

    const likedCommentIds = commentIds.length && userId
      ? await this.reviewCommentLikeModel
          .find({ userId, commentId: { $in: commentIds } })
          .distinct('commentId')
      : [];

    const likedCommentSet = new Set(likedCommentIds.map(String));

    const commentUserIds = [...new Set(reviewComments.map((c) => c.userId))] as string[];

    const commentUsers = await this.prisma.user.findMany({
      where: { id: { in: commentUserIds } },
      select: { id: true, username: true, avatar: true },
    });

    const commentUsersMap = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

    return {
      id: rawReview._id,
      rating: rawReview.rating,
      reviewText: rawReview.reviewText || '',
      date: rawReview.updatedAt ?? rawReview.createdAt,
      user: user || { id: userId, username: 'Utilisateur inconnu', avatar: null },
      likesCount: rawReview.likesCount,
      commentsCount: rawReview.commentsCount,
      isCurrentUser: true,
      isLiked: !!isLiked,
      comments: reviewComments.map((c) => ({
        id: c._id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: commentUsersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
        likesCount: c.likesCount || 0,
        isLiked: likedCommentSet.has(String(c._id)),
      })),
    };
  }

  async getPaginatedCommentReviewsWithUser(
    contentId: string,
    page = 1,
    limit = 10,
    sort: 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc' = 'date_desc',
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit;

    const sortMap: Record<typeof sort, Record<string, SortOrder>> = {
      date_desc: { updatedAt: -1 },
      date_asc: { updatedAt: 1 },
      rating_desc: { rating: -1 },
      rating_asc: { rating: 1 },
    };

    let userReview: PublicReview | null = null;
    let userReviewId: string | null = null;

    // 🔍 DEBUG - Check current user + contentId
    console.log('[DEBUG] currentUserId:', currentUserId);
    console.log('[DEBUG] contentId:', contentId);

    const allReviews = await this.reviewModel.find({ contentId }).lean();
    console.log('[DEBUG] All reviews for content:', allReviews.map(r => ({
      userId: r.userId,
      _id: r._id.toString(),
    })));

    // 🔍 Get review de l'utilisateur connecté (épinglée)
    if (currentUserId) {
      const userReviewData = await this.reviewModel.findOne({
        userId: currentUserId,
        contentId,
      }).lean();

      if (!userReviewData) {
        console.warn('[WARN] No userReview found for', currentUserId, 'on content', contentId);
      }

      if (userReviewData) {
        userReviewId = String(userReviewData._id);

        const [user, reviewComments, isLiked] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { id: true, username: true, avatar: true },
          }),
          this.reviewCommentModel
            .find({ reviewId: userReviewId, parentCommentId: null })
            .sort({ createdAt: 1 })
            .limit(2)
            .lean(),
          this.reviewLikeModel.findOne({ reviewId: userReviewId, userId: currentUserId }),
        ]);

        const commentIds = reviewComments.map((c) => String(c._id));
        const likedCommentIds = currentUserId
          ? await this.reviewCommentLikeModel
              .find({ userId: currentUserId, commentId: { $in: commentIds } })
              .distinct('commentId')
          : [];

        const likedCommentSet = new Set(likedCommentIds.map(String));

        const commentUserIds = [...new Set(reviewComments.map((c) => c.userId))] as string[];
        const commentUsers = await this.prisma.user.findMany({
          where: { id: { in: commentUserIds } },
          select: { id: true, username: true, avatar: true },
        });
        const commentUsersMap = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

        userReview = {
          id: userReviewData._id,
          rating: userReviewData.rating,
          reviewText: userReviewData.reviewText || '',
          date: userReviewData.updatedAt ?? userReviewData.createdAt,
          user: user || { id: currentUserId, username: 'Utilisateur inconnu', avatar: null },
          likesCount: userReviewData.likesCount || 0,
          commentsCount: userReviewData.commentsCount || 0,
          isCurrentUser: true,
          isLiked: !!isLiked,
          comments: reviewComments.map((c) => ({
            id: c._id,
            comment: c.comment,
            createdAt: c.createdAt,
            user: commentUsersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
            likesCount: c.likesCount || 0,
            isLiked: likedCommentSet.has(String(c._id)),
          })),
        };
      }
    }

    // 🔎 Reviews (avec texte) sauf celle du user connecté
    const query: any = {
      contentId,
      reviewText: { $nin: ['', null] },
      ...(userReviewId ? { _id: { $ne: userReviewId } } : {}),
    };

    const [reviews, total] = await Promise.all([
      this.reviewModel.find(query).sort(sortMap[sort]).skip(skip).limit(limit).lean(),
      this.reviewModel.countDocuments(query),
    ]);

    const reviewIds = reviews.map((r) => String(r._id));
    const reviewUserIds = reviews.map((r) => r.userId);

    const [reviewUsers, commentsMap, likedReviewIds] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: reviewUserIds } },
        select: { id: true, username: true, avatar: true },
      }),
      this.reviewCommentModel.aggregate([
        { $match: { reviewId: { $in: reviewIds }, parentCommentId: null } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$reviewId',
            comments: { $push: '$$ROOT' },
          },
        },
        { $project: { comments: { $slice: ['$comments', 2] } } },
      ]),
      currentUserId
        ? this.reviewLikeModel.find({ reviewId: { $in: reviewIds }, userId: currentUserId }).distinct('reviewId')
        : [],
    ]);

    const reviewUsersMap = Object.fromEntries(reviewUsers.map((u) => [u.id, u]));
    const likedReviewSet = new Set(likedReviewIds.map(String));

    const allCommentUserIds = new Set<string>();
    const allVisibleCommentIds: string[] = [];

    commentsMap.forEach((group) => {
      group.comments.forEach((c: any) => {
        allCommentUserIds.add(c.userId);
        allVisibleCommentIds.push(String(c._id));
      });
    });

    const [commentUsers, likedCommentIds] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: [...allCommentUserIds] } },
        select: { id: true, username: true, avatar: true },
      }),
      currentUserId
        ? this.reviewCommentLikeModel.find({
            userId: currentUserId,
            commentId: { $in: allVisibleCommentIds },
          }).distinct('commentId')
        : [],
    ]);

    const likedCommentSet = new Set(likedCommentIds.map(String));
    const commentUsersMap = Object.fromEntries(commentUsers.map((u) => [u.id, u]));

    const commentMap: Record<string, any[]> = {};
    for (const group of commentsMap) {
      commentMap[group._id] = group.comments.map((c: any) => ({
        id: c._id,
        comment: c.comment,
        createdAt: c.createdAt,
        user: commentUsersMap[c.userId] || { id: c.userId, username: 'Utilisateur inconnu', avatar: null },
        likesCount: c.likesCount || 0,
        isLiked: likedCommentSet.has(String(c._id)),
      }));
    }

    const data: PublicReview[] = reviews.map((r) => ({
      id: r._id,
      rating: typeof r.rating === 'number' ? r.rating : undefined,
      reviewText: r.reviewText,
      date: r.updatedAt ?? r.createdAt,
      user: reviewUsersMap[r.userId] || { id: r.userId, username: 'Utilisateur inconnu', avatar: null },
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      isCurrentUser: String(r.userId) === currentUserId,
      isLiked: likedReviewSet.has(String(r._id)),
      comments: commentMap[String(r._id)] || [],
    }));

    return {
      userReview,
      reviews: {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Les méthodes updateReviewLikesCount et updateCommentLikesCount ne sont plus nécessaires pour le toggle atomique
  // Elles peuvent rester pour les scripts de resync, mais ne sont plus appelées dans le toggleLike
  async updateReviewLikesCount(reviewId: string): Promise<void> {
    // Ultra performant: compte les likes sur la review
    const likesCount = await this.reviewLikeModel.countDocuments({ reviewId });
    await this.reviewModel.updateOne(
      { _id: reviewId },
      { likesCount }
    );
  }

  async updateCommentLikesCount(commentId: string): Promise<void> {
    // Ultra performant: compte les likes sur le commentaire
    const likesCount = await this.reviewCommentLikeModel.countDocuments({ commentId });
    await this.reviewCommentModel.updateOne(
      { _id: commentId },
      { likesCount }
    );
  }

  // Récupérer toutes les reviews pour un utilisateur avec tri et filtres
  async getAllReviewsForUser(userId: string, sort: string = 'updatedAt', order: 'asc' | 'desc' = 'desc') {
    // Mapping des critères de tri
    const sortFields: Record<string, string> = {
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      likes: 'likesCount',
      comments: 'commentsCount',
      rating: 'rating',
    };
    const sortField = sortFields[sort] || 'updatedAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    return this.reviewModel.find({ userId, reviewText: { $exists: true, $ne: '' } }).sort({ [sortField]: sortOrder }).lean();
  }

  /**
   * Récupère les reviews des users suivis par l'utilisateur (feed), triées par plus récentes
   * @param userId id de l'utilisateur connecté
   * @param page page de pagination
   * @param limit taille de page
   */
  async getReviewsFromFollowed(userId: string, page = 1, limit = 10) {
    // 1. Récupérer la liste des IDs suivis
    const followed = await this.prisma.follower.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followed.map(f => f.followingId);
    if (!followingIds.length) {
      return { data: [], total: 0, page, totalPages: 0 };
    }
    // 2. Paginer et trier les reviews des suivis (reviews récentes, reviewText non vide)
    const query = { userId: { $in: followingIds }, reviewText: { $exists: true, $ne: '' } };
    const total = await this.reviewModel.countDocuments(query);
    const reviews = await this.reviewModel.find(query)
      .sort({ reviewTextAddedAt: -1, createdAt: -1 }) // tri sur reviewTextAddedAt desc, puis createdAt desc
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    // 3. Récupérer les infos users
    const userIds = Array.from(new Set(reviews.map(r => r.userId)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    // 4. Format minimal pour la réponse (optimisé)
    const data = reviews.map(r => ({
      id: r._id,
      contentId: r.contentId,
      reviewText: r.reviewText,
      rating: r.rating,
      reviewTextAddedAt: r.reviewTextAddedAt,
      type: r.type,
      user: usersMap[r.userId] || { id: r.userId, username: 'Utilisateur inconnu', avatar: null },
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
    }));
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
