import { 
    IsString, 
    IsOptional, 
    IsDate, 
    IsEnum, 
    IsArray, 
    IsNumber, 
    ValidateNested 
  } from 'class-validator';
  import { Type, Transform } from 'class-transformer';
  
  export class MetadataDto {
    // 🔹 Commun à tous les types
    @IsOptional()
    @IsString()
    language?: string;
  
    @IsOptional()
    @IsString()
    publisher?: string;
  
    // 🔹 Pour les films
    @IsOptional()
    @Transform(({ value }) => value === null ? undefined : value) // ✅ Convertit `null` en `undefined`
    @IsString()
    director?: string;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    actors?: string[];
  
    @IsOptional()
    @IsNumber()
    duration?: number; // ✅ Durée en minutes (films uniquement)
  
    // 🔹 Pour les jeux vidéo
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    platforms?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    developers?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    modes?: string[]; // Ex: "Single-player", "Multiplayer"
  
    // 🔹 Pour les livres
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    authors?: string[];
  
    @IsOptional()
    @IsNumber()
    page_count?: number;
  
    // 🔹 Pour les albums (changement ici)
    @IsOptional()
    @IsString()
    artist?: string;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tracks?: string[];
  
    @IsOptional()
    @IsNumber()
    total_duration?: number; // ✅ Nouvelle clé pour éviter le conflit
  }
  
  export class CreateContentDto {
    @IsString()
    title: string;
  
    @IsEnum(['movie', 'book', 'game', 'album'])
    type: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsDate()
    release_date?: Date;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    genres?: string[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => MetadataDto)
    metadata?: MetadataDto;
  
    @IsOptional()
    @IsNumber()
    likes_count?: number;
  
    @IsOptional()
    @IsString()
    image_url?: string;
  }
  