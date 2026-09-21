# TUC – geprüfter Stand, 21. September 2026

- TypeScript-Prüfung ohne Fehler.
- 32 Unit-/Integrationstests bestanden, darunter vollständige Matches auf allen fünf KI-Stufen, Treffergeometrie, Deckung, Ressourcen, Runden, Kampfenden und Grappling. Neue Prüfungen decken durchgängige Schlagkurven, Rückstoß ohne Positionssprung, Fußkontakt, eingefrorene Posen und endliche Gelenkrotationen ab.
- Physiktest bestätigt stärkere Auslenkung bei schweren Treffern und gedämpfte Rückkehr in die Grundhaltung.
- 2 Playwright-Browserabläufe bestanden: Menü, Kampf, Pause, Ende, Revanche und Hauptmenü; außerdem Clinch, Takedown, sämtliche Bodenpositionen und Armbar-Sieg mit Tastatur. Abschließender Lauf mit `playwright.software.config.ts`: Desktop-Layout bei 1440×900, halbe Rasterauflösung, 1,5 Minuten Gesamtdauer. Der erste Lauf mit voller Rasterauflösung bestand den normalen Kampfablauf, überschritt beim Submission-Ablauf aber das Zeitlimit.
- Zehn feste Kampfsituationen im echten Browser aufgenommen und zentrale Stand-, Schlag-, Tritt- und Bodenposen visuell geprüft. Nach Korrekturen vier Situationen erneut aufgenommen; keine JavaScript-Browserfehler. Reproduktion mit `node scripts/review-animation.mjs` bei laufendem Entwicklungsserver.
- Produktionsbuild erfolgreich. Hinweis des Bundlers: großer JavaScript-Chunk durch Three.js und die eingebettete Rapier-WASM-Laufzeit; rund 1005 KB gzip.

## Leistungsmessung

Der verfügbare headless Chromium verwendet **ANGLE / SwiftShader**, also CPU-Rendering. Eine Messung während der Grafiküberarbeitung bei 1920×1080 ergab rund **0,9 FPS** in hoher und **1,3 FPS** in niedriger Qualität (nur 8 beziehungsweise 11 Samples). Das ist langsamer als der zuvor dokumentierte Prototyp (3,5 / 7,2 FPS); die detaillierteren Materialien und Geometrien erhöhen die Renderlast. Nachfolgende visuelle Korrekturen sind kein neuer Leistungsnachweis. Eine Messung des finalen Stands mit echter GPU steht aus; 60 FPS sind nicht bestätigt.

Starre Mesh-Teile werden weiterhin zusammengefasst; Tribünenbesucher und Sitzreihen nutzen Instanzen. Die genannte Messung meldete 106 beziehungsweise 104 Zeichenaufrufe. Niedrige Qualität schaltet Schatten aus, reduziert die interne Auflösung auf 80 % und verzichtet auf neue Trefferpartikel. Rohdaten stehen in `output/playwright/performance.json`. Die reproduzierbare Messung startet mit `node scripts/measure-browser.mjs`, während der Entwicklungsserver läuft.

## Visuelle Grenzen

Die Modelle sind eigene, prozedurale, vereinfachte Humanoide mit Bone-Hierarchie. Animationen und Bodenkampfpositionen sind ein funktionaler Ausgangspunkt; der Stand ist nicht mit fotorealistischen Konsolen-MMA-Spielen gleichzusetzen. Die kompatible GLB-Schnittstelle ist für spätere hochwertige eigene Modelle vorbereitet. Audio wird synthetisiert. Die physikalischen Reaktionen ergänzen die Animationen und simulieren keinen vollständig physikalischen menschlichen Körper.
