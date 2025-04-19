import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'content_likes', timestamps: true })
export class ContentLike extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  contentId: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ContentLikeSchema = SchemaFactory.createForClass(ContentLike);
ContentLikeSchema.index({ userId: 1, contentId: 1 }, { unique: true });
