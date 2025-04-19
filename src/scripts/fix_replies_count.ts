import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charge les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI manquant');

// On ne déclare PAS repliesCount dans le schéma pour l'update dynamique
const reviewCommentSchema = new mongoose.Schema({
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewComment', default: null },
});

const ReviewComment = mongoose.model('ReviewComment', reviewCommentSchema, 'review_comments');
async function fixRepliesCount() {
  await mongoose.connect(MONGO_URI!);
  console.log('✅ Mongo connecté');

  // 1. On récupère tous les commentaires
  const allComments = await ReviewComment.find({}, '_id parentCommentId').lean();
  const repliesMap = new Map();

  // 2. On compte les replies pour chaque parent
  for (const comment of allComments) {
    if (comment.parentCommentId) {
      const parentId = String(comment.parentCommentId);
      repliesMap.set(parentId, (repliesMap.get(parentId) || 0) + 1);
    }
  }

  // 3. On met à jour chaque commentaire avec le bon repliesCount (même ceux sans reply), et on log le résultat
  let updated = 0;
  for (const comment of allComments) {
    const repliesCount = repliesMap.get(String(comment._id)) || 0;
    const res = await ReviewComment.updateOne(
      { _id: comment._id },
      { $set: { repliesCount } }
    );
    console.log(`_id: ${comment._id} => set repliesCount: ${repliesCount} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
    updated++;
  }
  console.log(`✅ Mis à jour ${updated} commentaires avec repliesCount correct`);
  await mongoose.disconnect();
}

fixRepliesCount().catch((err) => {
  console.error('Erreur lors de la mise à jour des repliesCount :', err);
  process.exit(1);
});
