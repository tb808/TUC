# TUC — Tyler’s Ultimate Championship

Ein eigenständiger, spielbarer MMA-Prototyp für Desktop-Browser. Ein Oktagon, zwei eigene prozedurale Kämpfer, fünf KI-Stufen und drei Runden à drei Minuten. Keine fremden Spielmodelle oder UFC-Assets.

## Spielen

Unter Windows **Start-TUC.cmd** doppelklicken. Das Fenster offen lassen; der Browser öffnet `http://127.0.0.1:5173/`. Chrome oder Edge mit aktiviertem WebGL verwenden. Der Server ist ausschließlich an die lokale Loopback-Adresse gebunden.

Alternativ im Projektordner:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1
```

Die Abhängigkeiten sind bereits installiert. Auf einem neuen Rechner werden Node.js 22.12+ oder 24 und `npm install` benötigt. Auf diesem Rechner ist die globale npm-Verknüpfung fehlerhaft; ohne systemweite Änderungen funktioniert:

```powershell
$env:NODE_USE_SYSTEM_CA='1'
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
```

`NODE_USE_SYSTEM_CA` verwendet den Windows-Zertifikatsspeicher; die TLS-Prüfung wird nicht abgeschaltet. Der Build läuft danach vollständig lokal. Die optionalen Webfonts werden von Google Fonts geladen; ohne Verbindung werden Systemschriften verwendet.

## Steuerung

| Eingabe | Stand | Boden |
| --- | --- | --- |
| WASD | Bewegen: W/S Tiefe, A/D seitlich | Richtung für Übergang |
| J / K | Jab / Cross; Shift = Haken, Strg = Körper | Ground-and-Pound von oben |
| U / I | Low-Kick; Strg = Body-Kick, Shift = High-Kick | U = Armbar von oben aus Mount |
| Leertaste | Hohe Deckung; Strg = tiefe Deckung / Sprawl | Übergang und Submission verteidigen |
| A / D + Deckung | Seitliches Ausweichen | — |
| G | Clinch / Clinch-Kontrolle | Positionswechsel, mit WASD |
| Shift + G | Takedown, auch aus Clinch | Positionswechsel |
| R | Clinch lösen | Von oben aufstehen; von unten erst befreien |
| G halten | — | Armbar vorantreiben |
| Esc | Pause | Pause |
| F3 | Debugansicht einschließlich Trefferkugeln | Debugansicht |

Schläge benötigen die richtige Distanz. Ausdauer steuert Schlagkraft und Handlungsfähigkeit. Dauernde Deckung verbraucht bei Treffern Kraft. Gegnerische Takedowns werden mit tiefer Deckung vor dem Abschluss abgewehrt.

Am Boden arbeitet sich der obere Kämpfer mit **G** von Guard über Half Guard und Side Control bis Mount vor. **S + G** gibt als oberer Kämpfer eine Position ab. Der untere Kämpfer verbessert mit **G** seine Position und kann aus Guard einen Sweep ausführen. Leertaste blockiert Übergänge, sofern ausreichend Ausdauer vorhanden ist. In Mount startet **U** die Armbar; danach **G halten**, während der Verteidiger die Leertaste hält. Die Ausdauer entscheidet mit darüber, ob die Aufgabe gelingt.

## Enthalten

- Standkampf, Clinch, Takedowns mit Sprawl, vier Bodenpositionen, Sweeps, Ground-and-Pound, Aufstehen, eine Armbar.
- KO, TKO durch wiederholte Niederschläge, Körperabbruch oder unbeantwortete Bodenschläge, Submission und vereinfachte 10-Punkte-Wertung.
- Getrennte Kopf-, Körper- und Beinschäden, Gleichgewicht und Ausdauer; Verletzungsfärbung, Schwellung, dezente Blut-/Schweißpartikel.
- Prozedurale Animationen, gewichtete Trefferreaktionen, kurze Trefferpausen, Kameraimpuls, synthetisierte Web-Audio-Treffer und Glocke.
- Gedämpfte Rapier-Gelenke für physikalische Oberkörperreaktionen. Die autoritative Trefferlogik und Oktagongrenzen sind deterministisch und vom Renderer getrennt.
- Fünf KI-Stufen mit identischen Körperwerten; Unterschiede betreffen Reaktionszeit, Deckung, Kombinationen, Distanz, Ausdauer und Grappling. Die KI liest nur sichtbaren Kampfzustand, keine zukünftigen Eingaben.
- Pause bei Fokusverlust, Neustart, Revanchieren, Tastaturhilfe, zwei Grafikstufen, minimale Statusanzeige und Entwicklerdiagnose.

## Architektur und Erweiterung

`src/game` enthält die unabhängige 60-Hz-Simulation, Regeln, Techniken, Zustände, KI, Audio und Eingaben. `src/render` erzeugt Arena, Kamera, Kämpfer und ergänzende Physik. `src/main.ts` verbindet Oberfläche und Spielschleife. Neue Techniken und KI-Profile werden in `src/game/config.ts` konfiguriert.

Die Kämpfer besitzen ein hierarchisches Bone-Rig. `FighterRig.loadGLB(url)` tauscht das prozedurale Modell nach erfolgreicher Prüfung gegen ein kompatibles eigenes GLB aus. Der Vertrag: Meter als Einheit, +Z nach vorn, Bones `hips`, `spine`, `head`, `leftUpperArm`, `rightUpperArm`, `leftForeArm`, `rightForeArm`, `leftThigh`, `rightThigh`, `leftShin`, `rightShin`. Lokale Ruheachsen entsprechen dem Prototyp: Arme/Beine nach -Y, Oberkörper +Y. Nicht passende GLBs werden abgelehnt; das sichtbare Ersatzmodell bleibt erhalten. Materialien, Texturen und Geometrien müssen mitgeliefert werden. Fremde Rigs benötigen Retargeting.

Nur im Entwicklungsserver existiert `window.__TUC__` für automatisierte Browserprüfungen. Der Produktionsbuild entfernt diesen Testzugang. Es gibt keine Netzwerk-Spiel-API und keine Konten oder Serverdaten.

## Prüfen und bauen

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node node_modules/playwright/cli.js install chromium
node node_modules/playwright/cli.js test
node node_modules/vite/bin/vite.js build
```

