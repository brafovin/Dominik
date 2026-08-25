/**
 * Prüft alle 48 Level: Werden Chips, Boosts, Gegner und Ausgang erzeugt,
 * und ist alles vom Start aus erreichbar? Die Level-Logik wird direkt aus
 * index.html gelesen, damit Test und Spiel nie auseinanderlaufen.
 *
 *   node tests/levels.test.js
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = html.split('\n');
const from = lines.findIndex(l => l.startsWith('const LEVELS_PER_WORLD'));
const to = lines.findIndex(l => l.trim() === 'SPIELZUSTAND');
if (from < 0 || to < 0) { console.error('Level-Logik in index.html nicht gefunden'); process.exit(1); }

const logic = lines.slice(from, to - 1).join('\n');
const sandbox = {};
new Function('exports', logic + '\nObject.assign(exports, {WORLDS, LEVELS_PER_WORLD, BASE_SPEED, buildLevel, bfs});')(sandbox);
const { WORLDS, LEVELS_PER_WORLD, BASE_SPEED, buildLevel, bfs } = sandbox;

let failed = 0, checked = 0;
for (let w = 0; w < WORLDS.length; w++) {
  for (let l = 0; l < LEVELS_PER_WORLD; l++) {
    const L = buildLevel(w, l);
    const d = bfs(L.grid, L.cols, L.rows, L.start.x, L.start.y);
    const at = p => d[p.y * L.cols + p.x];
    const problems = [];

    if (at(L.exit) < 0) problems.push('Ausgang unerreichbar');
    L.chips.forEach((c, i) => { if (at(c) < 0) problems.push('Chip ' + i + ' unerreichbar'); });
    L.boosts.forEach((b, i) => { if (at(b) < 0) problems.push('Boost ' + i + ' unerreichbar'); });
    L.enemies.forEach((e, i) => { if (at({ x: e.cx, y: e.cy }) < 0) problems.push('Gegner ' + i + ' abgeschnitten'); });
    if (L.chips.length < 3) problems.push('nur ' + L.chips.length + ' Chips');
    if (!L.boosts.length) problems.push('kein +1-Boost');
    if (!L.enemies.length) problems.push('keine Gegner');

    // Grobe Route: alle Chips der Reihe nach, dann Ausgang – muss bequem ins Zeitlimit passen
    let steps = 0, cur = L.start;
    for (const c of L.chips.slice().sort((a, b) => at(a) - at(b))) {
      steps += bfs(L.grid, L.cols, L.rows, cur.x, cur.y)[c.y * L.cols + c.x];
      cur = c;
    }
    steps += bfs(L.grid, L.cols, L.rows, cur.x, cur.y)[L.exit.y * L.cols + L.exit.x];
    const naive = steps / BASE_SPEED;
    if (naive > L.timeLimit * 0.92) problems.push('Zeitlimit zu knapp (' + naive.toFixed(1) + 's von ' + L.timeLimit + 's)');

    checked++;
    if (problems.length) { failed++; console.log('FEHLER W' + (w + 1) + 'L' + (l + 1) + ': ' + problems.join(' | ')); }
  }
}
console.log(failed ? failed + ' von ' + checked + ' Leveln fehlerhaft' : 'OK – alle ' + checked + ' Level erzeugt und lösbar');
process.exit(failed ? 1 : 0);
