# MineMentor: TCSS 460 Group Project

**The Flaggers (Group 4):** Noah (team leader), Waleid, Harman

MineMentor is a Minesweeper web app that teaches as you play. The **Express server owns the board**:
mine positions never reach the browser, and the server decides wins and losses and times every game.
When a player asks for a hint, a **rule-based solver** on the server finds a square that is provably
safe and explains which numbers prove it. In Phase III an LLM will reword that explanation, but the
solver always decides the hint, so hints are never wrong.

**Phase II status:** a working client–server prototype of the core gameplay, the solver-backed hint, and a
leaderboard. User accounts, saved game history, the database and the LLM come in Phase III. The design
documentation (Parts A–D) is in [`docs/phase2_report.pdf`](docs/phase2_report.pdf).

## Project structure

```
tcss460-minesweeper-project/
├── frontend/                 React + Vite client
│   ├── public/mine.svg
│   ├── src/
│   │   ├── components/       NavBar, NewGameForm, StatusBar, GameBoard, Cell, HintPanel, Leaderboard
│   │   ├── api.js            all fetch() calls to the Web API
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js        proxies /api to the backend in development
│   └── package.json
├── backend/                  Node.js + Express Web API
│   ├── server.js             starts the server
│   ├── app.js                middleware, routes, error handler
│   ├── routes/               games.js, leaderboard.js
│   ├── lib/                  board.js (game rules), solver.js (hints), validate.js, gameStore.js, scoreStore.js
│   ├── data/sample_scores.json
│   ├── test/                 node:test unit + API tests
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── phase2_report.pdf     Phase II report (Parts A–D)
│   ├── phase2_report.html    source of the PDF
│   └── screenshots/
├── README.md
└── .gitignore
```

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (tested with Node 24) and npm

## Setup and run

Open **two terminals** from the project root.

**Terminal 1: backend (http://localhost:3001)**

```bash
cd backend
npm install
npm start
```

You should see `Minesweeper API listening on http://localhost:3001`.

**Terminal 2: frontend (http://localhost:5173)**

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in a browser. The Vite dev server forwards every `/api` request to the
backend, so start the backend first.

### Environment variables (optional)

Nothing needs configuring to run the prototype. To change the defaults, copy `backend/.env.example` to
`backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Port for the Express API |
| `CORS_ORIGIN` | `http://localhost:5173` | Browser origin allowed to call the API directly |
| `SCORES_FILE` | `backend/data/scores.json` | Where leaderboard scores are saved |
| `HINTS_PER_GAME` | `3` | Hints allowed per game |

If you change `PORT`, start the frontend with `API_PROXY_TARGET=http://localhost:<port> npm run dev` so the
proxy follows. `frontend/.env.example` documents `VITE_API_URL`, which is only needed if the frontend is
served separately from the API. Never commit a real `.env` file.

## How to test the prototype

### In the browser (User → React → Express → React)

1. Choose a difficulty, type a name (optional, needed to be ranked), and press **New Game**.
2. **Left-click** a cell to reveal it. The first click is always safe and opens an area.
3. **Right-click** a cell to flag it. The 🚩 counter goes down. On a phone, tick **Flag mode** and tap.
4. Press **Get Hint** in the AI Hint panel. A provably safe square turns yellow, and the panel explains
   which numbers prove it. Each game allows 3 hints. Before the first click, the hint is a free tip.
5. Hit a mine to lose (all mines are shown, wrong flags are marked ❌). Clear every safe cell to win.
   A named win is saved and highlighted on the **Leaderboard**, which has a tab for each difficulty.
6. Stop the backend and click a cell: the app shows an error message instead of failing silently.

*My Stats*, *Log in* and *Sign up* in the nav bar are greyed out until user accounts are added in Phase III.

### Automated tests

```bash
cd backend
npm test
```

There are 18 tests:

- **Solver:** plays 300 random games by following hints and checks that no hint ever points at a mine. Also checks
  the proof contents and the "no guaranteed safe move" case.
- **Game rules:** safe first click, flood fill, win/loss, flags, and mines staying hidden during play.
- **API:** status codes, validation, a full game won through the API, the hint limit, and the leaderboard.

### Calling the API directly

```bash
curl http://localhost:3001/api/difficulties

curl -X POST http://localhost:3001/api/games \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"beginner","playerName":"alex"}'

# use the gameId from the previous response
curl -X POST http://localhost:3001/api/games/<gameId>/reveal \
  -H "Content-Type: application/json" \
  -d '{"row":4,"col":4}'

curl -X POST http://localhost:3001/api/games/<gameId>/hint

curl "http://localhost:3001/api/leaderboard?difficulty=beginner&limit=5"
```

## Web API (Phase II)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | API is running |
| GET | `/api/difficulties` | Difficulty presets |
| POST | `/api/games` | Start a game: `{ "difficulty", "playerName"? }` → 201 |
| GET | `/api/games/:gameId` | Current game state |
| POST | `/api/games/:gameId/reveal` | Reveal `{ "row", "col" }`; records a score on a named win |
| POST | `/api/games/:gameId/flag` | Toggle a flag `{ "row", "col" }` |
| POST | `/api/games/:gameId/hint` | Solver-backed hint: a safe cell, its proof, and an explanation |
| GET | `/api/leaderboard?difficulty=&limit=` | Top times for one difficulty |

Errors always look like `{ "error": { "status": 400, "message": "..." } }`:
**400** for invalid input, **404** for an unknown game or route, **409** for a move after the game is over,
and **429** when the hint limit is reached.

Planned Phase III endpoints (sign up, log in, my stats, game history, post-game review) are listed in the report.

## Data storage

- Games in progress are kept **in memory** and are lost when the server restarts.
- Scores are saved to `backend/data/scores.json`. It is created from `sample_scores.json` on first run
  and ignored by git. Delete it to reset the leaderboard.
- Phase III moves everything into a relational database (PostgreSQL or SQLite) with `users`, `games` and
  `moves` tables (see Part C of the report).
