import fetch from "node-fetch";

export default async function handler(req, res) {
  const username = req.query.username;

  if (!username) {
    return res.status(400).send("Missing ?username=");
  }

  const api = `https://api.github.com/users/${username}`;
  const reposApi = `https://api.github.com/users/${username}/repos?per_page=100`;

  try {
    const user = await fetch(api).then(r => r.json());
    const repos = await fetch(reposApi).then(r => r.json());

    if (user.message === "Not Found") {
      return res.status(404).send(`User ${username} not found.`);
    }

    const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const creationYear = new Date(user.created_at).getFullYear();

    // 🎨 MATRIX STYLE SVG
    const svg = `
      <svg width="600" height="260" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes rain {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }

          .bg {
            fill: #000000;
          }

          .matrix-text {
            font-family: monospace;
            fill: #00ff9f;
            text-shadow: 0 0 5px #00ff9f;
          }

          .title {
            font-size: 26px;
            font-weight: bold;
          }

          .stat {
            font-size: 18px;
          }

          .glow {
            filter: drop-shadow(0 0 6px #00ff9f);
          }
        </style>

        <!-- Fondo -->
        <rect class="bg" x="0" y="0" width="600" height="260" />

        <!-- Lluvia digital -->
        <text x="550" y="40" class="matrix-text" style="opacity:0;animation:rain 2s infinite;">
          01 10 11 01 10 01
        </text>

        <text x="520" y="140" class="matrix-text" style="opacity:0;animation:rain 3s infinite;">
          10 01 10 10 11 00
        </text>

        <text x="560" y="220" class="matrix-text" style="opacity:0;animation:rain 1.8s infinite;">
          1110 0011 1010
        </text>

        <!-- Título -->
        <text x="30" y="45" class="matrix-text title glow">
          🟩 GitHub Matrix Trophy — ${username}
        </text>

        <!-- Stats -->
        <text x="30" y="100" class="matrix-text stat glow">👤 Followers: ${user.followers}</text>
        <text x="30" y="135" class="matrix-text stat glow">⭐ Total Stars: ${totalStars}</text>
        <text x="30" y="170" class="matrix-text stat glow">📦 Public Repos: ${user.public_repos}</text>
        <text x="30" y="205" class="matrix-text stat glow">📅 Since: ${creationYear}</text>

      </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);

  } catch (e) {
    return res.status(500).send("Server error: " + e.message);
  }
}
