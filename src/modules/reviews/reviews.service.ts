import {
    Injectable,
    ConflictException,
    NotFoundException,
  } from '@nestjs/common';
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
  
  type LeanReview = {
    _id: any;
    rating: number;
    reviewText?: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    likesCount: number;
    commentsCount: number;
  };
  
  @Injectable()
  export class ReviewsService {
    constructor(
      @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
      @InjectModel(Content.name) private readonly contentModel: Model<Content>,
      @InjectModel(ReviewLike.name) private readonly reviewLikeModel: Model<ReviewLike>,
      @InjectModel(ReviewComment.name) private readonly reviewCommentModel: Model<ReviewComment>,
      private readonly prisma: PrismaService,
      private readonly cleanupService: ReviewCleanupService,
    ) {}
  
    async createReview(userId: string, dto: CreateReviewDto): Promise<Review> {
      const { contentId, rating, reviewText } = dto;
  
      const contentExists = await this.contentModel.exists({ _id: contentId });
      if (!contentExists) throw new NotFoundException('Contenu introuvable');
  
      const existing = await this.reviewModel.findOne({ userId, contentId });
      if (existing) throw new ConflictException('Review already exists');
  
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
      const contentExists = await this.contentModel.exists({ _id: contentId });
      if (!contentExists) throw new NotFoundException('Contenu introuvable');
  
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
      const commentsCount = reviews.reduce((acc, r) => acc + (r.commentsCount || 0), 0);
  
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
  
    async getUserReviewForContent(contentId: string, userId: string) {
      const rawReview = await this.reviewModel.findOne({ contentId, userId }).lean();
      if (!rawReview) return null;
  
      const review = rawReview as unknown as LeanReview;
  
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, avatar: true },
      });
  
      return {
        id: review._id,
        rating: review.rating,
        reviewText: review.reviewText,
        date: review.updatedAt ?? review.createdAt,
        user: user || { username: 'Utilisateur inconnu', avatar: null },
        likesCount: review.likesCount,
        commentsCount: review.commentsCount,
        isCurrentUser: true,
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
  
      const sortMap: Record<string, { [key: string]: SortOrder }> = {
        date_desc: { updatedAt: -1 },
        date_asc: { updatedAt: 1 },
        rating_desc: { rating: -1 },
        rating_asc: { rating: 1 },
      };
  
      const baseQuery = { contentId, reviewText: { $exists: true, $ne: '' } };
      const [rawReviews, total] = await Promise.all([
        this.reviewModel.find(baseQuery).sort(sortMap[sort]).skip(skip).limit(limit).lean(),
        this.reviewModel.countDocuments(baseQuery),
      ]);
  
      const reviews = rawReviews as unknown as LeanReview[];
      const userIds = [...new Set(reviews.map(r => r.userId))];
      const reviewIds = reviews.map(r => String(r._id));
  
      let userReview: LeanReview | null = null;
  
      if (currentUserId) {
        const rawUserReview = await this.reviewModel.findOne({
          contentId,
          userId: currentUserId,
          reviewText: { $exists: true, $ne: '' },
        }).lean();
  
        if (rawUserReview) {
          userReview = rawUserReview as unknown as LeanReview;
  
          if (!reviews.some(r => r.userId === currentUserId)) {
            reviews.unshift(userReview);
            userIds.push(currentUserId);
            reviewIds.unshift(String(userReview._id));
          }
        }
      }
  
      const [users, initialCommentsMap] = await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, avatar: true },
        }),
        this.reviewCommentModel.aggregate([
          { $match: { reviewId: { $in: reviewIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$reviewId',
              comments: { $push: '$$ROOT' },
            },
          },
          {
            $project: {
              comments: { $slice: ['$comments', 2] },
            },
          },
        ]),
      ]);
  
      const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
      const commentsMap = Object.fromEntries(initialCommentsMap.map(e => [e._id, e.comments]));
  
      const enriched = reviews.map(review => ({
        id: review._id,
        rating: review.rating,
        reviewText: review.reviewText,
        date: review.updatedAt ?? review.createdAt,
        user: usersMap[review.userId] || { username: 'Utilisateur inconnu', avatar: null },
        likesCount: review.likesCount,
        commentsCount: review.commentsCount,
        isCurrentUser: review.userId === currentUserId,
        comments: commentsMap[String(review._id)] || [],
      }));
  
      return {
        data: enriched,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }
  }
  