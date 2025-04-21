import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI manquant');

// Déclaration dynamique des schémas (pas d'import NestJS)
const contentSchema = new mongoose.Schema({}, { strict: false });
const wishlistItemSchema = new mongoose.Schema({ contentId: mongoose.Schema.Types.Mixed }, { strict: false });
const historyItemSchema = new mongoose.Schema({ contentId: mongoose.Schema.Types.Mixed }, { strict: false });

async function main() {
  await mongoose.connect(MONGO_URI as string);
  console.log('✅ Mongo connecté');

  const ContentModel = mongoose.model('Content', contentSchema, 'contents');
  const WishlistModel = mongoose.model('WishlistItem', wishlistItemSchema, 'wishlist_items');
  const HistoryModel = mongoose.model('HistoryItem', historyItemSchema, 'history_items');

  // Debug : Affiche le nombre de documents trouvés
  const allWishlistDocs = await WishlistModel.find({});
  const allHistoryDocs = await HistoryModel.find({});
  console.log('Tous les documents wishlist_items:', allWishlistDocs.length);
  console.log('Tous les documents history_items:', allHistoryDocs.length);

  // Agrégation robuste : caste contentId en string
  const wishlistAgg = await WishlistModel.aggregate([
    { $group: { _id: { $toString: "$contentId" }, count: { $sum: 1 } } }
  ]);
  const historyAgg = await HistoryModel.aggregate([
    { $group: { _id: { $toString: "$contentId" }, count: { $sum: 1 } } }
  ]);

  console.log('WishlistAgg:', wishlistAgg.length, 'HistoryAgg:', historyAgg.length);

  const wishlistMap = new Map(wishlistAgg.map(e => [String(e._id), e.count]));
  const historyMap = new Map(historyAgg.map(e => [String(e._id), e.count]));

  const allContentIds = new Set([
    ...wishlistAgg.map(e => String(e._id)),
    ...historyAgg.map(e => String(e._id)),
  ]);

  let updatedCount = 0;
  for (const contentId of allContentIds) {
    const wishlistCount = wishlistMap.get(contentId) || 0;
    const historyCount = historyMap.get(contentId) || 0;
    const result = await ContentModel.updateOne(
      { _id: mongoose.Types.ObjectId.isValid(contentId) ? new mongoose.Types.ObjectId(contentId) : contentId },
      {
        $set: {
          wishlist_count: wishlistCount,
          history_count: historyCount,
        },
      }
    );
    console.log(`Content ${contentId}: wishlist_count=${wishlistCount}, history_count=${historyCount}, matched=${result.matchedCount}, modified=${result.modifiedCount}`);
    updatedCount++;
  }

  console.log('Total updated contents:', updatedCount);
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
