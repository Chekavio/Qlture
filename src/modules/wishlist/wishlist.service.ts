import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem } from './wishlist_item.schema';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { Content } from '../contents/contents.schema';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name) private readonly wishlistModel: Model<WishlistItem>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
    private readonly prisma: PrismaService,
  ) {}

  async addItem(dto: CreateWishlistItemDto) {
    try {
      const item = await this.wishlistModel.create(dto);
      // Simple $inc suffit : Mongo crée le champ si absent
      await this.contentModel.updateOne(
        { _id: dto.contentId },
        { $inc: { wishlist_count: 1 } }
      );
      // Increment user list count atomically
      if (dto.type === 'movie') {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: { watch_list_count: { increment: 1 } },
        });
      } else if (dto.type === 'book') {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: { read_list_count: { increment: 1 } },
        });
      } else if (dto.type === 'game') {
        await this.prisma.user.update({
          where: { id: dto.userId },
          data: { game_list_count: { increment: 1 } },
        });
      }
      return item;
    } catch (err) {
      if (err.code === 11000) throw new ConflictException('Déjà dans la wishlist');
      throw err;
    }
  }

  async removeItem(userId: string, contentId: string, type: string) {
    const res = await this.wishlistModel.deleteOne({ userId, contentId, type });
    if (res.deletedCount === 0) throw new NotFoundException('Item non trouvé dans la wishlist');
    // Simple $inc suffit
    await this.contentModel.updateOne(
      { _id: contentId },
      { $inc: { wishlist_count: -1 } }
    );
    // Decrement user list count atomically
    if (type === 'movie') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { watch_list_count: { decrement: 1 } },
      });
    } else if (type === 'book') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { read_list_count: { decrement: 1 } },
      });
    } else if (type === 'game') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { game_list_count: { decrement: 1 } },
      });
    }
    return { deleted: true };
  }

  async getUserWishlist(userId: string, type: string) {
    return this.wishlistModel.find({ userId, type }).lean();
  }

  async getUsersForContent(contentId: string, type: string) {
    return this.wishlistModel.find({ contentId, type }).lean();
  }

  async countUsersForContent(contentId: string, type: string) {
    return this.wishlistModel.countDocuments({ contentId, type });
  }

  async getWishlistFromFollowed(userId: string, page = 1, limit = 10) {
    // 1. Récupérer la liste des IDs suivis
    const followed = await this.prisma.follower.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followed.map(f => f.followingId);
    if (!followingIds.length) {
      return { data: [], total: 0, page, totalPages: 0 };
    }
    // 2. Récupérer les items wishlist des suivis, triés par plus récent
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.wishlistModel.find({ userId: { $in: followingIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.wishlistModel.countDocuments({ userId: { $in: followingIds } }),
    ]);
    // 3. Récupérer les users (pour username/avatar)
    const userIds = [...new Set(items.map(i => i.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
    // 4. Récupérer les contenus (pour image_url et title)
    const contentIds = [...new Set(items.map(i => i.contentId))];
    const contents = await this.contentModel.find({ _id: { $in: contentIds } }, { title: 1, image_url: 1 }).lean();
    const contentsMap = Object.fromEntries(contents.map(c => [String(c._id), c]));
    // 5. Format minimal pour la réponse
    const data = items.map(i => ({
      id: i._id,
      contentId: i.contentId,
      type: i.type,
      createdAt: i.createdAt,
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
