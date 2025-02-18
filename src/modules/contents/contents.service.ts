import { Injectable } from '@nestjs/common';
import { ContentsRepository } from './contents.repository';
import { CreateContentDto } from './dto';

@Injectable()
export class ContentsService {
  constructor(private readonly contentsRepository: ContentsRepository) {}

  async createContent(dto: CreateContentDto) {
    // ✅ Convertit `null` en `undefined` pour éviter l'erreur TypeScript
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
}
