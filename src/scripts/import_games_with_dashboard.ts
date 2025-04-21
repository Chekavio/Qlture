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
const collectionName = 'games_import_test';
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
  console.log(chalk.magenta(`[DEBUG] fetchGames ENTRY for offset=${offset}`));
  const fields = [
    'id',
    'name',
    'first_release_date',
    'genres.name',
    'themes.name',
    'platforms.name',
    'involved_companies.company.name',
    'involved_companies.developer',
    'summary',
    'cover.url',
    'screenshots.url',
    'player_perspectives.name',
    'game_engines.name',
    'storyline',
    'game_modes.name',
    'status',
    'collection.name',
    'websites.url',
    'release_dates.category',
    'release_dates.human',
    'release_dates.date',
    'release_dates.platform.name',
    'release_dates.region'
  ];

  const body = `fields ${fields.join(',')}; sort popularity desc; limit ${BATCH_SIZE}; offset ${offset};`;
  const headers = {
    'Client-ID': IGDB_CLIENT_ID,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'text/plain',
  };
  console.log(chalk.magenta('[DEBUG] fetchGames called with:'), { offset, body, headers });
  try {
    const res = await axios.post(
      `${IGDB_API_URL}/games`,
      body,
      { headers }
    );
    return res.data;
  } catch (error: any) {
    console.error(chalk.red(`[DEBUG] Erreur lors de la requête IGDB (offset ${offset}):`), error);
    return [];
  }
}

function getIgdbImageUrl(rawUrl: string | undefined, size: string): string {
  if (!rawUrl) return '';
  // Match l'id d'image : //images.igdb.com/igdb/image/upload/t_thumb/co9d8y.jpg
  const match = rawUrl.match(/\/([a-z0-9]+)\.(jpg|png|webp)$/i);
  const id = match ? match[1] : '';
  if (!id) return '';
  return `https://images.igdb.com/igdb/image/upload/${size}/${id}.webp`;
}

function formatGameData(game: any) {
  const release_versions = (game.release_dates || []).map((r: any) => ({
    platform: r.platform?.name || undefined,
    region: typeof r.region === 'number' ? String(r.region) : undefined,
    date: r.date ? new Date(r.date * 1000) : null,
    category: convertCategory(r.category)
  })).filter(r => r.platform || r.date);

  // Cover en t_cover_big
  const coverUrl = getIgdbImageUrl(game.cover?.url, 't_cover_big');
  // Screenshots en t_1080p si possible, sinon t_720p
  const screenshots = (game.screenshots || []).map((s: any) => {
    let url1080 = getIgdbImageUrl(s.url, 't_1080p');
    let url720 = getIgdbImageUrl(s.url, 't_720p');
    return url1080 || url720;
  }).filter(Boolean);

  // Recherche de la release date
  let releaseDate: Date | null = null;
  if (game.first_release_date) {
    releaseDate = new Date(game.first_release_date * 1000);
  } else if (Array.isArray(game.release_dates)) {
    const fullRelease = game.release_dates.find((r: any) => r.category === 0 && r.date);
    if (fullRelease && fullRelease.date) {
      releaseDate = new Date(fullRelease.date * 1000);
    } else {
      const anyRelease = game.release_dates.find((r: any) => r.date);
      if (anyRelease && anyRelease.date) {
        releaseDate = new Date(anyRelease.date * 1000);
      }
    }
  }

  // Recherche du release_type (full, alpha, etc.) avec fallback sur human
  let releaseType = 'unknown';
  if (Array.isArray(game.release_dates)) {
    const fullRelease = game.release_dates.find((r: any) => r.category === 0);
    if (fullRelease) {
      releaseType = 'full';
    } else {
      // Mapping intelligent : si un champ human contient "Full Release", on force full
      const fullHuman = game.release_dates.find((r: any) => typeof r.human === 'string' && r.human.toLowerCase().includes('full release'));
      if (fullHuman) {
        releaseType = 'full';
      } else {
        // Prend le type de la première release si pas de full
        const firstRelease = game.release_dates[0];
        if (firstRelease && typeof firstRelease.category === 'number') {
          releaseType = convertCategory(firstRelease.category);
        }
      }
    }
  }

  // Publishers : vrai champ + fallback sur developers si vide
  let publishers = (game.involved_companies || [])
    .filter((c: any) => c.publisher)
    .map((c: any) => c.company?.name)
    .filter(Boolean);
  if (publishers.length === 0) {
    const devs = (game.involved_companies || [])
      .filter((c: any) => c.developer)
      .map((c: any) => c.company?.name)
      .filter(Boolean);
    if (devs.length === 1) {
      publishers = devs;
    }
  }

  return {
    title: game.name || 'Untitled',
    title_vo: game.name,
    type: 'game',
    description: game.summary || '',
    description_vo: game.storyline || game.summary || '',
    release_date: releaseDate,
    genres: (game.themes || []).map((t: any) => t.name).filter(Boolean),
    image_url: coverUrl,
    screenshots: screenshots,
    metadata: {
      igdb_id: String(game.id),
      developers: (game.involved_companies || [])
        .filter((c: any) => c.developer)
        .map((c: any) => c.company?.name)
        .filter(Boolean),
      publishers,
      platforms: (game.platforms || []).map((p: any) => p.name).filter(Boolean),
      type: (game.genres || []).map((g: any) => g.name).filter(Boolean),
      game_modes: (game.game_modes || []).map((g: any) => g.name).filter(Boolean),
      player_perspectives: (game.player_perspectives || []).map((p: any) => p.name).filter(Boolean),
      engine: game.game_engines?.[0]?.name || null,
      series: game.collection?.name ? [game.collection.name] : [],
      story: game.storyline || null,
      back_cover_url: screenshots[0] || null,
      websites: (game.websites || []).map((w: any) => w.url).filter(Boolean),
      release_type: releaseType,
      release_versions
    }
  };
}

function convertCategory(category: number): string {
  switch (category) {
    case 0: return 'full';
    case 2: return 'alpha';
    case 3: return 'beta';
    case 4: return 'early_access';
    case 5: return 'offline';
    case 6: return 'cancelled';
    case 7: return 'rumored';
    case 8: return 'delisted';
    default: return 'unknown';
  }
}

async function importGames() {
  console.log(chalk.cyan('[DEBUG] importGames called'));
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

  console.log(chalk.cyan(`[DEBUG] Entering import loop with offset=${offset}, total=${total}`));
  for (; offset < total; offset += BATCH_SIZE) {
    console.log(chalk.cyan(`[DEBUG] About to call fetchGames(offset=${offset})`));
    const games = await fetchGames(offset);
    console.log(chalk.blue(`[DEBUG] fetchGames(offset=${offset}) returned ${games.length} games`));
    if (games.length > 0) {
      console.log(chalk.blue('[DEBUG] First game sample:'), JSON.stringify(games[0], null, 2));
    }
    if (!games.length) break;

    await Promise.all(games.map(game => limit(async () => {
      const doc = formatGameData(game);
      const query = { type: 'game', 'metadata.igdb_id': doc.metadata.igdb_id };
      console.log(chalk.yellow('\n[DEBUG] Query:'), JSON.stringify(query));
      console.log(chalk.yellow('[DEBUG] Doc:'), JSON.stringify(doc, null, 2));
      try {
        await ContentModel.findOneAndUpdate(
          query,
          doc,
          { upsert: true, new: true }
        );
        inserted++;
      } catch (err: any) {
        errors++;
        console.error(chalk.red(`❌ Échec insertion ${doc.title}:`), err);
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
