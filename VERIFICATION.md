# TUC – geprüfter Stand, 30. September 2026

## Implementierung

Das vorhandene Three.js-/Rapier-Spiel wurde erweitert. Rig, Fuß-IK, Training, Rundenlogik und aktive Defense bleiben Grundlage.

- Kontakt prüft die gemeinsame Schlagkurve erst während tatsächlicher Extension. Gemessene Tip-Geschwindigkeit, Winkel, Balance, Stamina, Gegnerbewegung und Konter beeinflussen die Wirkung. Jab, Cross und Hook erhalten unterschiedliche Hüft-/Schulterrotation; die freie Hand schützt den Kopf.
- Leichte Reaktionen bleiben additiv. Schwere Treffer unterbrechen Attacken; Hurt, Stunned und Rocked erholen sich über Zeit. Niederschläge unterscheiden Rückwärts-, Seiten- und Kniepose und blenden in die Erholung. Check-/Parry-Fenster passen zum späteren Kontaktzeitpunkt.
- Full Guard, Half Guard, Side Control, Mount, Back Control und Turtle sind über zeitbasierte, abwehrbare Transitionen verbunden. Stamina und Positionskontrolle beeinflussen deren Dauer. Treffer können laufende Versuche abbrechen.
- Ground-and-Pound erhält kurze Schläge, Hooks, Hammerfists, Körpertreffer und Posture. Ein Kontaktpass nach beiden Fighter-Updates richtet Schlag- und Frame-Hände per Zweiknochen-IK auf den tatsächlichen Gegner aus. Die Armbar wird um einen Rear Naked Choke aus Back Control ergänzt.
- Fighter unterscheiden sich zusätzlich in Reichweite, Größe, Gewicht, Recovery, Wrestling, Submission und Startauslage. Hautmikrostruktur, Muskelkonturen, Schweiß und Publikumsbeleuchtung wurden überarbeitet.
- Kamera berücksichtigt Seitenverhältnis und Knockdowns. Leichte Treffer erzeugen keinen Shake; schwere Treffer nur kleine Impulse und maximal 32 ms Hit-Pause. Trefferpartikel verwenden einen begrenzten wiederverwendbaren Pool. Audio unterscheidet Kopf, Körper, Beine, Kicks, Blocks und Mattenkontakt; Schritte und ein leiser Raumklang ergänzen es.
- Neues dunkles Broadcast-HUD: zentrale Uhr, kompakte Fighter-Panels, verzögerter Schadenstrail, Stamina und vierteilige Körpersilhouette. Bodenaktionen erscheinen in den unteren Ecken; Treffer-/Combo-Hinweise bleiben klein.
- Unbenutzte Publikumsinstanzen am Weltursprung entfernt. Fokus wird nach Walkout und Pause wieder auf die Spielfläche gesetzt.

## Prüfungen

- **60 Tests in sechs Dateien bestanden.** Abgedeckt sind Treffergeometrie, Block, Stamina, aktive Defense, fünf KI-Stufen einschließlich kompletter Matches, Runden/Pause, KO/TKO/Submission, Sweep/Stand-up, Fußkontakt und eingefrorene Posen. Neue Tests prüfen Kontaktgeschwindigkeit und Auslagenspiegelung, Hurt/Recovery, drei Knockdown-Varianten, Back Control/Turtle/Choke, Posture und Body-Defense. Kontaktabstände und endliche Bones werden in allen sechs Bodenpositionen geprüft.
- **Fünf bestehende Browserabläufe bestanden** mit playwright.software.config.ts (4,3 Minuten): Menü/Kampf/Pause/Ende/Revanche; Tastatur-Clinch bis Armbar-Finish; alle Arenen; geführtes Training; erweiterte Strikes und Defense. Frühe Läufe während gleichzeitiger Browserarbeit und Live-Codeänderungen hatten Timeouts; der ungestörte Lauf bestand vollständig.
- **Neun finale Posen im Browser aufgenommen, ohne JavaScript-Fehler:** Stand, Guard, Mount, Back Control, Turtle, Choke, Ground-Hammerfist, Schadensanzeige und Knockdown. Die Liegepose wurde danach näher an die Matte gesetzt und erneut aufgenommen. Screenshots liegen in output/playwright/animation/; reproduzierbar mit node scripts/review-animation.mjs bei laufendem Vite-Server.
- TypeScript-Prüfung und Produktionsbuild bestanden. Der Bundle-Hinweis auf große Chunks besteht weiterhin: Three.js und eingebettetes Rapier-WASM ergeben rund **1,03 MB gzip** JavaScript.

## Leistungs- und Darstellungsgrenzen

Der Testbrowser verwendet Software-WebGL. Dieser wird erkannt und startet automatisch mit niedriger Grafikqualität, ohne Schatten. Der Nutzer kann die Qualität im Menü ändern. Es wurde keine abschließende FPS-Messung auf echter GPU durchgeführt; eine bestimmte Bildrate ist nicht bestätigt.

Fighter und Animationen bleiben eigene stilisierte prozedurale Humanoide. Die Verbesserungen ersetzen keine Scan-Modelle oder Motion-Capture-Assets. Kontakt wird über begrenzte IK und kontrollierte Physics-Reaktionen angenähert, nicht über eine vollständige physikalische menschliche Körpersimulation. Audio bleibt synthetisiert. Die vorhandene kompatible GLB-Schnittstelle ist weiterhin verfügbar.
