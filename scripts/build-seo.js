// Post-build SEO : génère une page HTML par URL indexable + sitemap.xml.
//
// PRINCIPE : on copie le shell Vite (dist/index.html) TEL QUEL et on ne touche
// qu'au <head> : les balises marquées `data-seo` sont retirées puis remplacées
// par celles de la page. Au démarrage, React retire ces balises `data-seo` et
// pose les mêmes via react-helmet-async : titres, canoniques et JSON-LD viennent
// tous de src/seo/shared.js, donc la version statique et la version rendue concordent.
//
// Dans le <body>, seule la zone principale du skeleton (.sk-main) reçoit le
// contenu de la page (texte des articles, listes de liens) pour que les moteurs
// le lisent sans exécuter le JavaScript. React masque tout le skeleton au démarrage.

import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import {
  BASE_URL, SITE_NAME, PAGES, canonicalUrl, articleSlug, articleSeo, pageSeo,
} from '../src/seo/shared.js';
import { fetchArticles, articlesFingerprint, FINGERPRINT_FILE } from './articles.js';
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

// --- Contenu pré-rendu du <body> ---

/** Markdown -> HTML avec les mêmes plugins (et la même sanitisation) que le site. */
const markdownToHtml = (markdown) => renderToStaticMarkup(
  createElement(ReactMarkdown, { rehypePlugins: [rehypeRaw, rehypeSanitize] }, String(markdown ?? '')),
);

const articlePath = (article) => `/article/${articleSlug(article)}`;

const navHtml = () => `<nav class="prerendu-nav">${Object.entries(PAGES)
  .map(([urlPath, page]) => `<a href="${urlPath}">${escapeHtml(page.name)}</a>`)
  .join(' · ')}</nav>`;

function articleBody(article) {
  return [
    navHtml(),
    `<article>`,
    `<h1>${escapeHtml(article.titre)}</h1>`,
    article.dateAffichee || article.date ? `<p class="prerendu-date">${escapeHtml(article.dateAffichee || article.date)}</p>` : '',
    article.extrait ? `<div class="prerendu-extrait">${markdownToHtml(article.extrait)}</div>` : '',
    markdownToHtml(article.contenuComplet),
    `</article>`,
  ].join('\n');
}

const articleLink = (article) => `<a href="${articlePath(article)}">${escapeHtml(article.titre)}</a>`;

function listBody(title, articles) {
  const items = articles.map((article) => [
    '<li>',
    `<h2>${articleLink(article)}</h2>`,
    article.dateAffichee || article.date ? `<p class="prerendu-date">${escapeHtml(article.dateAffichee || article.date)}</p>` : '',
    article.extrait ? markdownToHtml(article.extrait) : '',
    '</li>',
  ].join(''));
  return `${navHtml()}\n<h1>${escapeHtml(title)}</h1>\n<ul class="prerendu-liste">\n${items.join('\n')}\n</ul>`;
}

function indexBody(title, articles) {
  const index = {};
  for (const article of articles) {
    for (const { categorie, terme } of article.indexations || []) {
      const t = String(terme || '').trim();
      if (!t) continue;
      const cat = categorie || 'Non classé';
      ((index[cat] ||= {})[t] ||= []).push(article);
    }
  }
  const sections = Object.entries(index).map(([cat, termes]) => [
    `<h2>${escapeHtml(cat)}</h2>`,
    '<ul>',
    ...Object.entries(termes)
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([terme, liste]) => `<li><strong>${escapeHtml(terme)}</strong> : ${liste.map(articleLink).join(', ')}</li>`),
    '</ul>',
  ].join('\n'));
  return `${navHtml()}\n<h1>${escapeHtml(title)}</h1>\n${sections.join('\n')}`;
}

const PRERENDU_CSS = '<style>'
  + '#initial-skeleton .sk-main.prerendu{animation:none;color:#111;font-family:Georgia,serif;line-height:1.7;overflow-wrap:break-word}'
  + '.prerendu h1{font-size:2rem;line-height:1.2;margin:1rem 0}.prerendu h2{font-size:1.25rem;margin:1.5rem 0 .25rem}'
  + '.prerendu a{color:#b91c1c}.prerendu-nav{font-family:sans-serif;font-size:.8rem}'
  + '.prerendu-date{color:#666;font-size:.9rem}.prerendu-extrait{font-style:italic}'
  + '.prerendu-liste{list-style:none;padding:0}.prerendu img{max-width:100%;height:auto}'
  + '</style>';

/** Remplace le contenu de la zone principale du skeleton par `html`. */
function injectBody(shell, html) {
  const start = shell.indexOf('<div class="sk-main">');
  const root = shell.indexOf('<div id="root"');
  if (start === -1 || root === -1 || root < start) {
    throw new Error('Zone .sk-main ou #root introuvable dans le shell : vérifier index.html.');
  }
  // .sk-main est le dernier enfant de #initial-skeleton : on ferme les deux avant #root
  return `${shell.slice(0, start)}${PRERENDU_CSS}\n      <div class="sk-main prerendu">\n${html}\n      </div>\n    </div>\n    ${shell.slice(root)}`;
}

function renderPage(shell, seo, body) {
  if (body) shell = injectBody(shell, body);
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
    writePage(`/article/${slug}`, renderPage(shell, articleSeo(article), articleBody(article)));
  }
  const uniqueArticles = articles.filter((a) => seen.get(articleSlug(a)) === a.id);

  const bodies = {
    '/': () => listBody(SITE_NAME, uniqueArticles),
    '/publications': () => listBody(PAGES['/publications'].name, uniqueArticles),
    '/index-thematique': () => indexBody(PAGES['/index-thematique'].name, uniqueArticles),
  };
  for (const urlPath of Object.keys(PAGES)) {
    writePage(urlPath, renderPage(shell, pageSeo(urlPath), bodies[urlPath]?.()));
  }

  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), buildSitemap(uniqueArticles), 'utf-8');
  // Empreinte lue par scripts/check-articles.js (déploiement planifié)
  fs.writeFileSync(path.join(DIST, FINGERPRINT_FILE), `${articlesFingerprint(articles)}
`, 'utf-8');
  console.log(`   🗺️  sitemap.xml (${Object.keys(PAGES).length + uniqueArticles.length} URL, ${BASE_URL})`);
  console.log('✅ Génération statique SEO terminée');
}

buildSEO().catch((error) => {
  console.error('❌ Erreur pendant la génération SEO :', error);
  process.exit(1);
});
