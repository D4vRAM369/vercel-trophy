import fetch from "node-fetch";

// -----------------------------
// Simple in-memory cache (60s)
// -----------------------------
let cache = {};
const CACHE_TTL = 60000; // 60 seconds

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
// RAREZA -> Cada rareza tiene un color suave tipo dot
// ----------------------------------------------------------
const rarityColors = {
  Common: "#b0b0b0",
  Uncommon: "#6fa8ff",
  Rare: "#a06bff",
  Epic: "#e3b341",
  Legendary: "#00ff9f"
};

function calculateRarity(value) {
  // Puedes ajustar el algoritmo más tarde
  if (value >= 300) return "Legendary";
  if (value >= 100) return "Epic";
  if (value >= 50) return "Rare";
  if (value >= 10) return "Uncommon";
  return "Common";
}

// ----------------------------------------------------------
// THEMES
// ----------------------------------------------------------
const themes = {
  default: {
    bg: "#1e1e1e",
    cardBg: "#2a2a2a",
    text: "#ffffff",
    miniCardBg: "#333333",
    border: "#444444"
  },

  glass: {
    bg: "url(#glass-bg)",
    cardBg: "rgba(255,255,255,0.15)",
    text: "#2a2a2a",
    miniCardBg: "rgba(255,255,255,0.25)",
    border: "rgba(255,255,255,0.6)"
  },

  matrix: {
    bg: "#0d0d0d",
    cardBg: "#101414",
    text: "#00ff9f",
    miniCardBg: "rgba(0,255,159,0.08)",
    border: "#00ff9f"
  }
};

// ----------------------------------------------------------
// Fetch main GitHub data
// ----------------------------------------------------------
async function fetchGitHub(username) {
  const apiUser = `https://api.github.com/users/${username}`;
  const apiRepos = `https://api.github.com/users/${username}/repos?per_page=100`;
  const apiEvents = `https://api.github.com/users/${username}/events`;

  const [user, repos, events] = await Promise.all([
    fetch(apiUser).then(r => r.json()),
    fetch(apiRepos).then(r => r.json()),
    fetch(apiEvents).then(r => r.json())
  ]);

  return { user, repos, events };
}

// ----------------------------------------------------------
// Scrapping-like contribution activity via events
// ----------------------------------------------------------
function getContributions(events) {
  if (!Array.isArray(events)) return 0;
  return events.filter(e => e.type === "PushEvent" || e.type === "PullRequestEvent").length;
}

// ----------------------------------------------------------
// Detect popular repo
// ----------------------------------------------------------
function getPopularRepo(repos) {
  if (!Array.isArray(repos) || repos.length === 0) return null;
  const sorted = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  const top = sorted[0];
  return top && top.stargazers_count > 0 ? top : null;
}

// ----------------------------------------------------------
// Build trophy objects
// ----------------------------------------------------------
function buildTrophies({ user, repos, events }) {
  const followers = user.followers;
  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const reposCount = user.public_repos;
  const gists = user.public_gists;
  const orgs = user.type === "Organization" ? 1 : 0;

  const accountAge = new Date().getFullYear() - new Date(user.created_at).getFullYear();
  const contributions = getContributions(events);
  const popularRepo = getPopularRepo(repos);
  const risingStar = Math.floor(user.followers / 5); // simple ratio
  
  const activeDeveloper = contributions > 20;
  const veteran = accountAge >= 5;

  const starCollectorLevel =
    stars >= 100 ? "Level 3" :
    stars >= 50 ? "Level 2" :
    stars >= 10 ? "Level 1" : "Level 0";

  const openSourceHero = repos.some(r => r.fork === true);

  return [
    {
      title: "Followers",
      value: followers,
      icon: "👤",
      rarity: calculateRarity(followers)
    },
    {
      title: "Stars",
      value: stars,
      icon: "⭐",
      rarity: calculateRarity(stars)
    },
    {
      title: "Repos",
      value: reposCount,
      icon: "📦",
      rarity: calculateRarity(reposCount)
    },
    {
      title: "Gists",
      value: gists,
      icon: "📝",
      rarity: calculateRarity(gists)
    },
    {
      title: "Account Age",
      value: `${accountAge} years`,
      icon: "📅",
      rarity: calculateRarity(accountAge)
    },
    {
      title: "Orgs",
      value: orgs,
      icon: "🏛️",
      rarity: calculateRarity(orgs)
    },
    {
      title: "Contributions",
      value: contributions,
      icon: "🔧",
      rarity: calculateRarity(contributions)
    },
    {
      title: "Popular Repo",
      value: popularRepo ? `${popularRepo.name} (${popularRepo.stargazers_count}★)` : "None",
      icon: "📈",
      rarity: popularRepo ? calculateRarity(popularRepo.stargazers_count) : "Common"
    },
    {
      title: "Active Developer",
      value: activeDeveloper ? "Yes" : "No",
      icon: "🚀",
      rarity: activeDeveloper ? "Rare" : "Common"
    },
    {
      title: "Star Collector",
      value: starCollectorLevel,
      icon: "🌟",
      rarity: calculateRarity(stars)
    },
    {
      title: "Veteran",
      value: veteran ? "Yes" : "No",
      icon: "🧙",
      rarity: veteran ? "Epic" : "Common"
    },
    {
      title: "Rising Star",
      value: risingStar,
      icon: "📈",
      rarity: calculateRarity(risingStar)
    },
    {
      title: "Open Source Hero",
      value: openSourceHero ? "Yes" : "No",
      icon: "💚",
      rarity: openSourceHero ? "Rare" : "Common"
    }
  ];
}

