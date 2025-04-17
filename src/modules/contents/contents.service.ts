import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentsRepository } from './contents.repository';
import { CreateContentDto } from './dto';

@Injectable()
export class ContentsService {
  constructor(private readonly contentsRepository: ContentsRepository) {}

  async createContent(dto: CreateContentDto) {
    if (dto.metadata && dto.metadata.director === null) {
      dto.metadata.director = undefined;
    }

    return this.contentsRepository.create(dto);
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
}