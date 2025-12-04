import fetch from "node-fetch";

// -----------------------------
// Simple in-memory cache (60s)
// -----------------------------
let cache = {};
const CACHE_TTL = 60000;

function setCache(key, data) {
  cache[key] = { data, time: Date.now() };
}

function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

// ----------------------------------------------------------
// Uplink Green theme
// ----------------------------------------------------------
const UPLINK_GREEN = "#6bff7a";

const themes = {
  uplink: {
    bg: "#0d0d0f",
    cardBg: "#131416",
    miniCardBg: "#1a1b1d",
    text: "#e5e5e5",
    border: UPLINK_GREEN + "40",
    glow: UPLINK_GREEN
  }
};

// ----------------------------------------------------------
// Fetch GitHub data
// ----------------------------------------------------------
async function fetchGitHub(username) {
  const user = await fetch(`https://api.github.com/users/${username}`).then(r => r.json());
  const repos = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`).then(r => r.json());
  const events = await fetch(`https://api.github.com/users/${username}/events`).then(r => r.json());
  return { user, repos, events };
}

// ----------------------------------------------------------
// Recent contributions
// ----------------------------------------------------------
function getContributions(events) {
  if (!Array.isArray(events)) return 0;
  return events.filter(
    e => e.type === "PushEvent" || e.type === "PullRequestEvent"
  ).length;
}

// ----------------------------------------------------------
// Engagement Score
// ----------------------------------------------------------
function getEngagement(events) {
  if (!Array.isArray(events)) return { score: 0, label: "Low" };

  const pushes = events.filter(e => e.type === "PushEvent").length;
  const prs = events.filter(e => e.type === "PullRequestEvent").length;

  const score = pushes + prs * 3;

  let label = "Low";
  if (score > 40) label = "High";
  else if (score > 15) label = "Medium";

  return { score, label };
}

// ----------------------------------------------------------
// Most starred repo
// ----------------------------------------------------------
function getPopularRepo(repos) {
  if (!Array.isArray(repos) || repos.length === 0) return null;

  const sorted = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const top = sorted[0];

  return top && top.stargazers_count > 0 ? top : null;
}

// ----------------------------------------------------------
// Build trophies
// ----------------------------------------------------------
function buildTrophies({ user, repos, events }) {
  const followers = user.followers;
  const stars = Array.isArray(repos)
    ? repos.reduce((a, r) => a + (r.stargazers_count || 0), 0)
    : 0;
  const reposCount = user.public_repos;
  const accountAge = new Date().getFullYear() - new Date(user.created_at).getFullYear();
  const contributions = getContributions(events);
  const engagement = getEngagement(events);
  const popularRepo = getPopularRepo(repos);
  const activeDeveloper = contributions > 20;
  const starCollector =
      stars >= 100 ? "Level 3" :
      stars >= 50  ? "Level 2" :
      stars >= 10  ? "Level 1" : "Level 0";
  const openSourceHero = Array.isArray(repos) ? repos.some(r => r.fork) : false;

  return [
    { title: "Followers", icon: "👤", value: followers },
    { title: "Stars", icon: "⭐", value: stars },
    { title: "Repos", icon: "📦", value: reposCount },
    { title: "Account Age", icon: "📅", value: `${accountAge} years` },
    { title: "Contributions", icon: "🔧", value: contributions },
    {
      title: "Popular Repo",
      icon: "📈",
      value: popularRepo ? `${popularRepo.name} (${popularRepo.stargazers_count}★)` : "None"
    },
    {
      title: "Engagement Score",
      icon: "📊",
      value: `${engagement.label} (${engagement.score})`
    },
    { title: "Active Developer", icon: "🚀", value: activeDeveloper ? "Yes" : "No" },
    { title: "Star Collector", icon: "🌟", value: starCollector },
    { title: "Open Source Hero", icon: "💚", value: openSourceHero ? "Yes" : "No" }
  ];
}

// ----------------------------------------------------------
// Render mini-cards
// ----------------------------------------------------------
function renderMiniCard(t, theme) {
  return `
    <g>
      <rect width="220" height="78" rx="12"
        fill="${theme.miniCardBg}"
        stroke="${theme.border}"
        stroke-width="1.2"
        style="filter: drop-shadow(0 0 6px ${theme.glow}33);" />

      <text x="18" y="28"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:16px; font-weight:600; fill:${theme.text};">
        ${t.icon} ${t.title}
      </text>

      <text x="18" y="55"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:18px; font-weight:700; fill:${UPLINK_GREEN};">
        ${t.value}
      </text>
    </g>
  `;
}

// ----------------------------------------------------------
// MAIN HANDLER — GENERATES THE SVG
// ----------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");

  const username = req.query.username;
  if (!username) return res.status(400).end("Missing ?username=");

  const theme = themes.uplink;
  const columns = Number(req.query.columns) || 3;

  const cacheKey = username;
  const cached = getCache(cacheKey);
  if (cached) return res.end(cached);

  const data = await fetchGitHub(username);
  const trophies = buildTrophies(data);

  const width = 750;
  const cardX = 20;
  const cardY = 70;
  const cardWidth = width - 40;
  const cardHeight = Math.ceil(trophies.length / columns) * 95 + 40;

  // Generate the cards grid
  let cardsSvg = "";
  let x = 0, y = 0;

  for (let t of trophies) {
    const gx = cardX + x * 245;
    const gy = cardY + y * 95;

    cardsSvg += `<g transform="translate(${gx}, ${gy})">${renderMiniCard(t, theme)}</g>`;

    x++;
    if (x >= columns) { x = 0; y++; }
  }

  // FINAL SVG
  const svg = `
    <svg width="${width}" height="${cardHeight + 150}" xmlns="http://www.w3.org/2000/svg">

      <rect width="${width}" height="${cardHeight + 150}" fill="${theme.bg}"/>

      <rect x="${cardX}" y="20" width="${cardWidth}" height="${cardHeight}"
        rx="22"
        fill="${theme.cardBg}"
        stroke="${theme.border}"
        stroke-width="1.5"
        style="filter: drop-shadow(0 0 18px ${theme.glow}22);"
      />

      <text x="${cardX + 25}" y="58"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:27px; font-weight:800; fill:${UPLINK_GREEN};">
        🏆 GitHub Trophy — ${username}
      </text>

      ${cardsSvg}

      <!-- FOOTER LINE 1 -->
      <text
        x="${width / 2}"
        y="${cardHeight + 68}"
        text-anchor="middle"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:12px; fill:#6fe86f; opacity:0.9;">
        Contributions &amp; Engagement = actividad pública reciente en GitHub
      </text>

      <!-- FOOTER LINE 2 -->
      <text
        x="${width / 2}"
        y="${cardHeight + 88}"
        text-anchor="middle"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:12px; fill:#6fe86f; opacity:0.9;">
        (≈ últimos 300 eventos, no el total histórico de contribuciones)
      </text>

    </svg>
`;


  setCache(cacheKey, svg);
  return res.end(svg);
}

