# Feedback ronde 2: editie "Bathmen" (Klassiek, telefoon 390x844, Thuisprint-set)

Persona: 45 jaar, alles op de telefoon, Nederlands, niet techy, print thuis.
Gedaan: landing > Voorbeeld bekijken > Begin met deze als basis > naam "Bathmen", pionnen aan, 12 straten hernoemd (Deventerstraat, Dorpskerk, Stationsstraat, Raalterweg, Kasteel Arkelstein, Möllen van Bats, Het Nijenhuis, Sportpark Bathmen, Kerkstraat, Dorpsplein, Molenweg, Schaarsweg), foto's op 5 vakken, 4 kaarten aangepast, weg via Mijn edities en teruggekomen, 3 printruns (Thuisprint-set), PDF's en printgids bekeken. Productie, 3 runs gebruikt. De 5 foto's zijn schermgrote canvas-JPEG's (3000x4000, tekst en tekening) die ik via DataTransfer in de file-input zette.

## Samenvatting

De editor op de telefoon is veel beter dan in ronde 1: Mijn edities is nu zichtbaar (map-icoon in de kop en pijltje in de editor), de eigendomsbewijzen krijgen de nieuwe straatnamen mee (in editor, PDF en op de kaart "Loop door naar Möllen van Bats" zelfs automatisch), de bewerkte editie staat er na terugkomen nog precies zo, en de Proefvel-stap en de volgende/vorige-knoppen zijn prettig. Maar: **de foto's komen niet in de PDF's terecht.** Op elk vak waar ik een foto zette staat in de Thuisprint-PDF een leeg kader met het kapotte-afbeelding-icoontje van de browser. De site meldde "klaar" en "Controle: 0", dus een gebruiker print dit zonder het te weten. Daarnaast ontbreekt het groepsapp-plaatje dat de printgids belooft, en zijn er wat kleinere dingen rond lees- en vindbaarheid op de telefoon.

Gecontroleerd en opgelost sinds ronde 1:
- Eigendomsbewijzen met standaardnamen: opgelost (editor, Eigendomsbewijs-tab, PDF-kaarten, Kans-kaart die naar een vak verwijst: allemaal de nieuwe naam).
- Mijn edities verborgen op telefoon: opgelost.
- Layoutkeuze: opgelost, zie "Bord" in Instellingen (Modern vierkant / Andere maat) en onderdelen kiezen of overslaan.
- Meer dan 20 foto's: niet getest (ik had er 5).

## Bevindingen

