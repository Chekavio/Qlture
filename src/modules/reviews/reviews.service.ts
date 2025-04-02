import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

    const existing = await this.reviewModel.findOne({ userId, contentId });
    if (existing) throw new ConflictException('Review already exists');

    const content = await this.contentModel.findById(contentId);
    if (!content) throw new NotFoundException('Contenu introuvable');

    const review = await this.reviewModel.create({
      userId,
      contentId,
      rating,
      reviewText,
      likesCount: 0,
      commentsCount: 0,
    });

    await this.updateContentStats(contentId);
    return review;
  }

  async updateReview(userId: string, contentId: string, dto: UpdateReviewDto): Promise<Review> {
    const review = await this.reviewModel.findOne({ userId, contentId });
    if (!review) throw new NotFoundException('Review not found');

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.reviewText !== undefined) review.reviewText = dto.reviewText;

    await review.save();
    await this.updateContentStats(contentId);
    return review;
  }

  async deleteReview(userId: string, contentId: string): Promise<void> {
    const review = await this.reviewModel.findOne({ userId, contentId });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewModel.deleteOne({ _id: review._id });
    await this.cleanupService.cleanupReviewData(String(review._id));
    await this.updateContentStats(contentId);
  }

  async updateContentStats(contentId: string): Promise<void> {
    const reviews = await this.reviewModel.find({ contentId });
    const count = reviews.length;
    const avg = count === 0 ? 0 : reviews.reduce((acc, r) => acc + r.rating, 0) / count;
    const commentsCount = reviews.filter(r => r.reviewText).length;

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
    reviewText: { $exists: true, $ne: '' },
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
    rating: r.rating,
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


  
}
