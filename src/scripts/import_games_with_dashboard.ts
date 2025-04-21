// import_games_full.ts

import axios from 'axios';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import pLimit from 'p-limit';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
const cliProgress = require('cli-progress');

import { ContentSchema } from '../modules/contents/contents.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID!;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET!;
const IGDB_API_URL = 'https://api.igdb.com/v4';

let accessToken = '';
const BATCH_SIZE = 500;
const TOTAL_GAMES = 100000;
const PROGRESS_FILE = './progress_igdb.txt';
const collectionName = 'games_import_full';
const isTest = process.argv.includes('--test');

const ContentModel = mongoose.model(collectionName, ContentSchema, collectionName);
ContentModel.schema.set('strict', false);

const limit = pLimit(5);

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log(chalk.green('✅ Connecté à MongoDB'));
}

async function getIGDBToken() {
  const spinner = ora('Obtention du token IGDB...').start();
  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: IGDB_CLIENT_ID,
        client_secret: IGDB_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });
    accessToken = res.data.access_token;
    spinner.succeed('✅ Token IGDB obtenu');
  } catch (err) {
    spinner.fail('❌ Échec obtention token IGDB');
    throw err;
  }
}

async function fetchGames(offset: number) {
  const fields = [
    'id',
    'name',
    'first_release_date',
    'genres.name',
    'platforms.name',
    'involved_companies.company.name',
    'involved_companies.developer',
    'summary',
    'cover.url',
    'player_perspectives.name',
    'game_engines.name',
    'storyline',
    'game_modes.name',
    'status',
    'collection.name'
  ];

  try {
    const res = await axios.post(
      `${IGDB_API_URL}/games`,
      `fields ${fields.join(',')}; sort popularity desc; limit ${BATCH_SIZE}; offset ${offset};`,
      {
        headers: {
          'Client-ID': IGDB_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error(chalk.red(`❌ Erreur lors de la requête IGDB (offset ${offset}): ${error.message}`));
    return [];
  }
}

function formatGameData(game: any) {
  return {
    title: game.name || 'Untitled',
    title_vo: game.name,
    type: 'game',
    description: game.summary || '',
    description_vo: game.storyline || game.summary || '',
    release_date: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
    genres: (game.genres || []).map((g: any) => g.name).filter(Boolean),
    image_url: game.cover?.url?.replace('//', 'https://') || '',
    metadata: {
      igdb_id: String(game.id),
      developers: (game.involved_companies || [])
        .filter((c: any) => c.developer)
        .map((c: any) => c.company?.name)
        .filter(Boolean),
      publisher: (game.involved_companies || [])
        .filter((c: any) => !c.developer)
        .map((c: any) => c.company?.name)
        .filter(Boolean),
      platforms: (game.platforms || []).map((p: any) => p.name).filter(Boolean),
      gameplay: (game.game_modes || []).map((g: any) => g.name).filter(Boolean),
      player_perspectives: (game.player_perspectives || []).map((p: any) => p.name).filter(Boolean),
      game_engine: (game.game_engines || []).map((e: any) => e.name).filter(Boolean),
      series: game.collection?.name ? [game.collection.name] : [],
      release_type: game.status || 'released'
    }
  };
}

async function importGames() {
  await connectDB();
  await getIGDBToken();

  let offset = 0;
  if (fs.existsSync(PROGRESS_FILE)) {
    const val = parseInt(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (!isNaN(val)) offset = val;
  }

  const total = isTest ? BATCH_SIZE : TOTAL_GAMES;
  const bar = new cliProgress.SingleBar({
    format: `${chalk.cyan('{bar}')} {percentage}% | {value}/{total} | ✅ {inserted} | ❌ {errors}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true
  });

  let inserted = 0;
  let errors = 0;

  bar.start(total, offset, { inserted, errors });

  for (; offset < total; offset += BATCH_SIZE) {
    const games = await fetchGames(offset);
    if (!games.length) break;

    await Promise.all(games.map(game => limit(async () => {
      const doc = formatGameData(game);
      try {
        await ContentModel.findOneAndUpdate(
          { type: 'game', 'metadata.igdb_id': doc.metadata.igdb_id },
          doc,
          { upsert: true, new: true }
        );
        inserted++;
      } catch (err: any) {
        errors++;
        console.error(chalk.red(`❌ Échec insertion ${doc.title}: ${err.message}`));
      }
    })));

    fs.writeFileSync(PROGRESS_FILE, (offset + BATCH_SIZE).toString());
    bar.update(offset + BATCH_SIZE, { inserted, errors });

    if (isTest) break;
  }

  bar.stop();
  console.log(chalk.green(`\n🎮 Import terminé ! ✅ ${inserted} | ❌ ${errors}`));
  await mongoose.disconnect();
}

importGames();
