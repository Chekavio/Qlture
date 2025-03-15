import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'review_likes', timestamps: true })
export class ReviewLike extends Document {
  @Prop({ required: true })
  userId: string; // UUID (PostgreSQL)

  @Prop({ required: true })
  reviewId: string; // ObjectId as string
}

export const ReviewLikeSchema = SchemaFactory.createForClass(ReviewLike);

// 🔒 Empêche les doublons : un like par user par review
ReviewLikeSchema.index({ userId: 1, reviewId: 1 }, { unique: true });
