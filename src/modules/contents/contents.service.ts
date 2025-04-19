import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentsRepository } from './contents.repository';
import { CreateContentDto } from './dto';

// Utility function to ensure all fields are present for book content
function completeBookDto(dto: Partial<CreateContentDto>): any {
  return {
    title: dto.title ?? '',
    title_vo: dto.title_vo ?? '',
    type: dto.type ?? 'book',
    description: dto.description ?? '',
    description_vo: dto.description_vo ?? '',
    release_date: dto.release_date ?? null,
    genres: dto.genres ?? [],
    image_url: dto.image_url ?? '',
    likes_count: dto.likes_count ?? 0,
    average_rating: dto.average_rating ?? 0,
    reviews_count: dto.reviews_count ?? 0,
    comments_count: dto.comments_count ?? 0,
    metadata: {
      subtitle: dto.metadata?.subtitle ?? '',
      authors: dto.metadata?.authors ?? [],
      publisher: dto.metadata?.publisher ?? [],
      page_count: dto.metadata?.page_count ?? null,
      pagination: dto.metadata?.pagination ?? null,
      isbn: dto.metadata?.isbn ?? null,
      isbn_10: dto.metadata?.isbn_10 ?? null,
      isbn_13: dto.metadata?.isbn_13 ?? null,
      openlibrary_edition_id: dto.metadata?.openlibrary_edition_id ?? null,
      work_id: dto.metadata?.work_id ?? null,
      publish_country: dto.metadata?.publish_country ?? '',
      publish_places: dto.metadata?.publish_places ?? [],
      identifiers: dto.metadata?.identifiers ?? {},
      series: dto.metadata?.series ?? [],
      contributors: dto.metadata?.contributors ?? [],
      translated_from: dto.metadata?.translated_from ?? [],
      weight: dto.metadata?.weight ?? null,
      physical_format: dto.metadata?.physical_format ?? null,
      dimensions: dto.metadata?.dimensions ?? null,
    }
  };
}

@Injectable()
export class ContentsService {
  constructor(private readonly contentsRepository: ContentsRepository) {}

  async createContent(dto: CreateContentDto) {
    if (dto.metadata && dto.metadata.director === null) {
      dto.metadata.director = undefined;
    }

    const fullDto = completeBookDto(dto);
    return this.contentsRepository.create(fullDto);
  }

  async getAllContents(page: number, limit: number) {
    return this.contentsRepository.findAll(page, limit);
  }

  async getContentById(id: string) {
    return this.contentsRepository.findById(id);
  }

  async getContentStats(id: string) {
    const content = await this.contentsRepository.findById(id);
    if (!content) throw new NotFoundException('Contenu non trouvé');

    return {
      average_rating: content.average_rating || 0,
      reviews_count: content.reviews_count || 0,
      comments_count: content.comments_count || 0,
    };
  }

  async getCurrentMonthReleases(page: number, limit: number, type?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const query: any = {
      release_date: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    };

    if (type) {
      query.type = type;
    }

    return this.contentsRepository.findWithQuery(
      query,
      page,
      limit,
      { average_rating: -1 }  // Sort by rating in descending order
    );
  }

  async getDecadeContent(decade: number, page: number, limit: number, type?: string) {
    // Calculate the start and end years for the decade
    // For decades before 2000, we use 19xx, for decades after 2000, we use 20xx
    const century = decade < 100 ? (decade < 40 ? 2000 : 1900) : Math.floor(decade / 100) * 100;
    const decadeWithinCentury = decade < 100 ? decade : decade % 100;
    
    const startYear = century + decadeWithinCentury;
    const endYear = startYear + 9;
    
    const startDate = new Date(startYear, 0, 1);  // January 1st of start year
    const endDate = new Date(endYear, 11, 31);    // December 31st of end year

    const query: any = {
      release_date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (type) {
      query.type = type;
    }

    return this.contentsRepository.findWithQuery(
      query,
      page,
      limit,
      { average_rating: -1 }  // Sort by rating in descending order
    );
  }

  // Manual upsert for books, using the same logic as import_books.ts
  async manualUpsertBook(dto: CreateContentDto) {
    // Deduplication: skip if a book with the same title and release_date exists
    const duplicate = await this.contentsRepository.findOne({
      type: 'book',
      title: dto.title,
      release_date: dto.release_date,
    });
    if (duplicate) {
      return { skipped: true, reason: 'Duplicate book found', content: duplicate };
    }

    // If openlibrary_edition_id is present in metadata, prefer upsert on that
    let upsertQuery: any = { type: 'book', title: dto.title, release_date: dto.release_date };
    if (dto.metadata && dto.metadata.openlibrary_edition_id) {
      upsertQuery = { type: 'book', 'metadata.openlibrary_edition_id': dto.metadata.openlibrary_edition_id };
    } else if (dto.metadata && dto.metadata.subtitle) {
      upsertQuery = { type: 'book', title: dto.title, release_date: dto.release_date, 'metadata.subtitle': dto.metadata.subtitle };
    }

    // Insert or update (upsert)
    const content = await this.contentsRepository.findOneAndUpdate(
      upsertQuery,
      dto,
      { upsert: true, new: true }
    );
    return { skipped: false, content };
  }

  // Manual upsert for movies, using the same logic as import_movies.ts (deduplication, upsert)
  async manualUpsertMovie(dto: CreateContentDto) {
    // Deduplication: skip if a movie with the same title and release_date exists
    const duplicate = await this.contentsRepository.findOne({
      type: 'movie',
      title: dto.title,
      release_date: dto.release_date,
    });
    if (duplicate) {
      return { skipped: true, reason: 'Duplicate movie found', content: duplicate };
    }

    // Upsert by title + release_date
    const upsertQuery: any = { type: 'movie', title: dto.title, release_date: dto.release_date };
    const content = await this.contentsRepository.findOneAndUpdate(
      upsertQuery,
      dto,
      {}
    );
    return { skipped: false, content };
  }

  async patchContent(id: string, patch: Record<string, any>) {
    // On ne modifie que les champs fournis dans le body
    return this.contentsRepository.findOneAndUpdate({ _id: id }, patch, { new: true });
  }
}