import axios from 'axios';
import mongoose from 'mongoose';
import { ContentSchema } from '../modules/contents/contents.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const MONGO_URI = process.env.MONGODB_URI!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_URL = "https://api.themoviedb.org/3";

const START_YEAR = 2022; // reprendre à 2017
const END_YEAR = 1950;
const MAX_PAGES_PER_YEAR = 500;
const CONCURRENCY = 2;
const THROTTLE_MS = 1200;

mongoose.connect(MONGO_URI, {
  bufferCommands: false,
  serverSelectionTimeoutMS: 10000,
}).then(() => {
  console.log("✅ MongoDB connecté");
}).catch(err => {
  console.error("❌ Erreur MongoDB :", err);
  process.exit(1);
});

const ContentModel = mongoose.model('contents', ContentSchema);

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMovieDetails(movieId: number) {
  try {
    const res = await axios.get(`${TMDB_URL}/movie/${movieId}`, {
      params: { api_key: TMDB_API_KEY, language: "en-US", append_to_response: "credits" }
    });

    const movie = res.data;

    return {
      title: movie.title || "Unknown Title",
      title_vo: movie.original_title || "Unknown Title",
      description: movie.overview || "",
      description_vo: movie.overview || "",
      type: "movie",
      release_date: movie.release_date ? new Date(movie.release_date) : null,
      genres: movie.genres?.map(g => g.name) || [],
      metadata: {
        language: movie.original_language || "unknown",
        publisher: movie.production_companies?.map(pc => pc.name).join(", ") || "",
        director: movie.credits.crew.find(p => p.job === "Director")?.name || "",
        actors: movie.credits.cast?.map(a => a.name) || [],
        duration: movie.runtime || 0
      },
      likes_count: 0,
      average_rating: 0,
      comments_count: 0,
      reviews_count: 0,
      image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ""
    };
  } catch (e: any) {
    console.warn(`⚠️ Erreur détails film ${movieId}: ${e.message}`);
    return null;
  }
}

async function upsertMovie(movie: any) {
  try {
    const existing = await ContentModel.findOne({
      type: "movie",
      title: movie.title,
      release_date: movie.release_date
    });

    if (existing) {
      movie.likes_count = existing.likes_count;
      movie.average_rating = existing.average_rating;
      movie.comments_count = existing.comments_count;
      movie.reviews_count = existing.reviews_count;
    }

    await ContentModel.findOneAndUpdate(
      { type: "movie", title: movie.title, release_date: movie.release_date },
      { $set: movie },
      { upsert: true, new: true }
    );

    console.log(`✅ ${existing ? "Mis à jour" : "Ajouté"} : ${movie.title}`);
  } catch (error: any) {
    console.error(`❌ Erreur upsert ${movie.title} :`, error.message);
  }
}

async function fetchMoviesByYear(year: number, page: number) {
  try {
    const res = await axios.get(`${TMDB_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "en-US",
        sort_by: "popularity.desc",
        page,
        primary_release_year: year
      }
    });

    return res.data.results || [];
  } catch (error: any) {
    console.warn(`⚠️ Année ${year} - page ${page} : ${error.message}`);
    return [];
  }
}

async function importYear(year: number) {
  console.log(`\n📅 === Début de l'import pour ${year} ===`);

  let totalImported = 0;

  for (let page = 1; page <= MAX_PAGES_PER_YEAR; page++) {
    console.log(`➡️ Année ${year} | Page ${page}/${MAX_PAGES_PER_YEAR}`);

    const results = await fetchMoviesByYear(year, page);
    if (results.length === 0) {
      console.log(`⛔️ Aucune donnée sur page ${page}, arrêt de l'année ${year}`);
      break;
    }

    const details = await Promise.all(results.map(m => fetchMovieDetails(m.id)));
    const valid = details.filter(m => m !== null);

    for (const movie of valid) {
      await upsertMovie(movie);
      totalImported++;
    }

    console.log(`✅ Page ${page} de ${year} : ${valid.length} films importés (total: ${totalImported})`);

    await sleep(THROTTLE_MS);
  }

  console.log(`\n📦 Année ${year} terminée : ${totalImported} films importés\n`);
}


async function importAllYears() {
  for (let year = START_YEAR; year >= END_YEAR; year--) {
    await importYear(year);
  }

  console.log("\n🎉 Importation terminée !");
  mongoose.connection.close();
}

importAllYears();