### 1. Foto's op het bord verschijnen niet in de PDF (kapotte-afbeelding-icoon)
- Waar: Printen > Thuisprint-set > Bord-PDF (pagina's 3 en 5, de vakken Deventerstraat, Dorpskerk, Kasteel Arkelstein, Möllen van Bats, Het Nijenhuis).
- Wat gebeurde: in de editor staat de foto netjes in het vak en in de Mijn edities-miniatuur. In de PDF staat op die vakken alleen het lege kader met een 14x16 px kapotte-afbeelding-icoon (`pdfimages` laat per foto dat ene icoontje zien). Geen foutmelding, taak gaat naar "klaar", Controle blijft 0.
- Herhaald: run 1 (3000x4000, 235 KB per foto), run 2 (identiek) en run 3 nadat ik de Dorpskerk-foto verving door een kleine 1200x1600 JPEG van 26 KB. PDF-grootte bleef bij alle drie exact 98258 bytes, dus het ligt niet aan de afmetingen.
- Verwacht: de foto staat in de sticker, of de site zegt duidelijk dat een foto niet is meegekomen.
- Ernst: **blokkerend** (het hele idee van "eigen foto's op je bord" haalt de print niet). Kanttekening: ik zette bestanden via een geprogrammeerde `change`-event in de file-input, geen echte fotokiezer; als dat een rol speelt, is de foutmelding-ontbreekt-bevinding (zie 2) nog steeds geldig.
- Stappen: nieuwe editie van het voorbeeld, foto op een vak, Printen > Thuisprint-set > Thuisprint-set maken, ZIP of Bord-PDF openen.

### 2. Geen enkele waarschuwing als een foto uitvalt
- Waar: Controle-knop onderin de editor en resultaatpagina na "maken".
- Wat: "Controle: 0" en alle onderdelen "klaar", terwijl de foto's ontbreken.
- Verwacht: een controle of statusmelding "foto bij Dorpskerk is niet meegekomen, probeer opnieuw".
- Ernst: hinderlijk (met 1 erbovenop blokkerend). Je ontdekt het pas na uitsnijden en plakken.

### 3. Groepsapp-plaatje ontbreekt in de Thuisprint-set
- Waar: printgids ("Plaatje voor de groepsapp: bij de sets zit ook een PNG van 1080x1080") versus resultaatpagina en ZIP.
- Wat: de ZIP bevat 3 PDF's en 3 instructies-PDF's (bord, kaarten, pionnen), geen PNG en geen download-knop ervoor.
- Verwacht: PNG in de ZIP of een knop, of de zin weghalen.
- Ernst: klein.

### 4. Kaarten in de editor tonen alleen een nummer
- Waar: Kaarten-tab (4x4 raster, "1" t/m "16").
- Wat: je ziet nergens welke tekst bij kaart 5 hoort, alleen de blauwe tegel met een cijfer. Aangepast = klein zwart bolletje rechtsonder, nauwelijks te zien.
- Verwacht: begin van de tekst of een kleine voorbeeldweergave op de tegel, en een duidelijker teken voor "aangepast".
- Ernst: hinderlijk (je moet elk van de 32 kaarten openen om te zien wat erop staat).

### 5. "Verhaal" en "Standaardkaart" in de kaartbewerker zijn verwarrend
- Waar: Kaarten > kaart openen.
- Wat: onder het veld "Verhaal" staat een grijs blok "Standaardkaart: Draai om en loop recht naar Start..." plus "Wat er gebeurt: Ga naar Start en ontvang 200" en een knop "Terugzetten". Bij kaart 1 stond als verhaal een andere tekst (Betaal Jan 50) dan het standaardblok, dus ik snapte niet welke zou worden afgedrukt en of "Wat er gebeurt" nog klopt. Veld "Bedrag op de kaart" leeg.
- Verwacht: één regel uitleg ("De tekst die je hier typt komt op de kaart; het bedrag komt los eronder").
- Ernst: klein tot hinderlijk.

### 6. Bord op de telefoon te klein om iets te lezen of te raken
- Waar: Editor > Bord-tab, op 390 breed.
- Wat: het vierkante bord is ca. 355 px breed met ruim 40 vakken, geen leesbare namen, foto's niet te zien; je kiest een vak daardoor via de lijst eronder. Dat werkt, maar het bord zelf lijkt een plaatje. Geen pinch-zoom getest.
- Verwacht: tikken op het bord opent het vak (voor zover het niet al zo is) of een inzoom-optie.
- Ernst: klein.

### 7. Bord-tab kost veel scrollen voor 22 straten
- Waar: lijst van vakken, elke straat openen, naam typen, "Terug naar het bord", volgende.
- Wat: de volgende/vorige-knoppen onderin zijn goed, maar wat ontbreekt is een manier om per kleurgroep te werken en de lijst toont alleen de naam en een bolletje (vakken met foto en zonder zien er hetzelfde uit).
- Verwacht: een klein fotoicoontje in de lijst bij vakken met foto.
- Ernst: idee.

### 8. Stations, nutsbedrijven en hoeken niet persoonlijk gemaakt
- Wat: ik wilde "Station Bathmen" maken. In de lijst staan "Station Noord/Oost/Zuid/West" gewoon tussen de rest, zonder duidelijk teken dat je ze kunt hernoemen.
- Verwacht: korte hint ("ook stations en nutsbedrijven kun je hernoemen") of testen of het kan.
- Ernst: idee. (Niet geprobeerd in de editor, dus ik weet niet of het kan.)

### 9. Pionnen aanzetten zonder foto geeft lege pionnen in de PDF, geen waarschuwing
- Waar: Instellingen > Pionnen; Doos-tab "Pionnen 8 van 8"; Pionnen-PDF.
- Wat: ik zette Pionnen aan maar gaf geen foto's. Controle bleef 0 en de PDF toont 8 lege crèmekleurige staanders met alleen "Pion 1" tot "Pion 8". Het "8 van 8" kopje snapte ik niet (acht gevuld? acht totaal?).
- Verwacht: waarschuwing "8 pionnen hebben nog geen foto" of "8 pionnen".
- Ernst: hinderlijk.

### 10. Instructies in de Thuisprint-set bevatten ook de Drukkerij-tekst
- Waar: `instructies-bord.pdf`, `instructies-kaarten...pdf` en `instructies-pionnen.pdf` in de Thuisprint-ZIP.
- Wat: elke pagina begint met "Drukkerij-set: bestel als vinylsticker..." en daarna pas "Thuisprint-set". Een thuisprinter leest eerst een half A4 over iets wat hij niet doet.
- Verwacht: in de thuisset alleen de thuis-instructie.
- Ernst: klein.

### 11. Printgids en PDF-instructie verschillen bij het plakken van het bord
- Waar: printgids "Bord > Plakken" (4 stappen, paneel A/B/C/D, 5 cm schutpapier) versus `instructies-bord.pdf` (Thuis: losse stickers snijden, begin bij Start, 3 cm schutpapier, midden in vier stukken).
- Wat: de gids spreekt over A-D-panelen in beide varianten en mengt ze; de PDF is concreter. Verder staat in de gids dat de vakken 0,5 mm kleiner zijn dan op het bord, de PDF zegt hetzelfde.
- Verwacht: gids gesplitst naar Drukkerij/Thuis, of de gids gelijk aan de PDF.
- Ernst: klein.

### 12. Midden van het bord is over vier pagina's verdeeld (tekst "Bathmen" doormidden)
- Waar: Bord-PDF, pagina's 1 t/m 4 (het midden).
- Wat: de titel "Bathmen" loopt diagonaal over vier stukken; bij pagina 1 staat "Bath", bij pagina 4 "men". Past op één A4 met snijtekens, maar plakken zonder naadjes lijkt me lastig voor een niet-techneut. De uitleg zegt "werk langs de vouwlijnen", zonder plaatje.
- Verwacht: een kleine afbeelding in de instructie van hoe de vier stukken liggen, of nummers op de stukken.
- Ernst: klein.

### 13. Tijdsindicatie klopt maar schrikt (en is bovenaan lastig te vinden)
- Waar: printgids "Thuis printen: wat je nodig hebt".
- Wat: "een avond werk" en "ruim 40 vakken uitsnijden" staan veel lager dan de Thuisprint-knop; je ziet ze pas als je de gids opent. De resultaatpagina zegt "7 vellen A4" en "15 vellen A4 liggend", wat de indruk geeft dat het snel gedaan is.
- Verwacht: bij de keuze Thuisprint-set een zin "reken op een paar uur snijden en vouwen".
- Ernst: idee.

### 14. Taal volgt de browser, niet mijn voorkeur
- Waar: printopoly.nl/ (zonder /nl).
- Wat: de site opende in het Engels (/en) terwijl ik Nederlands wilde; de NL-knop zat verstopt in het hamburgermenu. Via /nl ging het verder zonder problemen.
- Verwacht: voor een Nederlands domein standaard Nederlands.
- Ernst: klein. (Mogelijk door de browser-instelling van mijn testomgeving.)

### 15. Kleine dingen
- Tabbalk op de voorbeeldpagina: het label "Algemeen Fonds" breekt over twee regels en loopt tegen de rand aan (390 px).
- Mijn edities toont "Edities in deze browser: 3" terwijl ik er één maakte (in deze browser stonden er al twee van eerdere testers); de waarschuwing dat je werk alleen in deze browser staat is goed leesbaar.
- Het deed een paar seconden niets na "Begin met deze als basis" en "Voorbeeld bekijken" (pagina laadt traag, geen laadindicatie), zodat ik twee keer tikte.
- De pijl links in de editorkop heet "Mijn edities", maar ziet eruit als een gewone "terug"-pijl. Duidelijker zou "Mijn edities" met woord zijn.
- Eigendomsbewijs-tab van een vak: de fotoplaats op de kaart is een beige blok zonder foto, ook als het vak zelf een foto heeft. Onduidelijk of dat bedoeld is.
- Mijn kaarttekst "Je wint de Bathmense dorpsquiz..." stond op Kans, niet op Algemeen Fonds. Geen bevinding over de site, alleen dat ik moest zoeken welke stapel bij welke tekst hoort (de kaartenlijst zegt dit niet).

## Technische kanttekening bij de test

Echte aanraking via de browser-tool deed op een aantal knoppen (tabs, lijstitems) niets; ik heb die met `click`-events via JavaScript bediend. Dat zegt niets over de site zelf. Het "stale" invoerveld dat ik zag (naamveld toonde een oude naam na wisselen van vak) komt door mijn manier van waarden zetten en heb ik niet als bevinding opgenomen.

## Bestanden
PDF's: `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback2/bathmen/`
