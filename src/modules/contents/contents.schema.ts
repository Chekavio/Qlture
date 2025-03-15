import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'contents', timestamps: true })
export class Content extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  title_vo: string;

  @Prop({ required: true, enum: ['movie', 'book', 'game', 'album'] })
  type: string;

  @Prop()
  description: string;

  @Prop()
  description_vo: string;

  @Prop()
  release_date: Date;

  @Prop([String])
  genres: string[];

  @Prop({ type: Object })
  metadata: {
    language?: string;
    publisher?: string;
    director?: string;
    actors?: string[];
    platforms?: string[];
    developers?: string[];
    modes?: string[];
    authors?: string[];
    page_count?: number;
    artist?: string;
    tracks?: string[];
    duration?: number;
  };

  @Prop({ default: 0 })
  likes_count: number;

  @Prop({ default: 0 })
  average_rating: number;

  @Prop({ default: 0 })
  reviews_count: number;

  @Prop({ default: 0 })
  comments_count: number;

  @Prop()
  image_url: string;
}

export const ContentSchema = SchemaFactory.createForClass(Content);

// 🔹 Évite les doublons : même type, même titre, même date
ContentSchema.index({ type: 1, title: 1, release_date: 1 }, { unique: true });
