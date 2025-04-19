import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'review_comments', timestamps: true })
export class ReviewComment extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  reviewId: string;

  @Prop({ type: String, default: null }) // ✅ null explicite pour éviter CastError
  parentCommentId?: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  repliesCount: number;

  @Prop() createdAt: Date; // ✅ utile si tu veux les typings corrects
  @Prop() updatedAt: Date;
}

export const ReviewCommentSchema = SchemaFactory.createForClass(ReviewComment);

// ✅ Indexes pour performances
ReviewCommentSchema.index({ reviewId: 1, createdAt: -1 });
ReviewCommentSchema.index({ userId: 1 });
ReviewCommentSchema.index({ parentCommentId: 1, createdAt: 1 });
