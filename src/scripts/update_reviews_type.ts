import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost/qlture';
if (!MONGO_URI) throw new Error('MONGODB_URI manquant');

// Schéma minimal pour accès dynamique
const reviewSchema = new mongoose.Schema({ contentId: String, type: String });
const contentSchema = new mongoose.Schema({ type: String });

const Review = mongoose.model('Review', reviewSchema, 'reviews');
const Content = mongoose.model('Content', contentSchema, 'contents');

async function updateReviewsType() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Mongo connecté');

  // On récupère toutes les reviews sans champ type (ni null, ni existant)
  const reviews = await Review.find({ $or: [ { type: { $exists: false } }, { type: null } ] }).lean();
  console.log(`Reviews à mettre à jour: ${reviews.length}`);

  let updated = 0;
  for (const review of reviews) {
    const content = await Content.findById(review.contentId).lean();
    if (!content || !content.type) {
      console.warn(`Pas de type pour review ${review._id} (contentId: ${review.contentId})`);
      continue;
    }
    const res = await Review.updateOne(
      { _id: review._id },
      { $set: { type: content.type } }
    );
    console.log(`_id: ${review._id} => set type: ${content.type} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
    updated++;
  }
  console.log(`✅ Mis à jour ${updated} reviews avec type correct`);
  await mongoose.disconnect();
}

updateReviewsType().catch((err) => {
  console.error('Erreur lors de la mise à jour des types :', err);
  process.exit(1);
});
