import mongoose from 'mongoose';

// Remplace l'import de dotenv pour fonctionner même si le package n'est pas installé
try {
  require('dotenv').config();
} catch (e) {
  console.warn('dotenv non chargé (optionnel pour les variables d\'env locales)');
}

// Schémas dynamiques pour migration (pas besoin de decorators Nest ici)
const reviewCommentSchema = new mongoose.Schema({
  reviewId: String,
  parentCommentId: { type: String, default: null },
  replyToCommentId: { type: String, default: null },
  // autres champs ignorés
});
const reviewSchema = new mongoose.Schema({
  contentId: String,
  reviewText: String,
  commentsCount: Number,
});
const contentSchema = new mongoose.Schema({
  comments_count: Number,
});

const ReviewComment = mongoose.model('review_comments', reviewCommentSchema);
const Review = mongoose.model('reviews', reviewSchema);
const Content = mongoose.model('contents', contentSchema);

async function migrate() {
  // --- Vérification explicite de la variable d'environnement ---
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('❌ Variable d\'environnement MONGODB_URI (ou MONGO_URI) non définie !');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || undefined });
  console.log('✅ Mongo connecté');

  // 1. Migration des review_comments : parentCommentId -> replyToCommentId et suppression de repliesCount
  const comments = await ReviewComment.find().lean();
  let migrated = 0;
  for (const comment of comments) {
    const unsetFields: any = { parentCommentId: 1 };
    // Supprime repliesCount s'il existe
    if (Object.prototype.hasOwnProperty.call(comment, 'repliesCount')) {
      unsetFields.repliesCount = 1;
    }
    const update: any = { $unset: unsetFields };
    if (comment.parentCommentId) {
      update.$set = { replyToCommentId: comment.parentCommentId };
    } else if (!Object.prototype.hasOwnProperty.call(comment, 'replyToCommentId')) {
      update.$set = { replyToCommentId: null };
    }
    await ReviewComment.updateOne({ _id: comment._id }, update);
    migrated++;
  }
  console.log(`✅ review_comments migrés : ${migrated}`);

  // 2. Recalcul des commentsCount sur chaque review (nombre de review_comments liés à cette review)
  // Ne traite que les reviews qui ont au moins un commentaire
  const reviewsWithComments = await ReviewComment.distinct('reviewId');
  let reviewsUpdated = 0;
  for (const reviewId of reviewsWithComments) {
    const count = await ReviewComment.countDocuments({ reviewId: String(reviewId) });
    await Review.updateOne({ _id: reviewId }, { $set: { commentsCount: count } });
    reviewsUpdated++;
    console.log(`review ${reviewId} : commentsCount = ${count}`);
  }
  console.log(`✅ reviews.commentsCount recalculés (reviews avec comments) : ${reviewsUpdated}`);

  // 3. Recalcul des comments_count sur chaque content :
  // Ne traite que les contents qui ont au moins une review
  const contentIds = await Review.distinct('contentId');
  let contentsUpdated = 0;
  for (const contentId of contentIds) {
    // reviews de ce content
    const reviewsOfContent = await Review.find({ contentId }).select('_id commentsCount').lean();
    if (reviewsOfContent.length === 0) continue;
    const reviewsCount = reviewsOfContent.length;
    const commentsCountSum = reviewsOfContent.reduce((acc, r) => acc + (r.commentsCount || 0), 0);
    const total = reviewsCount + commentsCountSum;
    await Content.updateOne({ _id: contentId }, { $set: { comments_count: total } });
    contentsUpdated++;
    console.log(`content ${contentId} : comments_count = ${total}`);
  }
  console.log(`✅ contents.comments_count recalculés (contents avec reviews) : ${contentsUpdated}`);

  console.log('🎉 Migration terminée !');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
