// src/scripts/migrate_content_test.ts
import mongoose from 'mongoose';
import { ContentSchema } from '../modules/contents/contents.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
const Content = mongoose.model('Content', ContentSchema, 'contents');
const TestContent = mongoose.model('TestContent', ContentSchema, 'content_test');

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const docs = await TestContent.find();
  let inserted = 0;

  for (const doc of docs) {
    try {
      const { title, release_date, type } = doc;
      const exists = await Content.findOne({ title, release_date, type });
      if (!exists) {
        await new Content(doc.toObject()).save();
        inserted++;
      }
    } catch (err) {
      console.warn(`⚠️ Erreur pour ${doc.title}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log(`✅ Migration terminée : ${inserted} documents migrés.`);
}

migrate();
