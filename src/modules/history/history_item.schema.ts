import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'history_items', timestamps: true })
export class HistoryItem extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  contentId: string;

  @Prop({ required: true, enum: ['movie', 'book', 'game', 'album'] })
  type: string;

  @Prop()
  consumedAt: Date;
}

export const HistoryItemSchema = SchemaFactory.createForClass(HistoryItem);

HistoryItemSchema.index({ userId: 1, contentId: 1, type: 1 }, { unique: true });
HistoryItemSchema.index({ contentId: 1, type: 1 });
