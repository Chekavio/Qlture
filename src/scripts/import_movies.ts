import axios from 'axios';
import mongoose from 'mongoose';
import { Content, ContentSchema } from '../modules/contents/contents.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ✅ Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ✅ Vérification des variables d'environnement
console.log("🔹 MONGO_URI détecté :", process.env.MONGO_URI || "❌ NON TROUVÉ !");
console.log("🔹 TMDB_API_KEY détecté :", process.env.TMDB_API_KEY ? "✅ OK" : "❌ NON TROUVÉ !");

const MONGO_URI = process.env.MONGO_URI!;
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_URL = "https://api.themoviedb.org/3";
const MAX_PAGES = 500; // Nombre de pages max
const MAX_TOTAL_MOVIES = 500_000; // Limite max de films à importer

// ✅ Connexion à MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => {
    console.error("❌ Erreur de connexion MongoDB :", err);
    process.exit(1);
  });

const ContentModel = mongoose.model('contents', ContentSchema);

/**
 * 🔹 Récupérer les détails d’un film depuis TMDB
 */
async function fetchMovieDetails(movieId: number) {
  try {
    // 🔹 Récupérer les films en anglais (langue principale)
    const responseEn = await axios.get(`${TMDB_URL}/movie/${movieId}`, {
      params: { api_key: TMDB_API_KEY, language: "en-US", append_to_response: "credits" }
    });

    const movie = responseEn.data;
    const originalLanguage = movie.original_language;

    // 🔹 Récupérer les films dans leur langue d’origine (VO)
    let responseVo;
    try {
      responseVo = await axios.get(`${TMDB_URL}/movie/${movieId}`, {
        params: { api_key: TMDB_API_KEY, language: originalLanguage }
      });
    } catch (error) {
      console.warn(`⚠️ Pas de version VO trouvée pour ${movie.title}`);
    }

    const movieVo = responseVo ? responseVo.data : null;

    return {
      title: movie.title || "Unknown Title", // 🔹 Anglais par défaut
      title_vo: movieVo?.title || movie.original_title || "Unknown Title", // 🔹 Titre original
      description: movie.overview || "",
      description_vo: movieVo?.overview || movie.overview || "", // 🔹 Description originale
      type: "movie",
      release_date: movie.release_date ? new Date(movie.release_date) : null, // ✅ Conversion pour MongoDB
      genres: movie.genres?.map(g => g.name) || [],
      metadata: {
        language: movie.original_language || "unknown",
        publisher: movie.production_companies?.map(pc => pc.name).join(", ") || "",
        director: movie.credits.crew.find(person => person.job === "Director")?.name || "",
        actors: movie.credits.cast?.map(actor => actor.name) || [],
        duration: movie.runtime || 0
      },
      likes_count: 0,
      average_rating: 0, // Géré par les utilisateurs
      image_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ""
    };
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération du film ${movieId} :`, error.message);
    return null;
  }
}

/**
 * 🔹 Récupérer une page de films populaires depuis TMDB
 */
async function fetchMoviesByPage(page: number) {
  try {
    const response = await axios.get(`${TMDB_URL}/movie/popular`, {
      params: { api_key: TMDB_API_KEY, language: "en-US", page }
    });

    return response.data.results || [];
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des films (page ${page}) :`, error.message);
    return [];
  }
}

/**
 * 🔹 Enregistre ou met à jour un film en base
 */
async function upsertMovie(movie: any) {
  try {
    await ContentModel.findOneAndUpdate(
      { type: "movie", title: movie.title, release_date: movie.release_date }, // Critère d'unicité
      { $set: movie }, // Met à jour si existant
      { upsert: true, new: true }
    );
    console.log(`✅ Film ajouté/mis à jour : ${movie.title}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'upsert du film ${movie.title} :`, error.message);
  }
}

/**
 * 🔹 Importer un grand nombre de films par pagination
 */
async function importMovies() {
  let totalMoviesImported = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (totalMoviesImported >= MAX_TOTAL_MOVIES) break; // Arrête l'import si on atteint la limite

    console.log(`📡 Récupération des films (page ${page}/${MAX_PAGES})...`);
    const movies = await fetchMoviesByPage(page);

    if (movies.length === 0) break; // Arrête si plus de pages

    console.log("📡 Récupération des détails des films...");
    const moviesDetails = await Promise.all(movies.map(movie => fetchMovieDetails(movie.id)));

    // 🔹 Filtrer les erreurs null
    const validMovies = moviesDetails.filter(movie => movie !== null);

    console.log(`📥 Insertion/Mise à jour de ${validMovies.length} films dans MongoDB...`);
    await Promise.all(validMovies.map(movie => upsertMovie(movie)));

    totalMoviesImported += validMovies.length;
    console.log(`✅ ${totalMoviesImported} films importés jusqu'à présent.`);
  }

  console.log(`🚀 Importation terminée. ${totalMoviesImported} films ajoutés.`);
  mongoose.connection.close();
}

// 🔹 Lancer le script
importMovies();
