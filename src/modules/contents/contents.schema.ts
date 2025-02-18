import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'contents', timestamps: true })
export class Content extends Document {
  @Prop({ required: true })
  title: string; // 🔹 Titre en anglais (par défaut)

  @Prop({ required: true })
  title_vo: string; // 🔹 Titre en version originale

  @Prop({ required: true, enum: ['movie', 'book', 'game', 'album'] })
  type: string;

  @Prop()
  description: string; // 🔹 Description en anglais (par défaut)

  @Prop()
  description_vo: string; // 🔹 Description en version originale

  @Prop()
  release_date: Date;

  @Prop([String])
  genres: string[];

  @Prop({ type: Object })
  metadata: {
    language?: string; // 🔹 Langue du contenu (ex: en, fr, es)
    publisher?: string; // 🔹 Maison d'édition (livre, jeu)

    // 🔹 Pour les films
    director?: string;
    actors?: string[]; // **🔹 Contiendra TOUS les acteurs**

    // 🔹 Pour les jeux vidéo
    platforms?: string[];
    developers?: string[];
    modes?: string[];

    // 🔹 Pour les livres
    authors?: string[];
    page_count?: number;

    // 🔹 Pour les albums
    artist?: string;
    tracks?: string[];
    duration?: number; // en secondes
  };

  @Prop({ default: 0 })
  likes_count: number;

  @Prop({ default: 0 }) // ✅ Ne sera jamais modifié par l'import
  average_rating: number;

  @Prop()
  image_url: string;
}

// 🔹 Index unique pour éviter les doublons (type + title + release_date)
export const ContentSchema = SchemaFactory.createForClass(Content);
ContentSchema.index({ type: 1, title: 1, release_date: 1 }, { unique: true });
