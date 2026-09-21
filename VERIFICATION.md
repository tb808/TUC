# TUC – geprüfter Stand, 21. September 2026

- TypeScript-Prüfung ohne Fehler.
- 26 Unit-/Integrationstests bestanden, darunter vollständige Matches auf allen fünf KI-Stufen, Treffergeometrie, Deckung, Ressourcen, Runden, Kampfenden und Grappling.
- Physiktest bestätigt stärkere Auslenkung bei schweren Treffern und gedämpfte Rückkehr in die Grundhaltung.
- 2 Playwright-Browserabläufe bestanden: Menü, Kampf, Pause, Ende, Revanche und Hauptmenü; außerdem Clinch, Takedown, sämtliche Bodenpositionen und Armbar-Sieg mit Tastatur.
- Screenshots bei 1440×900 und 1920×1080 geprüft.
- Produktionsbuild erfolgreich. Hinweis des Bundlers: großer JavaScript-Chunk durch Three.js und die eingebettete Rapier-WASM-Laufzeit; rund 999 KB gzip.
- npm meldet nach Aktualisierung von Vitest keine bekannten Schwachstellen.

## Leistungsmessung

Der verfügbare headless Chromium verwendet **ANGLE / SwiftShader**, also CPU-Rendering. Gemessen bei 1920×1080: hohe Qualität rund **3,5 FPS**, niedrige Qualität rund **7,2 FPS**. Diese Umgebung erreicht das 60-FPS-Ziel nicht; eine Messung mit echter GPU steht aus. Die Werte dürfen nicht als Hardware-Benchmark oder Nachweis für 60 FPS interpretiert werden.

Das Zusammenfassen starrer Mesh-Teile reduziert die Zeichenaufrufe von etwa 152 auf 75; niedrige Qualität schaltet Schatten aus, reduziert die interne Auflösung auf 70 % und verzichtet auf neue Trefferpartikel. Rohdaten stehen in `output/playwright/performance.json`. Die reproduzierbare Messung startet mit `node scripts/measure-browser.mjs`, während der Entwicklungsserver läuft.

## Visuelle Grenzen

Die Modelle sind eigene, prozedurale, vereinfachte Humanoide mit Bone-Hierarchie. Animationen und Bodenkampfpositionen sind ein funktionaler Ausgangspunkt; der Stand ist nicht mit fotorealistischen Konsolen-MMA-Spielen gleichzusetzen. Die kompatible GLB-Schnittstelle ist für spätere hochwertige eigene Modelle vorbereitet. Audio wird synthetisiert. Die physikalischen Reaktionen ergänzen die Animationen und simulieren keinen vollständig physikalischen menschlichen Körper.
