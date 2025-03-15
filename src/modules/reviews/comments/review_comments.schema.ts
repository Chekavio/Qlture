import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'review_comments', timestamps: true })
export class ReviewComment extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  reviewId: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: 0 })
  likesCount: number;
}

export const ReviewCommentSchema = SchemaFactory.createForClass(ReviewComment);

// ⚡ Pour requêter facilement
ReviewCommentSchema.index({ reviewId: 1, createdAt: -1 });
ReviewCommentSchema.index({ userId: 1 });
