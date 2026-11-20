# Fixes na testronde 2

Branch `fix/feedback-ronde-2`. Elke fix heeft een test. De fotofix voor productie (https-uitsneden) staat al op main en is hier niet opnieuw gedaan.

## Opgelost

1. **Speelgeld faalt bij 7 biljetkleuren (Lettele).** Lokaal reproduceert het met kleine vellen niet. De oorzaak in de code: de Chrome-driver kreeg 5 seconden (`LARAVEL_PDF_CHROME_OPERATION_TIMEOUT=5000`) om een heel PDF te printen. 210 biljetten met foto's duren op de server langer, dus de taak brak af. Het timeout heeft nu een ondergrens van 2 minuten, ook als de `.env` op de server nog 5000 zegt. Een mislukt onderdeel toont nu de reden (te lang, foto's, bladplan, editie, onbekend) in plaats van alleen "mislukt". Controleer na de deploy of de server-`.env` de oude waarde heeft; die wordt nu genegeerd. Niet bevestigd op productie.
2. **Verouderde waarden in de editor.** Een getypte tekst bleef bij het element hangen dat toevallig volgde als het veld de focus hield. Concepten horen nu bij hun element (naam, tekst, bedrag, plaatsnaam, banknaam).
3. **Escape en Enter in een tekstveld.** Escape verlaat elk tekstveld, Enter een veld van één regel; de focus gaat terug naar het geselecteerde vak op het bord. Het sneltoetsenvenster zegt dat.
4. **Meerdere foto's tegelijk.** Alleen straten, stations, nutsbedrijven, hoeken en alles buiten het bord (behalve het bordmidden) krijgen een foto. Kans, Algemeen Fonds en belasting worden overgeslagen en de editor meldt waar de foto's heen gingen. Die vakken tonen ook geen fotoveld meer.
5. **Voortgang op de printpagina.** "Foto's uploaden: 12 van 62" tijdens het uploaden in groepen, en direct na de klik "Je editie wordt klaargezet…" met een uitgeschakelde knop.
6. **Thema's op eigendomsbewijzen.** Voor- en achterkant gebruiken nu papier, kaderkleur en kleurgroepen van het thema (Riso: roze papier, dun roze kader, riso-tinten). Het label "Eigendomsbewijs" is groter en vetter, de achterkant heeft een kopband, een groter hypotheekblok, een icoon bij stations en nutsbedrijven en een sluitband. Standaardkaarten tonen het munt-teken ("Betaal € 15", "Pay M15"). De standaardkaart in de editor gebruikt ook de nieuwe straatnamen. Het voorbeeld op de homepage is aangepast.
7. **Thuis-ZIP.** De bord-, kaarten- en andere instructies bevatten alleen de tekst van de gekozen set. Beloofd groepsapp-plaatje (1080 x 1080) staat niet in de ZIP en is niet triviaal; de belofte is uit de printgids gehaald.
8. **Kleiner.**
   - Terugknop op de printpagina gaat naar de editor van die editie.
   - De kaartentegels tonen de eerste woorden van de tekst, met een groter teken voor aangepast.
   - De Controle-melding krijgt de focus, heeft een Sluiten-knop, sluit op Escape en verdwijnt zelf na 6 seconden als er niets te zien is.
   - Pionnen aan zonder foto geven een waarschuwing in Controle. De kop zegt "Pionnen · 8 van 8 in de set".
   - De kale domeinnaam kiest Nederlands, tenzij de browser alleen Engels vraagt (ook met q-waarden en `nl-NL`).

## Extra's van de coördinator

- Foto plakken: Cmd/Ctrl+V buiten tekstvelden, een knop "Foto plakken" waar de browser het klembord kan lezen, en een melding als er geen foto op staat.
- Het bord in de editor tekent vakken in de echte verhoudingen van het bordprofiel, met kleurbalk aan de binnenkant.
- Vakken wisselen (slepen, lang indrukken op telefoon, of W en pijltjes) tussen vakken van dezelfde soort, als één stap ongedaan te maken.
- Het minibord blijft bovenaan de zijbalk staan.
- Voorbeeld (knop en V): het hele bord groot met zoomen, en tabs met alle kaarten, bewijzen, biljetten, pionnen en het deksel.

## Niet opgelost of niet bevestigd

- Het exacte oorzaak van de Lettele-fout is niet op productie bevestigd (zie 1).
- "Bank telt als biljet (1/7)": de teller telt de bank niet mee; een test legt dat vast. Waarschijnlijk was een kleur of foto op biljet 1 de oorzaak. Niet nagebootst.
- Foto's die niet laden in Chrome falen de taak nog niet; de printpagina zet wel `printError`, maar de server leest dat niet uit.
- Niet gedaan: undo-stappen samenvoegen (Heeten 8), paneelletters op de bord-PDF, huisregels als eigen regel op de printpagina, bord-instructie met plaatje, tijdsindicatie bij Thuisprint, tikken op het bord opent het vak op een telefoon (blijft de lijst), Riso op instructie-PDF's en biljetten.
