/**
 * Spielt Welt 1 / Level 1 automatisch durch (BFS zum nächsten Ziel, Ausweichen
 * vor Jägern) und prüft den kompletten Ablauf: gewinnen -> Sterne -> speichern
 * -> nächstes Level freigeschaltet. Braucht Playwright + Chromium.
 *
 *   npm install && node tests/playthrough.test.js
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('ÜBERSPRUNGEN – playwright nicht installiert (npm install)'); process.exit(0); }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const KEY = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];

function bfs(grid, cols, rows, sx, sy) {
  const dist = new Int32Array(cols * rows).fill(-1);
  const q = [sy * cols + sx];
  dist[sy * cols + sx] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cx = c % cols, cy = (c / cols) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (grid[n] !== 0 || dist[n] !== -1) continue;
      dist[n] = dist[c] + 1; q.push(n);
    }
  }
  return dist;
}

async function launch() {
  try { return await chromium.launch(); }
  catch {
    const fs = require('fs');
    const base = '/opt/pw-browsers';
    const dir = fs.existsSync(base) && fs.readdirSync(base).find(d => /^chromium-\d+$/.test(d));
    if (!dir) throw new Error('Kein Chromium gefunden');
    return chromium.launch({ executablePath: path.join(base, dir, 'chrome-linux', 'chrome') });
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  let won = false, attempt = 0;
  while (!won && attempt++ < 6) {
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
      document.getElementById('screen-game').classList.add('on');
      window.KBESC.start(0, 0);
    });
    await page.waitForTimeout(250);
    let held = null, flee = null, fleeTtl = 0, fleeing = false;
    for (let step = 0; step < 900; step++) {
      const s = await page.evaluate(() => window.KBESC.state());
      if (!s || s.mode === 'won') { won = !!s && s.mode === 'won'; break; }
      if (s.mode === 'dead') break;

      // Sicherheitskarte: Felder meiden, an denen ein Gegner eher ist als wir
      const pd = bfs(s.grid, s.cols, s.rows, s.px, s.py);
      const eds = s.enemies.map(e => ({
        d: bfs(s.grid, s.cols, s.rows, Math.round(e.x), Math.round(e.y)),
        speed: e.speed
      }));
      const margin = c => {
        let m = 99;
        for (const e of eds) {
          if (e.d[c] < 0 || pd[c] < 0) continue;
          m = Math.min(m, e.d[c] / e.speed - pd[c] / s.speed);
        }
        return m;
      };
      const safe = s.grid.slice();
      for (let c = 0; c < safe.length; c++) if (safe[c] === 0 && margin(c) < 0.8) safe[c] = 1;
      safe[s.py * s.cols + s.px] = 0;

      const targets = s.chipsLeft > 0 ? s.chips.filter(c => !c.got) : [s.exit];
      const safeReach = bfs(safe, s.cols, s.rows, s.px, s.py);
      const grid = targets.some(t => safeReach[t.y * s.cols + t.x] >= 0) ? safe : s.grid;

      const d = bfs(grid, s.cols, s.rows, s.px, s.py);
      let best = null, bd = Infinity;
      for (const t of targets) { const v = d[t.y * s.cols + t.x]; if (v >= 0 && v < bd) { bd = v; best = t; } }

      let dir = null;
      if (best) {
        const back = bfs(grid, s.cols, s.rows, best.x, best.y);
        const here = back[s.py * s.cols + s.px];
        for (let k = 0; k < 4; k++) {
          const nx = s.px + DIRS[k][0], ny = s.py + DIRS[k][1];
          if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) continue;
          if (back[ny * s.cols + nx] === here - 1) { dir = k; break; }
        }
      }
      // Kein sicherer Weg zum Ziel: gezielt zum besten Fluchtfeld laufen
      // (globales Maximum statt Nachbarvergleich – sonst pendelt man auf der Stelle)
      const stepMargin = k => margin((s.py + DIRS[k][1]) * s.cols + s.px + DIRS[k][0]);
      const here = s.py * s.cols + s.px;
      if (fleeing && margin(here) > 1.8) { fleeing = false; flee = null; }
      if (!fleeing && (dir === null || stepMargin(dir) < 0.5)) { fleeing = true; flee = null; }
      if (fleeing) {
        // Fluchtziel merken, sonst pendelt man zwischen zwei gleich guten Feldern
        if (flee === null || flee === here || pd[flee] < 0 || --fleeTtl <= 0) {
          let fv = -99; flee = null;
          for (let c = 0; c < pd.length; c++) {
            if (pd[c] < 0 || c === here) continue;
            const v = margin(c) - pd[c] * 0.02;
            if (v > fv) { fv = v; flee = c; }
          }
          fleeTtl = 25;
        }
        if (flee !== null) {
          const back = bfs(s.grid, s.cols, s.rows, flee % s.cols, (flee / s.cols) | 0);
          const hereDist = back[here];
          for (let k = 0; k < 4; k++) {
            const nx = s.px + DIRS[k][0], ny = s.py + DIRS[k][1];
            if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) continue;
            if (back[ny * s.cols + nx] === hereDist - 1) { dir = k; break; }
          }
        }
      }
      if (dir === null) break;

      if (held !== KEY[dir]) { if (held) await page.keyboard.up(held); held = KEY[dir]; await page.keyboard.down(held); }
      await page.waitForTimeout(45);
    }
    if (held) await page.keyboard.up(held);
  }

  const result = {
    gewonnen: won,
    versuche: attempt,
    overlay: await page.locator('#ov-title').textContent(),
    sterneAngezeigt: await page.locator('#ov-stars i.on').count(),
    sterneGespeichert: await page.evaluate(() => window.KBESC.stars(0, 0)),
  };
  if (won) {
    await page.click('#ov-main'); await page.waitForTimeout(400);
    result.nächstesLevel = await page.evaluate(() => { const s = window.KBESC.state(); return 'W' + (s.w + 1) + 'L' + (s.l + 1); });
    await page.click('#btn-quit'); await page.waitForTimeout(250);
    result.gesperrteLevel = await page.locator('.lvl.locked').count();
  }
  console.log(result);
  await browser.close();

  const ok = won && result.sterneGespeichert > 0 && result.nächstesLevel === 'W1L2' && result.gesperrteLevel === 6 && !errors.length;
  if (errors.length) console.log('JS-Fehler:', errors.join(' | '));
  console.log(ok ? 'OK – Durchspielen, Sterne und Freischaltung funktionieren' : 'FEHLGESCHLAGEN');
  process.exit(ok ? 0 : 1);
})();
