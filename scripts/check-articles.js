// Compare l'empreinte des articles Firestore avec celle du site en ligne.
// Écrit `changed=true|false` dans $GITHUB_OUTPUT (déploiement planifié de deploy.yml).
// Remplace l'ancien webhook Vercel appelé par l'admin : aucun secret côté navigateur.

import fs from 'fs';
import { BASE_URL } from '../src/seo/shared.js';
import { fetchArticles, articlesFingerprint, FINGERPRINT_FILE } from './articles.js';

const current = articlesFingerprint(await fetchArticles());

let deployed = '';
try {
  const res = await fetch(`${BASE_URL}/${FINGERPRINT_FILE}`, { cache: 'no-store' });
  if (res.ok) deployed = (await res.text()).trim();
} catch (error) {
  console.warn('Empreinte en ligne illisible :', error.message);
}

const changed = current !== deployed;
console.log(`Firestore : ${current}\nEn ligne  : ${deployed || '(absente)'}\n=> ${changed ? 'articles modifiés, reconstruction' : 'rien à faire'}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
