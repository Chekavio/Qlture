// Script Node.js pur driver MongoDB pour forcer l'ajout du champ repliesCount
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI manquant');

const DB_NAME = 'qlture'; // adapte si besoin
const COLLECTION = 'review_comments';

(async () => {
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  await client.connect();
  console.log('✅ Connected to MongoDB');
  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION);

  // 1. Set repliesCount = 0 partout
  const resAll = await col.updateMany({}, { $set: { repliesCount: 0 } });
  console.log(`Mise à jour repliesCount: ${resAll.modifiedCount} documents modifiés`);

  // 2. Pour chaque commentaire parent, compte ses replies directes
  const all = await col.find({}).toArray();
  for (const comment of all) {
    const count = await col.countDocuments({ parentCommentId: comment._id.toString() });
    if (count > 0) {
      await col.updateOne({ _id: comment._id }, { $set: { repliesCount: count } });
      console.log(`_id: ${comment._id} => repliesCount: ${count}`);
    }
  }

  await client.close();
  console.log('✅ Terminé');
})();