Alternativ mit funktionierendem npm: `npm test`, `npm run test:e2e`, `npm run build`. Der Build landet in `dist/`; lokal prüfen mit `node node_modules/vite/bin/vite.js preview`.

Tests decken Trefferzeitfenster und Reichweite, Verteidigung, Ressourcen, erlaubte Aktionen, Arena, Pause, Runden, Wertung, sämtliche Kampfenden, Grappling-Ablauf sowie seeded KI-Vergleiche ab. Browserprüfungen bedienen das Menü, kämpfen per Tastatur, pausieren, spielen einen beschleunigten vollständigen Kampf, starten eine Revanche und schließen den Grappling-Loop per Tastatur mit einer Submission ab. Screenshots liegen in `output/playwright/`.

## Prototypgrenzen

Die eigenen Kämpfer und Bewegungen sind bewusst ein funktionaler Prototyp, keine fotorealistischen Modelle oder Motion-Capture-Animationen. Treffer verwenden vereinfachte Körpervolumen statt einer vollphysikalischen Hautsimulation; Bodenkampf arbeitet mit diskreten Positionen. Die Punktrichterwertung ist eine transparente Spielregel, kein vollständiger offizieller MMA-Regelkatalog.

60 FPS bei 1080p sind das Ziel, keine Hardwaregarantie. Hohe Qualität nutzt Schatten, höhere Auflösung und Trefferpartikel; niedrig reduziert diese Last. F3 zeigt die tatsächliche Bildrate. Keine zusätzlichen Arenen, Karriere, Multiplayer, Gamepad oder Touchsteuerung in dieser Version.
