import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Content, ContentSchema } from '../contents/contents.schema';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AuthModule } from '../auth/auth.module'; // 👈 ajoute ça

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
    AuthModule, // 👈 ici
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
