import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WishlistItem } from './wishlist_item.schema';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name) private readonly wishlistModel: Model<WishlistItem>,
  ) {}

  async addItem(dto: CreateWishlistItemDto) {
    try {
      return await this.wishlistModel.create(dto);
    } catch (err) {
      if (err.code === 11000) throw new ConflictException('Déjà dans la wishlist');
      throw err;
    }
  }

  async removeItem(userId: string, contentId: string, type: string) {
    const res = await this.wishlistModel.deleteOne({ userId, contentId, type });
    if (res.deletedCount === 0) throw new NotFoundException('Item non trouvé dans la wishlist');
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
