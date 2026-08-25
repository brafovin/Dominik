# KEYBOARD ESCAPE +1

Ein Tastatur-Fluchtspiel im Browser. Du steckst in einem System fest: sammle alle
Datenchips, schnapp dir die **+1 Geschwindigkeit**-Boosts und erreiche das Portal,
bevor dich die Jäger kriegen oder die Zeit abläuft.

**Kein Setup, kein Server:** `index.html` im Browser öffnen — fertig.

## Umfang

| | |
|---|---|
| Welten | 6 |
| Level pro Welt | 8 (insgesamt 48) |
| Sterne | bis zu 144 ⭐ |
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
| 6 | Der Ausgang | 18 ⭐ in Welt 5 | alles gleichzeitig, volles Tempo |

Innerhalb jeder Welt wächst das Labyrinth, es kommen Chips und Gegner dazu und
das Gegnertempo steigt mit jedem Level.

## Gegner

* **Jäger** (rot, Pfeil) — berechnen laufend den kürzesten Weg zu dir. Du bist
  schneller als sie: halte etwa drei Felder Abstand, dann kommst du überall vorbei.
* **Wächter** (orange, Raute) — laufen schnell geradeaus und biegen erst an Wänden ab.

Am Levelstart blinken alle Gegner kurz und stehen still — Zeit, den Weg zu planen.

## Technik

Eine einzige Datei, kein Build, keine Abhängigkeiten: HTML + Canvas + Vanilla JS.
Die 48 Level werden deterministisch aus einem Seed erzeugt (Recursive-Backtracker-
Labyrinth mit aufgebrochenen Schleifen), Erreichbarkeit ist per BFS geprüft.

Fortschritt löschen: Hauptmenü → „FORTSCHRITT LÖSCHEN".

## Tests

```bash
node tests/levels.test.js       # erzeugt alle 48 Level und prüft Erreichbarkeit + Zeitlimits
npm install                     # nur für den zweiten Test (Playwright)
node tests/playthrough.test.js  # spielt W1L1 automatisch durch: Sieg, Sterne, Freischaltung
```
