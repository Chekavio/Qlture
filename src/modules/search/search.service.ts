import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content } from '../contents/contents.schema';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(@InjectModel(Content.name) private contentModel: Model<Content>) {}

  async searchContent(queryDto: SearchQueryDto) {
    const { q, type, genres, sort, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;
    const pipeline: any[] = [];

    // 🔍 Recherche simple avec compound (title + title_vo)
    if (q) {
      pipeline.push({
        $search: {
          index: 'default',
          compound: {
            should: [
              {
                autocomplete: {
                  path: 'title',
                  query: q,
                  fuzzy: { maxEdits: 1, prefixLength: 1 },
                },
              },
              {
                autocomplete: {
                  path: 'title_vo',
                  query: q,
                  fuzzy: { maxEdits: 1, prefixLength: 1 },
                },
              },
            ],
            minimumShouldMatch: 1,
          },
        },
      });
    }

    // 🎯 Filtres facultatifs
    const matchStage: Record<string, any> = {};
    if (type) matchStage.type = type;
    if (genres && genres.length > 0) {
      matchStage.genres = { $in: genres };
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 🔀 Tri custom
    if (sort) {
      let sortStage: Record<string, any> = {};
      switch (sort) {
        case 'date_asc':
          sortStage = { release_date: 1 };
          break;
        case 'rating_desc':
          sortStage = { average_rating: -1 };
          break;
        case 'rating_asc':
          sortStage = { average_rating: 1 };
          break;
        case 'date_desc':
        default:
          sortStage = { release_date: -1 };
          break;
      }
      pipeline.push({ $sort: sortStage });
    }

    // 📦 Résultats + pagination
    pipeline.push({
      $facet: {
        results: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              title: 1,
              title_vo: 1,
              type: 1,
              release_date: 1,
              average_rating: 1,
              image_url: 1,
              genres: { $ifNull: ['$genres', []] },
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await this.contentModel.aggregate(pipeline).exec();
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      results: result[0].results,
      total,
      page,
      limit,
    };
  }
}
