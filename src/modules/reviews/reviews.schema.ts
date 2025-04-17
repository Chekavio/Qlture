import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'reviews', timestamps: true })
export class Review extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  contentId: string;

  @Prop({ required: false, min: 0.5, max: 5 })
  rating?: number;

  @Prop()
  reviewText?: string;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;

  // ✅ Déclaration explicite des timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// ✅ Index pour empêcher les doublons userId + contentId
ReviewSchema.index({ userId: 1, contentId: 1 }, { unique: true });

// ✅ Index pour la pagination et le tri des reviews par contenu
ReviewSchema.index({ contentId: 1, updatedAt: -1 });
ReviewSchema.index({ contentId: 1, rating: -1 });

// ✅ Index pour le comptage des reviews par contenu
ReviewSchema.index({ contentId: 1 });

// ✅ Index pour la recherche de review par userId (pour userReview)
ReviewSchema.index({ userId: 1 });
