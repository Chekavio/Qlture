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
}