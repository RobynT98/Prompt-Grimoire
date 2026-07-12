<div align="center">
  <img src="icon.svg" alt="Prompt Grimoire" width="112" height="112">

# Prompt Grimoire

**Ett installerbart och offline-fungerande bibliotek för prompts, rollspel och karaktärer.**

Skriv, organisera och återanvänd prompts, starters, regler och karaktärsversioner direkt i appen — utan att behöva redigera filer i GitHub.

[Öppna appen](https://robynt98.github.io/Prompt-Grimoire/) · [Visa källkoden](https://github.com/RobynT98/Prompt-Grimoire)

</div>

---

## Om appen

Prompt Grimoire är en mobilvänlig PWA för material till rollspel och AI-chattar. Allt innehåll skrivs direkt i appen och sparas lokalt på enheten.

Designen använder en mörk, sober palett med skiffer, djupgrönt och silver. Gränssnittet är byggt för att vara tydligt även när biblioteket växer från några få idéer till en mindre förbjuden avdelning.

En karaktär kan ha flera separata versioner. **Tom Riddle** kan exempelvis finnas som barn, Hogwarts-elev, ung vuxen, vuxen eller i en alternativ tidslinje — utan att versionerna skriver över varandra.

## Funktioner

- **Markdown-editor** med skrivläge, delad vy och läsläge
- **Prompts, starters, rollspelsregler, karaktärer och fria anteckningar**
- **Flera versioner av samma karaktär**, med egen ålder, tidslinje och beskrivning
- **Samlingar / mappar** för exempelvis Hogwarts, Modern AU eller ett särskilt rollspel
- **Grupperad karaktärsvy** där versioner samlas under grundkaraktären
- **Sortering** efter senast ändrad, titel, skapad tid eller typ
- **Sökning** i titel, innehåll, taggar, samlingar och karaktärsfält
- **Taggar, favoriter och tydliga räknare**
- **Snabbknappar** för nya prompts, karaktärer och regler
- **Duplicering** av poster och karaktärsversioner
- **Kopiera text** med ett tryck
- **Automatisk lokal lagring** med IndexedDB
- **Import och säkerhetskopiering** av hela biblioteket som JSON
- **Offline-stöd** genom service worker
- **Installerbar som app** på mobil, surfplatta och dator

## Organisera biblioteket

Varje post kan placeras i en valfri **samling / mapp**. Några exempel:

- Hogwarts
- Grundregler
- Modern AU
- Mörka starters
- Ett särskilt pågående rollspel

Biblioteket kan sedan filtreras efter samling och sorteras på flera sätt. I vyn **Karaktärer** grupperas alla versioner automatiskt efter fältet *Grundkaraktär*.

## Karaktärer och versioner

Varje karaktärspost kan innehålla:

| Fält | Exempel |
|---|---|
| Grundkaraktär | Tom Riddle |
| Version | Hogwarts, 16 år |
| Ålder | 16 |
| Tidslinje eller AU | 1940-tal / Modern AU |
| Samling | Hogwarts |
| Beskrivning | Personlighet, utseende, bakgrund, relationer och regler |

Skapa flera poster med samma grundkaraktär men olika versionsnamn för att hålla varje rollspel tydligt åtskilt.

## Markdown

Editorn stöder bland annat:

```markdown
# Tom Riddle – Hogwarts, 16 år

## Personlighet
Tom är artig, kontrollerad och manipulativ.

## Rollspelsregler
- Han känner inte till framtida händelser.
- Han styr aldrig spelarens karaktär.

> Han talar lugnt även när han är arg.
```

## Lagring och integritet

Dina prompts och anteckningar skickas inte automatiskt till GitHub. De sparas lokalt i webbläsarens **IndexedDB** på den enhet där appen används.

Det betyder att:

- appen fungerar utan konto och internetanslutning
- innehållet inte automatiskt synkas mellan olika enheter
- data kan försvinna om webbläsarens webbplatsdata rensas

Använd därför knappen **Säkerhetskopiera** regelbundet och spara JSON-filen på en trygg plats. Säkerhetskopian kan senare återställas med **Importera**.

## Installera appen

### Android och dator

1. Öppna appen i en kompatibel webbläsare.
2. Tryck på **Installera** i appen eller webbläsarens installationsikon.
3. Prompt Grimoire öppnas därefter som en fristående app.

### iPhone och iPad

1. Öppna appen i Safari.
2. Tryck på **Dela**.
3. Välj **Lägg till på hemskärmen**.

## Publicera med GitHub Pages

1. Öppna repots **Settings**.
2. Gå till **Pages**.
3. Välj **Deploy from a branch** under *Build and deployment*.
4. Välj branch `main` och mappen `/ (root)`.
5. Tryck på **Save**.

Den förväntade adressen är:

```text
https://robynt98.github.io/Prompt-Grimoire/
```

> Repot är privat. GitHub Pages för privata repos beror på vilken GitHub-plan kontot använder. Om Pages inte kan aktiveras behöver repot göras offentligt eller publiceras via exempelvis Cloudflare Pages, Netlify eller Vercel.

## Projektstruktur

```text
Prompt-Grimoire/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── icon.svg
└── README.md
```

## Teknik

Projektet använder vanlig HTML, CSS och JavaScript utan ramverk eller byggsteg. Det gör appen lätt att publicera, förstå och underhålla.

---

<div align="center">
  <sub>Byggd för prompts, världar, karaktärer och alla de där idéerna som annars försvinner in i anteckningsapp nummer sjutton.</sub>
</div>
