import axios from 'axios';
import mongoose from 'mongoose';
import { ContentSchema } from '../modules/contents/contents.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';
import pLimit from 'p-limit';
import * as fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
const cliProgress = require('cli-progress');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID!;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET!;
const IGDB_API_URL = "https://api.igdb.com/v4";
let accessToken = process.env.IGDB_ACCESS_TOKEN || "";

const limit = pLimit(5);
const PROGRESS_FILE = './igdb_offset.txt';

const isTestMode = process.argv.includes('--test');
const TOTAL_GAMES = isTestMode ? 500 : 100000;
const BATCH_SIZE = 500;

const collectionArg = process.argv.find(arg => arg.startsWith('--collection='));
const collectionName = collectionArg ? collectionArg.split('=')[1] : 'contents_test';

let totalInserted = 0;
let totalErrors = 0;

function getCollectionModel(name: string) {
  return mongoose.model(name, ContentSchema, name);
}
const ContentModel = getCollectionModel(collectionName);

async function connectMongo() {
  await mongoose.connect(MONGO_URI, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 10000,
  });

  await ContentModel.collection.createIndex(
    { type: 1, "metadata.igdb_id": 1 },
    {
      unique: true,
      partialFilterExpression: { type: "game", "metadata.igdb_id": { $exists: true } }
    }
  );

  console.log(`✅ Connecté à Mongo. Utilisation de la collection: ${collectionName}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshAccessToken() {
  const spinner = ora("🔐 Récupération du token IGDB...").start();
  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: IGDB_CLIENT_ID,
        client_secret: IGDB_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    });
    accessToken = res.data.access_token;
    spinner.succeed("✅ Nouveau token IGDB obtenu");
  } catch (err) {
    spinner.fail("❌ Échec récupération token");
    console.error(err.message);
    process.exit(1);
  }
}

async function fetchGames(offset: number, limit: number = 500) {
  try {
    const res = await axios.post(`${IGDB_API_URL}/games`, 
      `fields id, name, first_release_date; sort popularity desc; limit ${limit}; offset ${offset};`,
      {
        headers: {
          'Client-ID': IGDB_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'text/plain'
        }
      }
    );
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 401) {
      console.log(chalk.yellow("🔑 Token expiré. Rafraîchissement..."));
      await refreshAccessToken();
      return fetchGames(offset, limit);
    }
    console.warn(chalk.red(`⚠️ Erreur offset ${offset}: ${err.message}`));
    return [];
  }
}

function getLastOffset(): number {
  if (fs.existsSync(PROGRESS_FILE)) {
    const val = parseInt(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (!isNaN(val)) return val;
  }
  return 0;
}

function saveOffset(offset: number) {
  fs.writeFileSync(PROGRESS_FILE, offset.toString());
}

function buildGameDoc(game: any) {
  return {
    title: game.name,
    title_vo: game.name,
    type: "game",
    description: "",
    description_vo: "",
    release_date: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
    genres: [],
    image_url: "",
    metadata: {
      igdb_id: String(game.id),
      release_type: "full"
    }
  };
}

async function importGames() {
  await connectMongo();
  await refreshAccessToken();

  let offset = getLastOffset();
  const bar = new cliProgress.SingleBar({
    format: `${chalk.blue('{bar}')} {percentage}% | {value}/{total} jeux | ✅ {inserted} | ❌ {errors}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true
  }, cliProgress.Presets.shades_classic);

  bar.start(TOTAL_GAMES, offset, {
    inserted: totalInserted,
    errors: totalErrors
  });

  for (; offset < TOTAL_GAMES; offset += BATCH_SIZE) {
    const games = await fetchGames(offset, BATCH_SIZE);
    if (!games.length) break;

    const tasks = games.map(game => limit(async () => {
      const doc = buildGameDoc(game);
      try {
        await ContentModel.findOneAndUpdate(
          { type: 'game', 'metadata.igdb_id': doc.metadata.igdb_id },
          doc,
          { upsert: true, new: true }
        );
        totalInserted++;
      } catch {
        totalErrors++;
      }
    }));

    await Promise.all(tasks);
    saveOffset(offset + BATCH_SIZE);
    bar.update(offset + BATCH_SIZE, {
      inserted: totalInserted,
      errors: totalErrors
    });

    await sleep(1000);
    if (isTestMode) break;
  }

  bar.stop();
  await mongoose.disconnect();
  console.log(chalk.green(`🎮 Import terminé ! ✅ ${totalInserted} | ❌ ${totalErrors}`));
}

importGames();
