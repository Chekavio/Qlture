import axios from 'axios';
import mongoose from 'mongoose';
import pLimit from 'p-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Content, ContentSchema } from '../modules/contents/contents.schema';
import { model } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
const isTestMode = process.argv.includes('--test');
const isReset = process.argv.includes('--reset');
const MAX_PAGES = isTestMode ? 1 : 300;
const CONCURRENCY = 5;
const PROGRESS_DIR = './progress_books';

const ContentModel = model('Content', ContentSchema);
const limit = pLimit(CONCURRENCY);
const authorCache = new Map<string, string>();

const popularSubjects = [
  
  'psychology'
];

if (!fs.existsSync(PROGRESS_DIR)) fs.mkdirSync(PROGRESS_DIR);

function parseDate(input?: string): Date | null {
  if (!input) return null;
  const parsed = Date.parse(input);
  if (!isNaN(parsed)) return new Date(parsed);
  const match = input.match(/^\d{4}$/);
  return match ? new Date(`${match[0]}-01-01`) : null;
}

function parsePageCount(edition: any): number | null {
  if (edition.number_of_pages) return edition.number_of_pages;
  const raw = edition.pagination;
  if (typeof raw === 'string') {
    const match = raw.match(/\d+/);
    if (match) return parseInt(match[0]);
  }
  return null;
}

async function fetchEdition(id: string) {
  try {
    const res = await axios.get(`https://openlibrary.org/books/${id}.json`);
    return res.data;
  } catch {
    return null;
  }
}

async function fetchWork(id: string) {
  try {
    const res = await axios.get(`https://openlibrary.org${id}.json`);
    return res.data;
  } catch {
    return null;
  }
}

async function fetchIsbnData(isbn: string) {
  try {
    const res = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
    return res.data[`ISBN:${isbn}`] || null;
  } catch {
    return null;
  }
}

async function fetchAuthorName(key: string) {
  if (authorCache.has(key)) return authorCache.get(key)!;
  try {
    const res = await axios.get(`https://openlibrary.org${key}.json`);
    const name = res.data?.name;
    if (name) authorCache.set(key, name);
    return name;
  } catch {
    return null;
  }
}

async function fetchFromGoogleBooks(isbn: string): Promise<{
  authors?: string[];
  image_url?: string;
}> {
  try {
    const res = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: `isbn:${isbn}`,
        key: process.env.GOOGLE_BOOKS_API_KEY
      }
    });

    const item = res.data.items?.[0]?.volumeInfo;
    if (!item) return {};

    return {
      authors: item.authors,
      image_url: item.imageLinks?.thumbnail?.replace('http:', 'https:')
    };
  } catch (err) {
    console.warn(`⚠️ Erreur Google Books pour ISBN ${isbn}: ${err.message}`);
    return {};
  }
}

function extractDescription(edition: any, work: any): string {
  return typeof edition.description === 'string'
    ? edition.description
    : edition.description?.value || work?.description?.value || work?.description || '';
}

async function resolveAuthors(edition: any, work: any): Promise<string[]> {
  let authors: string[] = [];
  let authorKeys = edition.authors?.map((a: any) => a.key) || [];

  if (!authorKeys.length && work?.authors?.length) {
    for (const wAuth of work.authors) {
      if (wAuth?.author?.key) authorKeys.push(wAuth.author.key);
    }
  }

  for (const key of authorKeys) {
    const name = await fetchAuthorName(key);
    if (name) authors.push(name);
  }

  return authors;
}

function buildImageUrl(edition: any, fallback: any): string {
  const coverId = edition.covers?.[0]
    || fallback?.cover?.large?.match(/\/b\/id\/(\d+)-L\.jpg/)?.[1];
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : '';
}

function buildGenres(edition: any, work: any, fallback: any): string[] {
  return [
    ...(edition.subjects || []),
    ...(work?.subjects || []),
    ...(fallback?.subjects?.map((s: any) => s.name) || []),
    ...(edition.dewey_decimal_class || []),
    ...(edition.series || [])
  ].filter(Boolean).slice(0, 10);
}

