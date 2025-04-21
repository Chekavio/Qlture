import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryItem, HistoryItemSchema } from './history_item.schema';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { AuthModule } from '../auth/auth.module';
import { ContentsModule } from '../contents/contents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryItem.name, schema: HistoryItemSchema },
    ]),
    forwardRef(() => AuthModule),
    ContentsModule,
  ],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
