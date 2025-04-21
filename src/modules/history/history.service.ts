import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HistoryItem } from './history_item.schema';
import { CreateHistoryItemDto } from './dto/create-history-item.dto';
import { Content } from '../contents/contents.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HistoryItem.name) private readonly historyModel: Model<HistoryItem>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
  ) {}

  async addItem(dto: CreateHistoryItemDto & { consumedAt?: string }) {
    try {
      // Convertit consumedAt en Date si fourni (Mongoose accepte string ISO ou Date)
      const toCreate = {
        ...dto,
        consumedAt: dto.consumedAt ? new Date(dto.consumedAt) : undefined,
      };
      const item = await this.historyModel.create(toCreate);
      // Simple $inc suffit : Mongo crée le champ si absent
      await this.contentModel.updateOne(
        { _id: dto.contentId },
        { $inc: { history_count: 1 } }
      );
      return item;
    } catch (err) {
      if (err.code === 11000) throw new ConflictException('Déjà dans la liste historique');
      throw err;
    }
  }

  async removeItem(userId: string, contentId: string, type: string) {
    const res = await this.historyModel.deleteOne({ userId, contentId, type });
    if (res.deletedCount === 0) throw new NotFoundException('Item non trouvé dans la liste historique');
    // Simple $inc suffit
    await this.contentModel.updateOne(
      { _id: contentId },
      { $inc: { history_count: -1 } }
    );
    return { deleted: true };
  }

  async getUserHistory(userId: string, type: string) {
    return this.historyModel.find({ userId, type }).lean();
  }

  async getUsersForContent(contentId: string, type: string) {
    return this.historyModel.find({ contentId, type }).lean();
  }

  async countUsersForContent(contentId: string, type: string) {
    return this.historyModel.countDocuments({ contentId, type });
  }
}
