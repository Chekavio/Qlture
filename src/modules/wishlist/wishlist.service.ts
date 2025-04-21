import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem } from './wishlist_item.schema';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { Content } from '../contents/contents.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name) private readonly wishlistModel: Model<WishlistItem>,
    @InjectModel(Content.name) private readonly contentModel: Model<Content>,
  ) {}

  async addItem(dto: CreateWishlistItemDto) {
    try {
      const item = await this.wishlistModel.create(dto);
      // Simple $inc suffit : Mongo crée le champ si absent
      await this.contentModel.updateOne(
        { _id: dto.contentId },
        { $inc: { wishlist_count: 1 } }
      );
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
}
