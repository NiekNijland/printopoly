# QA-ronde 1: editor en edities

Functionele test in een echte browser (Sail, Browser-paneel), 20 november 2026. Desktop 1440 px en telefoon 390 px, NL en EN. Inloggen met Google kan lokaal niet, dus de ingelogde stromen liepen via een tijdelijke testroute die niet is gecommit. De printpagina en printpipeline zijn niet getest (andere branch).

## Wat is getest

- Landing, Editie maken met thema Riso en alle onderdelen aan, editor opent.
- Bord: muis en pijltjestoetsen (één tabstop, Tab verlaat het bord), namen met umlaut, emoji en HTML-tekens.
- Foto's: JPEG en PNG goed; TIFF en een bestand van 143 MB geweigerd met een duidelijke melding; zoom, draaien, zwart-wit, slepen; ongedaan maken en opnieuw.
- Controle-lijst en de link naar het vak, kaarten voor- en achterkant en bedragen, geldkleur en banknaam, doosdeksel met middenlagen (slepen, schalen), pionnen.
- Instellingen: thema, taal, onderdelen aan en uit, andere bordmaat met foute en goede waarden. Herladen: alles blijft staan.
- Twee vensters: bus voegt samen; een echt conflict (zelfde edit in IndexedDB) toont de keuze en beide knoppen werken.
- Mijn edities: hernoemen, dupliceren, verwijderen met bevestiging, lege staat, voorbeeldeditie "Begin met deze als basis".
- Ingelogd: import na login, autosave naar het account, 409 bij een nieuwere accountversie, uitloggen wist de lokale kopie, account verwijderen met e-mailbevestiging.
- 390 px: landing, Nieuwe editie, Mijn edities, editor (bord, vak). Console en netwerk.

## Gevonden en opgelost

| # | Wat was er mis | Oplossing | Test |
| --- | --- | --- | --- |
| 1 | Nieuwe editie: bij "Kans en Algemeen Fonds" stond dezelfde tekst nog eens als toelichting | Eigen toelichting in `lang/nl.json` en `lang/en.json` | tekst gecontroleerd in de browser |
| 2 | Fotofout (TIFF, te groot) bleef staan, ook na een geslaagde upload en bij een ander vak | Fouten wissen bij een nieuwe keuze en bij een ander element (`element-panel.tsx`) | `element-panel.test.tsx` |
| 3 | Doosdeksel en bordmidden: "Tekst toevoegen" en "Foto toevoegen" liepen buiten het zijpaneel op 1440 px | `min-w-0 px-2` in `layer-panel.tsx` | `element-panel.test.tsx` (klassen) |
| 4 | Na "Die van het andere venster" bleef de status op "Opslaan…" staan | `SaveStatusMachine` zet de status op opgeslagen bij `remote-update` | `save-status.test.ts` |
| 5 | Mijn edities: de miniatuur toonde na hernoemen nog de oude naam | `EditionThumbnail` laadt opnieuw bij een nieuwe `updatedAt` | `editions.test.tsx` |
| 6 | Landing op 390 px scrolde 4 px opzij door het geldkaartje bij de stickerschets | `overflow-x-clip` op de stickersectie | `home.test.tsx` |
| 7 | Ingelogd: verwijderen, hernoemen en dupliceren in Mijn edities raakten alleen de browser. Een verwijderde editie kwam bij de volgende keer terug uit het account | `lib/editor/account-actions.ts`: het account gaat mee; bij verwijderen eerst het account, mislukt dat dan blijft alles staan | `account-actions.test.ts`, `edition-card.test.tsx` |
| 8 | Kaart zei na import nog "In deze browser" en de verwijdertekst "staat alleen in deze browser" | "In je account" en een eigen verwijdertekst (`editions.where_account`, `editions.delete_body_account`) | `edition-card.test.tsx` |
| 9 | Mislukte actie in de hernoem- of verwijderdialoog: de foutmelding stond achter de modal | Melding ook in de dialoog | `edition-card.test.tsx` |
| 10 | "1 edities staan nu in je account", "Je 1 edities staan alleen…", "1 dingen om naar te kijken" | Enkelvoud en meervoud via `useTranslationChoice` en `{1}…\|[2,*]…` in beide talen | `sync-dialog.test.tsx` |
| 11 | Geen sneltoets voor ongedaan maken buiten tekstvelden | Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z en Ctrl+Y in `editor-workspace.tsx`; in invoervelden blijft het native gedrag | `editor-shortcuts.test.tsx` |
| 12 | Na een klik op een Controle-melding stond de focus op `body` | Focus naar het veld van de melding (`data-field`), anders naar de fotokader-weergave of het voorbeeldvak | `editor-shortcuts.test.tsx` |
| 13 | Bordmaatfouten niet aan de velden gekoppeld; "foto's blijven op hun plek" stond ook bij een ongeldige maat | `aria-describedby` en `aria-invalid` op A, B en C; die toelichting verdwijnt zolang de maat ongeldig is | `editions.test.tsx` |
| 14 | Een beschadigde editie in IndexedDB gaf "je browser blokkeert opslag" | `CorruptEditionError` met eigen melding ("deze editie in je browser is beschadigd, je andere edities werken gewoon"); de lijst slaat zo'n editie al over | `save-status.test.ts`, `session.test.ts`, `indexeddb-storage.test.ts` |
| 15 | Nieuwe editie laadde alle paginachunks voor, ook `heic-to` | `Vite::prefetch` weg; `heic-to` laadt al alleen bij een HEIC-bestand (`ingest.ts`) | `EditorRoutesTest` |
| 16 | Kop van Mijn edities zei "in deze browser" terwijl je bent ingelogd | `editions.lead_account`: "Edities in je account: n" | `editions.test.tsx` |
| 17 | Een vastgelopen run (dode worker) bleef bezig; Opnieuw proberen kon niet | Na `STALE_AFTER_MINUTES` (10) tellen actieve onderdelen als mislukt; `PrintRunStarter` zet de run eerst actief | `PrintPipelineTest` |

## Nog open

- Bij een conflict met het account staat "ander venster" in de tekst (volgt het design). "Ander apparaat" past beter.
- Het vak "Tab"-balk van de onderdelen (Bord, Kaarten, Geld, Doos) heeft rollen van tabs zonder pijltjestoetsen of tabpanelen.
- Lokaal delen alle poorten op `localhost` hun cookies: een tweede Sail-project op een andere poort wist de sessie. Test ingelogd op `127.0.0.1`.
- Een beschadigde editie wordt in Mijn edities overgeslagen zonder melding; alleen bij opslaan in de editor staat een eerlijke tekst.

Handmatig gecontroleerd op 390 px (Sail, Browser-paneel): "Verouderd, opnieuw maken" en een los onderdeel (Kaarten) lopen niet over, en Opnieuw proberen na een mislukte run start hem weer en eindigt op Klaar.
