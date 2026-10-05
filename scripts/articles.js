// Lecture des articles Firestore (API REST publique) et empreinte du contenu.
// Utilisé par scripts/build-seo.js (pages + sitemap) et scripts/check-articles.js
// (le déploiement planifié ne reconstruit le site que si l'empreinte change).

import crypto from 'crypto';

const PROJECT_ID = 'cjr-soub';

/** Fichier publié avec le site, contenant l'empreinte des articles du dernier build. */
export const FINGERPRINT_FILE = 'seo-version.txt';

function fromFirestoreValue(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)]));
  }
  return undefined;
}

export async function fetchArticles() {
  const articles = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/articles`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(body.error?.message || `HTTP ${res.status}`);
    for (const doc of body.documents || []) {
      const fields = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)]));
      articles.push({ id: doc.name.split('/').pop(), ...fields });
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return articles;
}

// Sérialisation à clés triées : l'empreinte ne dépend pas de l'ordre des champs.
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Empreinte SHA-256 de l'ensemble des articles (ajout, modification, suppression). */
export function articlesFingerprint(articles) {
  const sorted = [...articles].sort((a, b) => a.id.localeCompare(b.id));
  return crypto.createHash('sha256').update(stableStringify(sorted)).digest('hex');
}
