import { ApiProperty } from '@nestjs/swagger';

export class SearchItemDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  title_vo: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  release_date?: Date;

  @ApiProperty({ required: false })
  image_url?: string;

  @ApiProperty()
  score: number;
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchItemDto] })
  results: SearchItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty({ required: false })
  after?: string;

  // Removed page for cursor-based pagination
}
