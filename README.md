# KEYBOARD ESCAPE +1

Ein Tastatur-Fluchtspiel im Browser. Du steckst in einem System fest: sammle alle
Datenchips, schnapp dir die **+1 Geschwindigkeit**-Boosts und erreiche das Portal,
bevor dich die Jäger kriegen oder die Zeit abläuft.

**Kein Setup, kein Server:** `index.html` im Browser öffnen — fertig.

## Umfang

| | |
|---|---|
| Welten | 9 |
| Level pro Welt | 8 (insgesamt 72) |
| Sterne | bis zu 216 ⭐ |
| Speicherstand | lokal im Browser (`localStorage`) |

## Steuerung

| Taste | Aktion |
|---|---|
| `W` `A` `S` `D` / Pfeiltasten | Bewegen |
| `R` | Level neu starten |
| `P` / `Esc` | Pause |
| `Enter` / `Leertaste` | Overlay bestätigen |

Auf Touchgeräten: wischen oder das eingeblendete Steuerkreuz benutzen.

## Spielprinzip

1. **Datenchips ◆ einsammeln** — erst wenn alle eingesammelt sind, öffnet sich das Portal.
2. **+1 Geschwindigkeit** — jeder gelbe Boost macht dich dauerhaft (für dieses Level)
   um 1 Feld/Sekunde schneller. Start: 5.0, Maximum: 13.0.
3. **Portal erreichen**, bevor die Zeit abläuft.
4. **Sterne**: 3 ⭐ bei über 55 % Restzeit, 2 ⭐ ab 28 %, sonst 1 ⭐.

Das nächste Level ist frei, sobald das aktuelle mindestens 1 ⭐ hat.
Eine neue Welt braucht eine Mindestzahl an Sternen in der Welt davor —
das Spiel zeigt die Anforderung auf der gesperrten Weltkarte an.

## Welten

| # | Welt | Freischaltung | Neue Mechanik |
|---|---|---|---|
| 1 | Serverraum | — | Jäger, die dich verfolgen |
| 2 | Neon-Kanal | 12 ⭐ in Welt 1 | Wächter auf festen Routen |
| 3 | Eisspeicher | 12 ⭐ in Welt 2 | Eis: du rutschst bis zur Wand |
| 4 | Magmakern | 14 ⭐ in Welt 3 | Lavaplatten, die im Takt zünden |
| 5 | Nullraum | 16 ⭐ in Welt 4 | Nebel + Portale (mit Peilsendern am Sichtrand) |
| 6 | Schaltzentrale | 18 ⭐ in Welt 5 | Eis, Feuer und Portale zusammen |
| 7 | Förderwerk | 18 ⭐ in Welt 6 | Laufbänder tragen dich weiter |
| 8 | Schaltwerk | 20 ⭐ in Welt 7 | getaktete Schleusen, blau und orange im Wechsel |
| 9 | Der Ausgang | 22 ⭐ in Welt 8 | alles gleichzeitig, volles Tempo |

Innerhalb jeder Welt wächst das Labyrinth, es kommen Chips und Gegner dazu und
das Gegnertempo steigt mit jedem Level.

### Laufbänder

Ein Band schiebt dich Feld für Feld in Pfeilrichtung weiter, sobald du die Tasten
loslässt. Steuerst du selbst, gewinnst du — Bänder nehmen dir die Kontrolle nur ab,
wenn du sie ihnen überlässt. Praktisch für Tempo, gefährlich vor einer Jägerroute.

### Schleusen

Blaue und orange Schleusen wechseln im Takt: ist die eine Gruppe offen, ist die
andere zu. Kurz vor dem Umschalten blinken sie. Sie sperren auch deine Verfolger —
eine sich schließende Schleuse zwischen dir und einem Jäger ist der beste Schutz
im Spiel. Wer beim Schließen mitten drin steht, wird nicht zerquetscht, sondern
wartet einfach ab.

## Gegner

* **Jäger** (rot, Pfeil) — berechnen laufend den kürzesten Weg zu dir. Du bist
  schneller als sie: halte etwa drei Felder Abstand, dann kommst du überall vorbei.
* **Wächter** (orange, Raute) — laufen schnell geradeaus und biegen erst an Wänden ab.

Am Levelstart blinken alle Gegner kurz und stehen still — in dieser Zeit kann dir
nichts passieren, du hast sie zum Planen der Route.

In den späten Welten werden die Gegner selbst zum Werkzeug: Schleusen sperren auch
sie aus, und ein Laufband, das sie in die falsche Richtung trägt, gibt es nicht —
Bänder wirken nur auf dich.

## Grafik

Alles wird zur Laufzeit auf Canvas gezeichnet, keine Bilddateien:

* **Beleuchtung** — Gänge liegen im Licht, die Wandmasse bleibt schwarz; an jeder
  Wandkante sitzt ein Lichtsaum, davor eine weiche Verschattung, die den Gang
  vertieft. Chips, Boosts, Lava, Portale und der Spieler sind eigene Lichtquellen.
* **Leuchtschleier** — ein zweiter Durchgang zeichnet nur die leuchtenden Objekte
  in einen Viertelpuffer, weichgezeichnet und additiv darübergelegt. Wände bleiben
  dadurch scharf, während Neon wirklich strahlt.
* **Eigener Look pro Welt** — blinkende Rack-LEDs, Rohre, Eisrisse, glühende
  Magmaspalten, Sternenstaub, Terminalplatten; dazu passende Boden- und Wandfarben.
* **Figuren** — der Läufer mit Schubdüse, Blickrichtung und einem Leuchtring je
  eingesammeltem +1; Jäger als Drohne mit rotierenden Segmenten und einem Auge,
  das dir folgt; Wächter als Sägeblatt.
* **Partikel und Wucht** — Funken beim Einsammeln, Explosion beim Tod, Glutflocken
  über Lava, Bildschirmruckeln und kurze Farbblitze.
* **Menü** — im Titelbildschirm läuft eine echte Verfolgungsjagd im Hintergrund,
  jede Weltkarte zeigt eine gerenderte Vorschau ihrer eigenen Optik.

Läuft in reiner Software-Rasterung (ohne GPU) in allen Welten mit rund 60 Bildern
pro Sekunde.

## Technik

Eine einzige Datei, kein Build, keine Abhängigkeiten: HTML + Canvas + Vanilla JS.
Die 72 Level werden deterministisch aus einem Seed erzeugt (Recursive-Backtracker-
Labyrinth mit aufgebrochenen Schleifen), Erreichbarkeit ist per BFS geprüft.
Der Hintergrund jedes Levels wird einmal in einen Offscreen-Canvas gebacken; pro
Bild kommen nur noch Animation, Figuren, Licht und Leuchtschleier dazu.

Fortschritt löschen: Hauptmenü → „FORTSCHRITT LÖSCHEN".

## Tests

```bash
node tests/levels.test.js       # erzeugt alle 72 Level, prüft Erreichbarkeit, Zeitlimits
                                # und die Platzierung von Eis, Lava, Bändern und Schleusen
npm install                     # nur für die Browser-Tests (Playwright)
node tests/playthrough.test.js  # spielt W1L1 automatisch durch: Sieg, Sterne, Freischaltung
node tests/mechanics.test.js    # prüft Laufbänder und den Takt der Schleusen im Spiel
```
