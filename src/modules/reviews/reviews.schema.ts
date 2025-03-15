import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'reviews', timestamps: true })
export class Review extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: Types.ObjectId })
  contentId: Types.ObjectId;

  @Prop({ required: true, min: 0.5, max: 5 })
  rating: number;

  @Prop()
  reviewText?: string;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ userId: 1, contentId: 1 }, { unique: true });
