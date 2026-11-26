# UX-pass

Branch `feat/ux-pass`, 20 november 2026. Gebouwd op `fix/qa-rest`.

## Sneltoetsen in de editor

Alles staat in `lib/editor/shortcuts.ts`; de handler (`hooks/use-editor-shortcuts.ts`), de helpdialoog en de tooltips (`title` en `aria-keyshortcuts`) lezen dezelfde lijst. `?` of de toetsenbordknop in de header opent de dialoog "Sneltoetsen".

| Toets | Doet |
| --- | --- |
| J of ] / K of [ | volgend / vorig element |
| 1 tot 4, Alt+1 tot 4 | Bord, Kaarten, Geld, Doos |
| C | Controle open of dicht |
| F2, Enter | naar het naamveld (Enter alleen als er geen knop of link focus heeft) |
| P, R, B, + en − | foto kiezen, kwartslag, zwart-wit, zoom |
| pijltjes | foto verschuiven (bestond al, met het fotokader gekozen) |
| Ctrl/Cmd+S | toont "Opgeslagen" (autosave bestond al) en spoelt de opslag door |
| Ctrl/Cmd+P | naar de printpagina in plaats van het printvenster van de browser |
| Ctrl/Cmd+Z, Shift+Z, Ctrl+Y | ongedaan maken en opnieuw (QA-ronde) |
| Esc | sluit een dialoog; sluit Controle en zet de focus terug op de knop |

Regels: geen enkele toets werkt terwijl je in een tekstveld typt of terwijl een dialoog open staat (behalve Ctrl/Cmd+S en +P in een veld). Browsercombinaties (Ctrl+R, Cmd+C, Alt+letter) blijven met rust. Losse letters kunnen uit in de dialoog (WCAG 2.1.4, schermlezers); die keuze staat in `localStorage`. De gekozen rij in de lijst scrolt in beeld bij J en K.

Tests: `lib/editor/shortcuts.test.ts` (toetsentabel) en `components/editor/editor-keyboard.test.tsx` (in de editor).

## Soepeler lopen

- Nieuwe editie: de cursor staat in de naamveld met de voorgestelde naam geselecteerd; Enter maakt de editie; de knop zegt "Editie wordt gemaakt…" tijdens het maken.
- Naam wijzigen: de naam staat geselecteerd. Knoppen in de kaart zijn uitgeschakeld terwijl een actie loopt, dus geen dubbele klik nodig of mogelijk.
- Mijn edities: na hernoemen, dupliceren en verwijderen staat er een statusregel (voorgelezen via `role="status"`). Na verwijderen gaat de focus naar de kaart die op die plek komt, anders naar de kop.
- Dialogen faden in (0,15 s); met `prefers-reduced-motion` verdwijnen alle overgangen en animaties (globale regel in `app.css`).
- Formulierlabels en `legend` hebben nu dezelfde maat (14 px, 600).

## Alignment en responsiveness

Zie de sweep onderaan.

## Niet gedaan

- Optimistische updates in Mijn edities: opslaan in IndexedDB is zo snel dat dit niets won; bij het account blijft de volgorde "eerst account" bewust.
- Layout-tegels in het veldenpaneel zijn met opzet niet aangeraakt (Niek haalt de keuze weg).
- Geen volledige sweep op 360, 414, 1024, 1440 en 1920 px; alleen 320, 390, 768 en 1280.
