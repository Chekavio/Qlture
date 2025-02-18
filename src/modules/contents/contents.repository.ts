import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content } from './contents.schema';

@Injectable()
export class ContentsRepository {
  constructor(@InjectModel(Content.name) private readonly contentModel: Model<Content>) {}

  async create(content: Partial<Content>): Promise<Content> {
    return new this.contentModel(content).save();
  }

  async findAll(page: number, limit: number): Promise<Content[]> {
    const skip = (page - 1) * limit;
    return this.contentModel.find().sort({ release_date: -1 }).skip(skip).limit(limit).exec();
  }
  
  

  async findById(id: string): Promise<Content | null> {
    return this.contentModel.findById(id).exec();
  }
}
