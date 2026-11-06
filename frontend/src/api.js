// Every call to the Express Web API goes through here.
const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Not JSON: usually the dev proxy reporting that the backend is down.
  }
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Server error (${res.status}). Is the backend running?`);
  }
  return data;
}

export async function getDifficulties() {
  const data = await request('/difficulties');
  return data.difficulties;
}

export function startGame({ difficulty, playerName }) {
  return request('/games', { method: 'POST', body: { difficulty, playerName } });
}

export function revealCell(gameId, row, col) {
  return request(`/games/${gameId}/reveal`, { method: 'POST', body: { row, col } });
}

export function flagCell(gameId, row, col) {
  return request(`/games/${gameId}/flag`, { method: 'POST', body: { row, col } });
}

export function getHint(gameId) {
  return request(`/games/${gameId}/hint`, { method: 'POST' });
}

export function getLeaderboard(difficulty, limit = 10) {
  return request(`/leaderboard?difficulty=${encodeURIComponent(difficulty)}&limit=${limit}`);
}
