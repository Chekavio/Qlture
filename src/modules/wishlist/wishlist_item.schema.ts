import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'wishlist_items', timestamps: true })
export class WishlistItem extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  contentId: string;

  @Prop({ required: true, enum: ['movie', 'book', 'game', 'album'] })
  type: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

WishlistItemSchema.index({ userId: 1, contentId: 1, type: 1 }, { unique: true });
WishlistItemSchema.index({ contentId: 1, type: 1 });