async function fetchBooksBySubject(subject: string, page: number, retries = 3): Promise<any[]> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get('https://openlibrary.org/search.json', {
        params: {
          q: subject,
          sort: 'editions',
          limit: 100,
          page,
          fields: 'key,title,author_name,edition_key,subject'
        }
      });
      return res.data.docs || [];
    } catch (err: any) {
      console.warn(`⚠️ Erreur sujet "${subject}", page ${page} (tentative ${i + 1}): ${err.message}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return [];
}

function shouldIgnoreBook(book: any): boolean {
  const unwanted = ['children', 'juvenile', 'calendar', 'agenda', 'notebook', 'activity books'];
  const subjects = (book.subject || []).map((s: string) => s.toLowerCase());
  const title = book.title?.toLowerCase() || '';
  return unwanted.some(word =>
    subjects.includes(word) || title.includes(word)
  );
}

async function upsertBook(editionId: string, subject?: string) {
  const edition = await fetchEdition(editionId);
  if (!edition) return;

  const isbn_13 = edition.isbn_13?.[0];
  const isbn_10 = edition.isbn_10?.[0];
  const isbn = isbn_13 || isbn_10;

  const workKey = edition.works?.[0]?.key || null;
  const work = workKey ? await fetchWork(workKey) : null;
  const work_id = workKey?.split('/').pop() || null;
  const fallback = isbn ? await fetchIsbnData(isbn) : null;

  const title = edition.title || fallback?.title || 'Untitled';
  const release_date = parseDate(edition.publish_date || fallback?.publish_date);
  const subtitle = edition.subtitle || fallback?.subtitle || '';

  const languages = (edition.languages || fallback?.languages || [])
    .map((l: any) => l?.key?.split('/').pop())
    .filter(Boolean);

  const translated_from = (edition.translated_from || [])
    .map((l: any) => l?.key?.split('/').pop())
    .filter(Boolean);

  let authors = await resolveAuthors(edition, work);
  let image_url = buildImageUrl(edition, fallback);

  if (isbn && (!authors.length || !image_url)) {
    const googleData = await fetchFromGoogleBooks(isbn);

    if (!authors.length && googleData.authors?.length) {
      authors = googleData.authors;
    }

    if (!image_url && googleData.image_url) {
      image_url = googleData.image_url;
    }

    if (googleData.authors?.length || googleData.image_url) {
      console.log(`🔄 Complété via Google Books : ${title}`);
    }
  }

  const publishers = edition.publishers || fallback?.publishers?.map((p: any) => p.name) || [];
  const page_count = parsePageCount(edition) || fallback?.number_of_pages || null;
  const publish_country = edition.publish_country || '';
  const publish_places = edition.publish_places || (fallback?.publish_places?.map((p: any) => p.name) || []);
  const genres = buildGenres(edition, work, fallback);

  // Ajouter subject comme genre s'il n'est pas déjà dedans
  if (subject) {
    const normalizedSubject = subject.trim().toLowerCase();
    const alreadyIncluded = genres.some(g => g.trim().toLowerCase() === normalizedSubject);
    if (!alreadyIncluded) genres.unshift(subject);
  }

  const metadata = {
    subtitle,
    authors,
    language: languages[0] || null,
    publisher: publishers,
    page_count,
    pagination: typeof edition.pagination === 'string' ? edition.pagination : null,
    isbn,
    isbn_10,
    isbn_13,
    openlibrary_edition_id: edition.key?.split('/').pop(),
    work_id,
    publish_country,
    publish_places,
    identifiers: edition.identifiers || fallback?.identifiers || {},
    series: edition.series || [],
    contributors: edition.contributors || [],
    translated_from,
    weight: edition.weight || fallback?.weight || null,
    physical_format: edition.physical_format || fallback?.physical_format || null,
    dimensions: edition.physical_dimensions || fallback?.physical_dimensions || null
  };

  const data = {
    title,
    title_vo: title,
    type: 'book',
    description: extractDescription(edition, work),
    description_vo: extractDescription(edition, work),
    release_date,
    genres,
    languages,
    metadata,
    image_url,
    likes_count: 0,
    average_rating: 0,
    reviews_count: 0,
    comments_count: 0
  };

  // Duplicate skip logic
  const duplicate = await ContentModel.findOne({ type: 'book', title, release_date });
  if (duplicate) {
    console.log(`⏩ Skipped duplicate: ${title} (${release_date ? release_date.toISOString().slice(0,10) : 'no date'})`);
    return;
  }

  await ContentModel.findOneAndUpdate(
    metadata.openlibrary_edition_id
      ? { type: 'book', 'metadata.openlibrary_edition_id': metadata.openlibrary_edition_id }
      : { type: 'book', title, release_date, 'metadata.subtitle': metadata.subtitle },
    data,
    { upsert: true, new: true }
  );

  console.log(`✅ ${title}`);
}

async function importBooks() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Mongo connecté');

  if (isReset) {
    console.log('♻️ Reset activé : suppression de tous les livres');
    await ContentModel.deleteMany({ type: 'book' });
    fs.rmSync(PROGRESS_DIR, { recursive: true, force: true });
    fs.mkdirSync(PROGRESS_DIR);
  }

  for (const subject of popularSubjects) {
    console.log(`📚 Sujet : ${subject}`);
    const progressFile = path.join(PROGRESS_DIR, `last_page_${subject.replace(/\s/g, '_')}.txt`);
    let startPage = 1;

    if (fs.existsSync(progressFile)) {
      const val = parseInt(fs.readFileSync(progressFile, 'utf8'));
      if (!isNaN(val)) startPage = val;
    }

    for (let page = startPage; page <= MAX_PAGES; page++) {
      console.log(`➡️ [${subject}] Page ${page}/${MAX_PAGES}`);
      fs.writeFileSync(progressFile, `${page + 1}`);

      const books = await fetchBooksBySubject(subject, page);
      const validBooks = books
        .filter(book => !shouldIgnoreBook(book))
        .map(book => book.edition_key?.[0])
        .filter(Boolean);

      const tasks = validBooks.map(editionId => limit(() => upsertBook(editionId, subject)));
      await Promise.all(tasks);
    }

    fs.unlinkSync(progressFile);
    console.log(`✅ Sujet "${subject}" terminé`);
  }

  await mongoose.disconnect();
  console.log('✅ Import complet terminé !');
}

importBooks();
