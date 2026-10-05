// Post-build SEO : génère une page HTML par URL indexable + sitemap.xml.
//
// PRINCIPE : on copie le shell Vite (dist/index.html) TEL QUEL et on ne touche
// qu'au <head> : les balises marquées `data-seo` sont retirées puis remplacées
// par celles de la page. Le <body> (skeleton, #root, assets) reste identique.
// Au démarrage, React retire ces balises `data-seo` et pose les mêmes via
// react-helmet-async : titres, canoniques et JSON-LD viennent tous de
// src/seo/shared.js, donc la version statique et la version rendue concordent.

import fs from 'fs';
import path from 'path';
import {
  BASE_URL, SITE_NAME, PAGES, canonicalUrl, articleSlug, articleSeo, pageSeo,
} from '../src/seo/shared.js';

const PROJECT_ID = 'cjr-soub';
const DIST = path.resolve('dist');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// JSON dans <script> : empêcher une séquence "</script>" dans les données
const safeJson = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

/** Shell Vite débarrassé de ses balises SEO par défaut. */
function loadBareShell() {
  const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
  const bare = shell
    .replace(/^[ \t]*<title data-seo>[\s\S]*?<\/title>[ \t]*\r?\n/gm, '')
    .replace(/^[ \t]*<(meta|link) data-seo\b[^>]*>[ \t]*\r?\n/gm, '');
  if (/data-seo/.test(bare.replace(/<!--[\s\S]*?-->/g, ''))) {
    throw new Error('Balises data-seo non retirées du shell : vérifier index.html (une balise par ligne).');
  }
  return bare;
}

function renderPage(shell, seo) {
  const tags = [
    `<title data-seo>${escapeHtml(seo.title)}</title>`,
    `<meta data-seo name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta data-seo name="keywords" content="${escapeHtml(seo.keywords)}" />`,
    `<meta data-seo name="robots" content="index, follow" />`,
    `<link data-seo rel="canonical" href="${escapeHtml(seo.canonical)}" />`,
    `<meta data-seo property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta data-seo property="og:locale" content="fr_FR" />`,
    `<meta data-seo property="og:type" content="${seo.type}" />`,
    `<meta data-seo property="og:url" content="${escapeHtml(seo.canonical)}" />`,
    `<meta data-seo property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta data-seo property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta data-seo property="og:image" content="${escapeHtml(seo.image)}" />`,
    `<meta data-seo name="twitter:card" content="summary_large_image" />`,
    `<meta data-seo name="twitter:url" content="${escapeHtml(seo.canonical)}" />`,
    `<meta data-seo name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta data-seo name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta data-seo name="twitter:image" content="${escapeHtml(seo.image)}" />`,
    `<script data-seo type="application/ld+json">${safeJson(seo.jsonLd)}</script>`,
  ];
  return shell.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}

function writePage(urlPath, html) {
  // "/" -> dist/index.html ; "/liens" -> dist/liens/index.html ; articles -> dist/article/<slug>.html
  const file = urlPath === '/'
    ? path.join(DIST, 'index.html')
    : urlPath.startsWith('/article/')
      ? path.join(DIST, `${urlPath}.html`)
      : path.join(DIST, urlPath, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf-8');
  console.log(`   ✍️  ${urlPath}`);
}

// --- Lecture des articles (API REST Firestore publique, avec pagination) ---

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

async function fetchArticles() {
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

// --- Sitemap ---

const isoDay = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

function buildSitemap(articles) {
  const latest = articles.map((a) => isoDay(a.date)).filter(Boolean).sort().pop();
  const entries = Object.entries(PAGES).map(([urlPath, page]) => ({
    loc: canonicalUrl(urlPath),
    // Accueil et Publications listent les articles : elles changent avec le dernier article
    lastmod: ['/', '/publications'].includes(urlPath) ? latest : null,
    changefreq: page.changefreq,
    priority: page.priority,
  }));
  for (const article of articles) {
    entries.push({
      loc: articleSeo(article).canonical,
      lastmod: isoDay(article.date),
      changefreq: 'monthly',
      priority: '0.8',
    });
  }
  const urls = entries.map((e) => [
    '  <url>',
    `    <loc>${escapeHtml(e.loc)}</loc>`,
    e.lastmod && `    <lastmod>${e.lastmod}</lastmod>`,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// --- Exécution ---

async function buildSEO() {
  console.log('🚀 Génération statique SEO...');
  if (!fs.existsSync(DIST)) throw new Error('Dossier "dist/" absent : lancer "vite build" d\'abord.');

  const shell = loadBareShell();
  const articles = await fetchArticles();
  articles.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  console.log(`📚 ${articles.length} article(s) récupéré(s)`);

  // Shell neutre (sans canonique) servi par firebase.json pour /admin et les
  // articles publiés depuis le dernier build ; React pose ensuite les balises.
  fs.writeFileSync(path.join(DIST, 'app-shell.html'), shell, 'utf-8');

  const seen = new Map();
  for (const article of articles) {
    const slug = articleSlug(article);
    if (seen.has(slug)) {
      console.warn(`⚠️  Slug en double "${slug}" (${seen.get(slug)} et ${article.id}) : seul le premier est publié.`);
      continue;
    }
    seen.set(slug, article.id);
    writePage(`/article/${slug}`, renderPage(shell, articleSeo(article)));
  }
  const uniqueArticles = articles.filter((a) => seen.get(articleSlug(a)) === a.id);

  for (const urlPath of Object.keys(PAGES)) {
    writePage(urlPath, renderPage(shell, pageSeo(urlPath)));
  }

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(uniqueArticles), 'utf-8');
  console.log(`   🗺️  sitemap.xml (${Object.keys(PAGES).length + uniqueArticles.length} URL, ${BASE_URL})`);
  console.log('✅ Génération statique SEO terminée');
}

buildSEO().catch((error) => {
  console.error('❌ Erreur pendant la génération SEO :', error);
  process.exit(1);
});
