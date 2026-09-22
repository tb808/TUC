# TUC — Tyler’s Ultimate Championship

TUC ist ein spielbarer MMA-Prototyp für den Desktop-Browser. Steige in den Oktagon, wähle eine von fünf Schwierigkeitsstufen und versuche, deinen Gegner im Stand oder am Boden zu besiegen.

Ein Kampf geht über bis zu drei Runden à drei Minuten. Du kannst durch KO, TKO, Aufgabe oder nach Punkten gewinnen.

## Empfohlener Einstieg: Training

Starte zuerst den **Trainingsmodus**. Dort führt dich ein Coach Schritt für Schritt durch drei Lektionen:

- **Grundlagen:** Bewegung, Jab und Deckung
- **Striking:** Jab, Cross, Low-Kick und Body-Kick
- **Grappling:** Clinch, Takedown, Half Guard, Side Control und Mount

Im **freien Training** kannst du alle Techniken ohne Zeitdruck ausprobieren. Der Trainingsdummy greift nicht an und der Modus endet nicht durch KO oder TKO.

## Spiel starten

Unter Windows einfach **Start-TUC.cmd** doppelklicken. Kurz darauf öffnet sich das Spiel automatisch im Browser.

Am besten funktioniert TUC mit einer aktuellen Version von Chrome oder Edge. Das Startfenster muss während des Spielens geöffnet bleiben.

## Steuerung

### Im Stand

| Taste | Aktion |
| --- | --- |
| **WASD** | Bewegen |
| **J / K** | Jab / Cross |
| **Shift + J / K** | Haken |
| **Strg + J / K** | Körperschlag |
| **U / I** | Low-Kick |
| **Strg + U / I** | Body-Kick |
| **Shift + U / I** | High-Kick |
| **Leertaste** | Kopf decken |
| **Strg + Leertaste** | Körper decken und Takedowns abwehren |
| **G** | Clinch beginnen oder kontrollieren |
| **Shift + G** | Takedown versuchen |
| **R** | Clinch lösen |

### Am Boden

| Taste | Aktion |
| --- | --- |
| **W / A / S / D** | Angezeigten Positionswechsel direkt starten |
| **J / K** | Ground-and-Pound aus der oberen Position |
| **Leertaste** | Positionswechsel oder Aufgabeversuch verteidigen |
| **U** | Aus der Mount eine Armbar ansetzen |
| **U halten** | Armbar weiter durchziehen |
| **R** | Aufstehen, wenn es die Position erlaubt |

Mit **Esc** pausierst du den Kampf.

## So gewinnst du

- **KO:** Dein Gegner kann nach einem schweren Treffer nicht weiterkämpfen.
- **TKO:** Der Kampf wird nach mehreren Niederschlägen, schweren Körpertreffern oder unbeantworteten Schlägen am Boden beendet.
- **Aufgabe:** Du bringst deinen Gegner mit einer Armbar zum Abklopfen.
- **Punktsieg:** Läuft der Kampf über alle Runden, entscheiden Wirkung, Aktivität und Kontrolle.

## Tipps für den ersten Kampf

- Beginne auf der Schwierigkeitsstufe **Einsteiger**, um Abstand und Timing kennenzulernen.
- Schläge treffen nur aus der passenden Entfernung. Bewege dich nach einer Kombination wieder aus der Reichweite.
- Behalte deine Ausdauer im Auge. Angriffe, Deckung und Bodenkampf kosten Kraft.
- Eine dauerhafte Deckung schützt dich nicht kostenlos: Treffer auf die Deckung verbrauchen ebenfalls Ausdauer.
- Wehre einen Takedown rechtzeitig mit **Strg + Leertaste** ab.
- Am Boden zeigt das Richtungsmenü, welche Position du mit **W**, **A**, **S** oder **D** erreichst. Ein einzelner Tastendruck genügt.
- Aus der Mount kannst du mit **U** eine Armbar starten und sie anschließend mit gehaltenem **U** beenden.

## Was ist enthalten?

- Fünf Schwierigkeitsstufen von Einsteiger bis Champion
- Vollständiger Fight-Night-Walkout mit Kommissionscheck, Begleitteam, Cageside-Kontrolle, Käfigeinzug, Ringansage und Referee-Instruktionen
- Geführter Trainingsmodus mit drei Lektionen und passivem Übungsgegner
- Freies Training zum gefahrlosen Ausprobieren aller Techniken
- Standkampf mit Schlägen, Tritten, Deckung und Ausdauer
- Clinch, Takedowns und Takedown-Abwehr
- Bodenkampf mit mehreren Positionen, Sweeps und Ground-and-Pound
- KO, TKO, Aufgabe und Punktrichterentscheidung
- Drei Runden, Pausenfunktion, Neustart und Revanche
- Zwei Grafikstufen für unterschiedliche Rechner
- Fünf detaillierte Arenen mit eigener Lichtstimmung, Kulisse und animiertem Publikum

## Gut zu wissen

TUC ist ein eigenständiger Prototyp. Kämpfer und Bewegungen wurden speziell für das Spiel erstellt und sind bewusst einfacher gehalten als in einer großen kommerziellen Sportsimulation.

Diese Version bietet fünf Arenen und Kämpfe gegen den Computer. Multiplayer, Karriere-Modus, Gamepad- und Touch-Steuerung sind derzeit nicht enthalten.

## Für Entwickler

Wer das Projekt bearbeiten möchte, benötigt Node.js. Nach `npm install` lässt sich das Spiel mit `npm run dev` starten. Tests und Produktions-Build stehen über `npm test` und `npm run build` zur Verfügung.
