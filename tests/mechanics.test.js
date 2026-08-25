/**
 * Prüft die Mechaniken der späten Welten im echten Browser:
 * tragen Laufbänder den Spieler weiter, und blockieren Schleusen im
 * geschlossenen Takt, während sie im offenen durchlassen?
 *
 *   npm install && node tests/mechanics.test.js
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('ÜBERSPRUNGEN – playwright nicht installiert (npm install)'); process.exit(0); }

const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
const KEY = ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'];

function bfs(grid, cols, rows, sx, sy){
  const dist = new Int32Array(cols*rows).fill(-1);
  const q = [sy*cols+sx]; dist[sy*cols+sx] = 0;
  for(let i=0;i<q.length;i++){
    const c = q[i], cx = c%cols, cy = (c/cols)|0;
    for(const [dx,dy] of DIRS){
      const nx = cx+dx, ny = cy+dy;
      if(nx<0||ny<0||nx>=cols||ny>=rows) continue;
      const n = ny*cols+nx;
      if(grid[n] !== 0 || dist[n] !== -1) continue;
      dist[n] = dist[c]+1; q.push(n);
    }
  }
  return dist;
}

async function launch(){
  try { return await chromium.launch(); }
  catch {
    const fs = require('fs');
    const base = '/opt/pw-browsers';
    const dir = fs.existsSync(base) && fs.readdirSync(base).find(d => /^chromium-\d+$/.test(d));
    if(!dir) throw new Error('Kein Chromium gefunden');
    return chromium.launch({ executablePath: path.join(base, dir, 'chrome-linux', 'chrome') });
  }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport:{ width:1100, height:800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  const start = (w,l) => page.evaluate(([w,l]) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    document.getElementById('screen-game').classList.add('on');
    document.body.classList.add('playing');
    window.KBESC.start(w,l);
  }, [w,l]);
  let LVL = null;
  const level = async () => { LVL = await page.evaluate(() => window.KBESC.level()); return LVL; };
  const state = async () => {
    const s = await page.evaluate(() => window.KBESC.state());
    if(s && LVL){ s.grid = LVL.grid; s.cols = LVL.cols; s.rows = LVL.rows;
      s.belt = LVL.belt; s.door = LVL.door; }
    return s;
  };

  // Läuft der Spieler zu Fuß auf das Zielfeld? (blockierende Gegner ignorieren wir,
  // die Mechanik interessiert, nicht das Überleben)
  async function walkTo(target, maxSteps){
    let held = null;
    for(let i=0;i<maxSteps;i++){
      const s = await state();
      if(s.px === target.x && s.py === target.y){ if(held) await page.keyboard.up(held); return s; }
      if(s.mode !== 'play'){ if(held) await page.keyboard.up(held); return null; }
      const back = bfs(s.grid, s.cols, s.rows, target.x, target.y);
      const here = back[s.py*s.cols + s.px];
      let dir = null;
      for(let k=0;k<4;k++){
        const nx = s.px+DIRS[k][0], ny = s.py+DIRS[k][1];
        if(nx<0||ny<0||nx>=s.cols||ny>=s.rows) continue;
        if(back[ny*s.cols+nx] === here-1){ dir = k; break; }
      }
      if(dir === null) break;
      if(held !== KEY[dir]){ if(held) await page.keyboard.up(held); held = KEY[dir]; await page.keyboard.down(held); }
      await page.waitForTimeout(40);
    }
    if(held) await page.keyboard.up(held);
    return null;
  }

  const results = {};

  // --- Laufband (Welt 7) ---
  for(let versuch = 0; versuch < 4 && !results.band; versuch++){
    await start(6, versuch);
    await page.waitForTimeout(300);
    await level();
    const s0 = await state();
    const d = bfs(s0.grid, s0.cols, s0.rows, s0.px, s0.py);
    let best = null, bd = Infinity;
    for(let c = 0; c < s0.belt.length; c++){
      if(!s0.belt[c] || d[c] < 0) continue;
      // Feld, auf dem das Band noch weiterschieben kann
      const x = c % s0.cols, y = (c / s0.cols) | 0, dir = s0.belt[c]-1;
      const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1];
      if(s0.grid[ny*s0.cols+nx] !== 0) continue;
      if(d[c] < bd){ bd = d[c]; best = { x, y, dir }; }
    }
    if(!best) continue;
    const arrived = await walkTo(best, 400);
    if(!arrived) continue;
    // Tasten los – jetzt muss das Band tragen
    await page.waitForTimeout(500);
    const s1 = await state();
    const moved = s1.px !== best.x || s1.py !== best.y;
    const richtung = (s1.px - best.x) * DIRS[best.dir][0] + (s1.py - best.y) * DIRS[best.dir][1] > 0;
    results.band = { getragen: moved, inBandrichtung: richtung, von:[best.x,best.y], nach:[s1.px,s1.py] };
  }

  // --- Schleuse (Welt 8) ---
  for(let versuch = 0; versuch < 4 && !results.schleuse; versuch++){
    await start(7, versuch);
    await page.waitForTimeout(300);
    await level();
    const s0 = await state();
    const d = bfs(s0.grid, s0.cols, s0.rows, s0.px, s0.py);
    let spot = null, bd = Infinity;
    for(let c = 0; c < s0.door.length; c++){
      if(!s0.door[c]) continue;
      const x = c % s0.cols, y = (c / s0.cols) | 0;
      for(let k=0;k<4;k++){
        const ax = x+DIRS[k][0], ay = y+DIRS[k][1], ac = ay*s0.cols+ax;
        if(s0.grid[ac] !== 0 || d[ac] < 0 || s0.door[ac]) continue;
        if(d[ac] < bd){ bd = d[ac]; spot = { x:ax, y:ay, doorX:x, doorY:y, dir:(k+2)%4, phase:s0.door[c] }; }
      }
    }
    if(!spot) continue;
    const arrived = await walkTo({ x:spot.x, y:spot.y }, 500);
    if(!arrived) continue;

    // Erst warten, bis die Schleuse wirklich zu ist
    for(let i=0;i<200;i++){
      const s = await state();
      if(s.doorPhase !== spot.phase) break;
      await page.waitForTimeout(50);
    }

    // Dagegen drücken: solange zu, darf niemand hindurch; öffnet sie, muss es gehen
    await page.keyboard.down(KEY[spot.dir]);
    let gegenGeschlossenGedrueckt = 0, durchGeschlossen = false, durchOffen = false;
    for(let i=0;i<200;i++){
      const s = await state();
      if(s.mode !== 'play') break;
      const drin = s.px === spot.doorX && s.py === spot.doorY;
      const offen = s.doorPhase === spot.phase;
      if(!offen){
        if(drin){ durchGeschlossen = true; break; }
        gegenGeschlossenGedrueckt++;
      } else if(drin){ durchOffen = true; break; }
      await page.waitForTimeout(45);
    }
    await page.keyboard.up(KEY[spot.dir]);
    results.schleuse = { gegenGeschlosseneSchleuseGedrueckt: gegenGeschlossenGedrueckt,
      haeltGeschlossen: gegenGeschlossenGedrueckt >= 5 && !durchGeschlossen, laesstOffenDurch: durchOffen };
  }

  console.log(results);
  await browser.close();

  const ok = results.band && results.band.getragen && results.band.inBandrichtung
          && results.schleuse && results.schleuse.haeltGeschlossen && results.schleuse.laesstOffenDurch
          && !errors.length;
  if(errors.length) console.log('JS-Fehler:', errors.join(' | '));
  console.log(ok ? 'OK – Laufbänder tragen, Schleusen sperren und öffnen im Takt' : 'FEHLGESCHLAGEN');
  process.exit(ok ? 0 : 1);
})();
