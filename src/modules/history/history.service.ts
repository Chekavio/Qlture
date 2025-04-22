import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HistoryItem } from './history_item.schema';
import { Content } from '../contents/contents.schema';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(HistoryItem.name) private readonly historyModel: Model<HistoryItem>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
    private readonly prisma: PrismaService,
  ) {}

  async addItem(userId: string, contentId: string, type: string, consumedAt?: string) {
    try {
      // Convertit consumedAt en Date si fourni (Mongoose accepte string ISO ou Date)
      const toCreate = {
        userId,
        contentId,
        type,
        consumedAt: consumedAt ? new Date(consumedAt) : undefined,
      };
      const item = await this.historyModel.create(toCreate);
      // Simple $inc suffit : Mongo crée le champ si absent
      await this.contentModel.updateOne(
        { _id: contentId },
        { $inc: { history_count: 1 } }
      );
      // Increment user count atomically
      if (type === 'movie') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { moovie_count: { increment: 1 } },
        });
      } else if (type === 'book') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { book_count: { increment: 1 } },
        });
      } else if (type === 'game') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { games_count: { increment: 1 } },
        });
      }
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
    // Decrement user count atomically
    if (type === 'movie') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { moovie_count: { decrement: 1 } },
      });
    } else if (type === 'book') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { book_count: { decrement: 1 } },
      });
    } else if (type === 'game') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { games_count: { decrement: 1 } },
      });
    }
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

  // --- NOUVEL ENDPOINT FEED ---
  async getHistoryFromFollowed(userId: string, page = 1, limit = 10) {
    // 1. Qui je follow ?
    const following = await this.prisma.follower.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);
    if (!followingIds.length) {
      return { data: [], total: 0, page, totalPages: 0 };
    }
    // 2. Récupérer les items des suivis, triés par consumedAt desc
    const filter = { userId: { $in: followingIds } };
    const total = await this.historyModel.countDocuments(filter);
    const items = await this.historyModel
      .find(filter)
      .sort({ consumedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    // 3. Récupérer les users (pour username/avatar)
    const userIds = [...new Set(items.map(i => i.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    // 4. Récupérer les contenus (pour cover_url et title)
    const contentIds = [...new Set(items.map(i => i.contentId))];
    const contents = await this.contentModel.find({ _id: { $in: contentIds } }, { title: 1, image_url: 1 }).lean();
    const contentsMap = Object.fromEntries(contents.map(c => [String(c._id), c]));
    // 5. Format minimal pour la réponse
    const data = items.map(i => ({
      id: i._id,
      contentId: i.contentId,
      type: i.type,
      consumedAt: i.consumedAt,
      user: usersMap[i.userId] || { id: i.userId, username: 'Utilisateur inconnu', avatar: null },
      title: contentsMap[String(i.contentId)]?.title || null,
      image_url: contentsMap[String(i.contentId)]?.image_url || null,
    }));
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
