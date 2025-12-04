import fetch from "node-fetch";

export default async function handler(req, res) {
  const username = req.query.username;

  if (!username) {
    return res.status(400).send("Missing ?username=");
  }

  // Obtener datos del GitHub API
  const api = `https://api.github.com/users/${username}`;
  const reposApi = `https://api.github.com/users/${username}/repos?per_page=100`;

  try {
    const user = await fetch(api).then(r => r.json());
    const repos = await fetch(reposApi).then(r => r.json());

    if (user.message === "Not Found") {
      return res.status(404).send(`User ${username} not found.`);
    }

    const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);

    // Crear SVG Trophy simple
    const svg = `
      <svg width="600" height="230" xmlns="http://www.w3.org/2000/svg">
        <style>
          .title { font: bold 22px sans-serif; fill: #e6edf3; }
          .stat { font: 16px sans-serif; fill: #ffffff; }
          .box { fill: #282c34; rx: 10; }
        </style>

        <rect class="box" x="0" y="0" width="600" height="230"></rect>

        <text x="30" y="40" class="title">🏆 GitHub Trophy — ${username}</text>

        <text x="30" y="90" class="stat">👤 Followers: ${user.followers}</text>
        <text x="30" y="120" class="stat">⭐ Total Stars: ${totalStars}</text>
        <text x="30" y="150" class="stat">📦 Public Repos: ${user.public_repos}</text>
        <text x="30" y="180" class="stat">📅 Since: ${new Date(user.created_at).getFullYear()}</text>

      </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    return res.send(svg);

  } catch (e) {
    return res.status(500).send("Server error: " + e.message);
  }
}
