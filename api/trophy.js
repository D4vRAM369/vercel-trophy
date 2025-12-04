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
// RAREZA (dot soft colors)
// ----------------------------------------------------------
const rarityColors = {
  Common: "#8a8a8a",
  Uncommon: "#6fa8ff",
  Rare: "#a06bff",
  Epic: "#e1c148",
  Legendary: "#00ff9f"
};

function calculateRarity(value) {
  if (value >= 300) return "Legendary";
  if (value >= 100) return "Epic";
  if (value >= 50) return "Rare";
  if (value >= 10) return "Uncommon";
  return "Common";
}

// ----------------------------------------------------------
// THEMES (Version D → GitHub + Glass suave)
// ----------------------------------------------------------
const themes = {
  glass: {
    bg: "#1c1c1c",
    cardBg: "rgba(255,255,255,0.06)",
    text: "#ffffff",
    miniCardBg: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.2)"
  },

  default: {
    bg: "#1e1e1e",
    cardBg: "#2b2b2b",
    text: "#ffffff",
    miniCardBg: "#353535",
    border: "#404040"
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
// Compute contributions
// ----------------------------------------------------------
function getContributions(events) {
  if (!Array.isArray(events)) return 0;
  return events.filter(e =>
    e.type === "PushEvent" || e.type === "PullRequestEvent"
  ).length;
}

// ----------------------------------------------------------
// Trending Activity → New Rising Star
// ----------------------------------------------------------
function getRisingStar(events) {
  if (!Array.isArray(events)) return { value: 0, label: "Low Activity" };

  const recentActivity = events.filter(e =>
    e.type === "PushEvent" || e.type === "PullRequestEvent"
  ).length;

  let label = "Low Activity";
  if (recentActivity >= 6 && recentActivity <= 20) label = "Active Growth";
  if (recentActivity > 20) label = "Rising Star";

  return { value: recentActivity, label };
}

// ----------------------------------------------------------
// Detect most starred repo
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
  const stars = repos.reduce((a, r) => a + r.stargazers_count, 0);
  const reposCount = user.public_repos;
  const gists = user.public_gists;
  const orgs = user.type === "Organization" ? 1 : 0;
  const accountAge = new Date().getFullYear() - new Date(user.created_at).getFullYear();
  const contributions = getContributions(events);
  const rising = getRisingStar(events);
  const popularRepo = getPopularRepo(repos);

  const activeDeveloper = contributions > 20;
  const starCollectorLevel =
    stars >= 100 ? "Level 3" :
    stars >= 50 ? "Level 2" :
    stars >= 10 ? "Level 1" : "Level 0";

  const openSourceHero = repos.some(r => r.fork === true);

  return [
    { title: "Followers", icon: "👤", value: followers, rarity: calculateRarity(followers) },
    { title: "Stars", icon: "⭐", value: stars, rarity: calculateRarity(stars) },
    { title: "Repos", icon: "📦", value: reposCount, rarity: calculateRarity(reposCount) },
    { title: "Account Age", icon: "📅", value: `${accountAge} years`, rarity: calculateRarity(accountAge) },
    { title: "Contributions", icon: "🔧", value: contributions, rarity: calculateRarity(contributions) },
    {
      title: "Popular Repo",
      icon: "📈",
      value: popularRepo ? `${popularRepo.name} (${popularRepo.stargazers_count}★)` : "None",
      rarity: popularRepo ? calculateRarity(popularRepo.stargazers_count) : "Common"
    },
    { title: "Active Developer", icon: "🚀", value: activeDeveloper ? "Yes" : "No", rarity: activeDeveloper ? "Rare" : "Common" },
    { title: "Star Collector", icon: "🌟", value: starCollectorLevel, rarity: calculateRarity(stars) },
    {
      title: "Rising Star",
      icon: "📊",
      value: `${rising.label} (${rising.value})`,
      rarity: calculateRarity(rising.value)
    },
    { title: "Open Source Hero", icon: "💚", value: openSourceHero ? "Yes" : "No", rarity: openSourceHero ? "Rare" : "Common" }
  ];
}

// ----------------------------------------------------------
// Render mini-cards (New Glass style + Font Inter)
// ----------------------------------------------------------
function renderMiniCard(t, theme) {
  const dotColor = rarityColors[t.rarity] || "#ccc";

  return `
    <g>
      <rect width="190" height="70" rx="12"
        fill="${theme.miniCardBg}"
        stroke="${theme.border}"
        stroke-width="1.2"
      />
      <text x="15" y="25"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:15px; fill:${theme.text};">
        ${t.icon} ${t.title}
      </text>

      <text x="15" y="50"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:17px; fill:${theme.text}; font-weight:600;">
        ${t.value}
      </text>

      <circle cx="170" cy="20" r="5" fill="${dotColor}">
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

  const themeName = req.query.theme || "glass";
  const theme = themes[themeName] || themes.glass;

  const hide = req.query.hide ? req.query.hide.split(",") : [];
  const columns = Number(req.query.columns) || 3;
  const debug = req.query.debug === "true";

  const cacheKey = username;
  const cached = getCache(cacheKey);
  if (cached && !debug) return res.send(cached);

  const data = await fetchGitHub(username);

  if (debug) {
    return res.send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
  }

  let trophies = buildTrophies(data);
  trophies = trophies.filter(t => !hide.includes(t.title.toLowerCase()));

  const width = 650;
  const cardX = 20;
  const cardY = 65;
  const cardWidth = width - 40;

  const cardHeight = Math.ceil(trophies.length / columns) * 85 + 40;

  let cardsSvg = "";
  let x = 0, y = 0;

  for (let i = 0; i < trophies.length; i++) {
    const t = trophies[i];
    const gx = cardX + (x * 210);
    const gy = cardY + (y * 85);

    cardsSvg += `<g transform="translate(${gx}, ${gy})">${renderMiniCard(t, theme)}</g>`;

    x++;
    if (x >= columns) { x = 0; y++; }
  }

  const svg = `
    <svg width="${width}" height="${cardHeight + 90}" xmlns="http://www.w3.org/2000/svg">

      <defs>
        <filter id="glass-blur" x="-20%" y="-20%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect width="${width}" height="${cardHeight + 90}" fill="${theme.bg}"/>

      <rect x="${cardX}" y="20" width="${cardWidth}" height="${cardHeight}"
        rx="22"
        fill="${theme.cardBg}"
        stroke="${theme.border}"
        stroke-width="1.5"
        filter="url(#glass-blur)"
      />

      <text x="${cardX + 20}" y="55"
        style="font-family:Inter,Segoe UI,system-ui,sans-serif;
               font-size:26px; font-weight:700; fill:${theme.text};">
        🏆 GitHub Trophy — ${username}
      </text>

      ${cardsSvg}
    </svg>
  `;

  setCache(cacheKey, svg);
  return res.send(svg);
}
