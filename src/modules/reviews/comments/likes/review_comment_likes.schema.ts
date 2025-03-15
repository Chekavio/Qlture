import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'review_comment_likes', timestamps: true })
export class ReviewCommentLike extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  commentId: string;
}

export const ReviewCommentLikeSchema = SchemaFactory.createForClass(ReviewCommentLike);
ReviewCommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });
