import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost/qlture';
if (!MONGO_URI) throw new Error('MONGODB_URI manquant');

// Schéma minimal
const reviewSchema = new mongoose.Schema({
  reviewText: String,
  createdAt: Date,
  reviewTextAddedAt: Date,
});

const Review = mongoose.model('Review', reviewSchema, 'reviews');

async function migrateReviewTextAddedAt() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Mongo connecté');

  // On cible bien les reviews avec texte et sans reviewTextAddedAt
  const reviews = await Review.find({ reviewText: { $exists: true, $ne: '' }, reviewTextAddedAt: { $exists: false } }).lean();
  console.log(`Reviews à mettre à jour: ${reviews.length}`);

  let updated = 0;
  for (const review of reviews) {
    const res = await Review.updateOne(
      { _id: review._id },
      { $set: { reviewTextAddedAt: review.createdAt } }
    );
    if ((res as any).modifiedCount === 1 || (res as any).nModified === 1) updated++;
  }
  console.log(`✅ Mis à jour ${updated} reviews avec reviewTextAddedAt`);
  await mongoose.disconnect();
}

migrateReviewTextAddedAt().catch((err) => {
  console.error('Erreur lors de la migration :', err);
  process.exit(1);
});