// ----------------------------------------------------------
// Render mini-cards
// ----------------------------------------------------------
function renderMiniCard(t, theme) {
  const dotColor = rarityColors[t.rarity] || "#ccc";

  return `
    <g>
      <rect width="190" height="70" rx="10"
        fill="${theme.miniCardBg}"
        stroke="${theme.border}"
        stroke-width="1.5"
      />
      <text x="15" y="25"
        style="font-family:sans-serif; font-size:15px; fill:${theme.text};">
        ${t.icon} ${t.title}
      </text>
      <text x="15" y="50"
        style="font-family:sans-serif; font-size:16px; fill:${theme.text}; font-weight:bold;">
        ${t.value}
      </text>
      <circle cx="170" cy="20" r="6" fill="${dotColor}">
        <title>${t.rarity}</title>
      </circle>
    </g>
  `;
}

// ----------------------------------------------------------
// Main handler
// ----------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/svg+xml");

  const username = req.query.username;
  if (!username) return res.status(400).send("Missing ?username=");

  const themeName = req.query.theme || "default";
  const theme = themes[themeName] || themes.default;

  const hide = req.query.hide ? req.query.hide.split(",") : [];
  const columns = Number(req.query.columns) || 3;
  const debug = req.query.debug === "true";

  const cacheKey = username;
  const cached = getCache(cacheKey);
  if (cached && !debug) return res.send(cached);

  const data = await fetchGitHub(username);

  if (debug) {
    return res.send(`
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `);
  }

  let trophies = buildTrophies(data);
  trophies = trophies.filter(t => !hide.includes(t.title.toLowerCase()));

  const width = 650;
  const cardX = 20;
  const cardY = 60;
  const cardWidth = width - 40;

  const cardHeight = Math.ceil(trophies.length / columns) * 85 + 40;

  // Mini-card positioning
  let cardsSvg = "";
  let x = 0, y = 0;
  for (let i = 0; i < trophies.length; i++) {
    const t = trophies[i];
    const gx = cardX + (x * 210);
    const gy = cardY + (y * 85);

    cardsSvg += `
      <g transform="translate(${gx}, ${gy})">
        ${renderMiniCard(t, theme)}
      </g>
    `;

    x++;
    if (x >= columns) { x = 0; y++; }
  }

  const svg = `
    <svg width="${width}" height="${cardHeight + 80}" xmlns="http://www.w3.org/2000/svg">

      <!-- Glass background definition -->
      <defs>
        <filter id="blur" x="-20%" y="-20%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>

        <linearGradient id="glass-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d7e1ec"/>
          <stop offset="100%" stop-color="#f3f5f7"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${cardHeight + 80}" fill="${theme.bg}"/>

      <!-- Main card -->
      <rect x="${cardX}" y="20" width="${cardWidth}" height="${cardHeight}"
        rx="20"
        fill="${theme.cardBg}"
        stroke="${theme.border}"
        stroke-width="2"
        ${themeName === "glass" ? 'filter="url(#blur)"' : ""}
      />

      <!-- Title -->
      <text x="${cardX + 20}" y="55"
        style="font-family:sans-serif; font-size:24px; font-weight:bold; fill:${theme.text};">
        🏆 GitHub Trophy — ${username}
      </text>

      ${cardsSvg}
    </svg>
  `;

  setCache(cacheKey, svg);
  return res.send(svg);
}
