import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'contents', timestamps: true })
export class Content extends Document {
  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ type: String, default: null })
  title_vo: string | null;

  @Prop({ type: String, enum: ['movie', 'book', 'game', 'album'], default: null })
  type: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  description_vo: string | null;

  @Prop({ type: Date, default: null })
  release_date: Date | null;

  @Prop({ type: [String], default: undefined })
  genres: string[] | undefined;

  @Prop({ type: Object, default: undefined })
metadata: {
  // 🎥 Films
  director?: string | null;
  actors?: string[] | undefined;

  // 📚 Livres
  authors?: string[] | undefined;
  subtitle?: string | null;
  page_count?: number | null;
  pagination?: string | null;
  isbn?: string | null;
  isbn_10?: string | null;
  isbn_13?: string | null;
  openlibrary_edition_id?: string | null;
  work_id?: string | null;
  publish_country?: string | null;
  publish_places?: string[] | undefined;
  contributors?: { role: string; name: string }[] | undefined;
  translated_from?: string[] | undefined;

  // 💽 Albums (si tu gardes ce type-là)
  artist?: string | null;
  tracks?: string[] | undefined;
  duration?: number | null;

  // 🎮 Jeux vidéo
  developers?: string[] | undefined;
  publishers?: string[] | undefined;
  platforms?: string[] | undefined;
  gameplay?: string[] | undefined; // Ex: RPG, platformer, shooter
  game_modes?: string[] | undefined; // Solo, Multi, Coop
  engine?: string | null; // Unity, Unreal Engine…
  player_perspectives?: string[] | undefined; // FPS, TPS, isometric…
  franchise?: string | null;
  series?: string[] | undefined;
  story?: string | null; // Différent du résumé principal
  youtube_trailer_id?: string | null;
  igdb_id?: string | null;
  
  release_type?: 'full' | 'alpha' | 'beta' | 'early_access' | 'offline' | 'cancelled' | 'rumored' | 'delisted' | 'unknown';
  release_versions?: {
    platform?: string;
    region?: string;
    date?: Date | null;
    category?: 'full' | 'alpha' | 'beta' | 'early_access' | 'offline' | 'cancelled' | 'rumored' | 'delisted' | 'unknown';
  }[];

  // 🎨 Médias enrichis
  back_cover_url?: string | null; // Image grand format pour arrière-plan

  // Divers
  language?: string | null;
  identifiers?: Record<string, any> | undefined;
  weight?: string | null;
  physical_format?: string | null;
  dimensions?: string | null;
  websites?: string[] | undefined;
}


  @Prop({ type: Number, default: 0 })
  likes_count: number;

  @Prop({ type: Number, default: 0 })
  average_rating: number;

  @Prop({ type: Number, default: 0 })
  reviews_count: number;

  @Prop({ type: Number, default: 0 })
  comments_count: number;

  @Prop({ type: Number, default: 0 })
  wishlist_count: number;

  @Prop({ type: Number, default: 0 })
  history_count: number;

  @Prop({ type: String, default: null })
  image_url: string | null;
}

export const ContentSchema = SchemaFactory.createForClass(Content);

// 🔹 Unique index for movies: type, title, release_date
ContentSchema.index(
  { type: 1, title: 1, release_date: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'movie' }
  }
);

// 🔹 Unique index for books: type, title, release_date, metadata.subtitle
ContentSchema.index(
  { type: 1, title: 1, release_date: 1, 'metadata.subtitle': 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'book' }
  }
);

// 🔹 Index pour optimiser la recherche par date de sortie et le tri par note moyenne
ContentSchema.index({ release_date: 1, average_rating: -1 });
