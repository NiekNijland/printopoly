# Feedback ronde 3: Emma, vakantiegeheugen-edities in het Engels (telefoon 390x844, ook liggend 844x390)

Persona: Emma, 27, Brits, iPhone, Engelse interface. Maakt een herinneringsspel van haar reizen, met eigen vakantiefoto's.

Gemaakt (alles in Engelse interface, bord en kaarten in het Engels):

1. **Lisbon 2026**: leeg sjabloon, thema Riso, munt £. Alle 22 straten hernoemd (met é, ã, ç), 7 foto's op straten (staand, panorama 6000x1200, 4000x3000, piepklein 160x120), stations met icoon Ferry, nutsbedrijven en alle vier hoeken met eigen icoon (raket, sleutel, koffie, sirene), hoeknamen aangepast, woorden aangepast (cabin/hostel, "lost luggage", decks "Travel tips" en "Postcards", bank "Banco de Emma"), 6 kaarten herschreven, foto op een kaartvoorkant en op de achterkant, foto op een briefje, doosdeksel met panoramafoto, 3 pionnen met foto. Geprint: print shop set (bord, kaarten, speelgeld, pionnen, doosdeksel, regelboekje). Alles klaar in 75 seconden.
2. **Scotland Road Trip**: sjabloon Family, thema Sleek, munt £. Alle straten hernoemd, foto's: echte HEIC van iPhone, JPEG van 21 MB en 9000x6000, staand portret, panorama. Stations Bus en Ferry, nutsbedrijven Flame en Wind turbine, 4 hoeken met eigen naam en icoon, woorden (croft/castle, "midge bites", decks "Wee luck" en "Postcards"), 5 kaarten herschreven, foto op een kaart. Geprint: home print set (bord als A4-stickers, kaarten, speelgeld, pionnen).
3. **Amsterdam City Trip**: leeg sjabloon, thema Classic, munt €, Engelse interface. Nederlandse namen (Café 't Smalle, Albert Cuypmarkt, Zaanse Schans), 5 foto's, stations Tram/Ferry/Bike, hoeken met icoon, decks "Gezellig" en "Stroopwafel", bank "De Bank van Emma". Niet geprint (wel bekeken in Voorbeeld). Hier ook liggend getest en "Samen maken" uitgeprobeerd met een tweede profiel als vriend.

## Samenvatting

Het voelde als een vrolijk, snel te bouwen spel. Foto's werden altijd geaccepteerd, ook HEIC en 21 MB, en ze gingen binnen 3 seconden de editor in. De PDF's zagen er goed uit: speelgeld in £ met mijn banknaam, eigen woorden (cabins, hostels, Departures) liepen door tot in het regelboekje. Het mooiste: het speelgeld, het doosdeksel en de losse pionnen met foto. Het grootste probleem is de liggende telefoon: bij 844x390 kun je een straat niet meer bewerken, want het voorbeeld vult het hele scherm. Daarna: een foto kun je niet verschuiven, dus gezichten en panorama's worden slecht bijgesneden, en de bordvoorbeeld in de editor toont de oude namen van de decks en de oude ondertitel terwijl de PDF ze wel goed heeft.

## Werkt niet (bugs)

1. **Liggend (844x390) is de editor onbruikbaar.** Waar: ruimte bewerken, kaart bewerken. Wat: header, sticky voorbeeld en onderbalk nemen bijna het hele scherm. Van het formulier blijft een strook van ongeveer 15 px over. Verwacht: voorbeeld klein of naast het formulier. Ernst: blokkerend (voor liggend gebruik). Stappen: viewport 844x390, editor, tik op een straat. Screenshots: `img/traveller-emma/landscape-space.jpg`, `landscape-board.jpg`. Ook de printpagina: sticky onderbalk eet de helft van het scherm (`landscape-print.jpg`).
2. **Editor-voorbeeld van het bord negeert Words en Algemeen.** Waar: Edition, Voorbeeld, Board en het miniatuur in de Edition-kaart. Wat: in het midden staan nog "Community Chest" en "Chance" terwijl ik ze "Postcards" en "Travel tips" noemde, en de ondertitel is nog "The trading game" in plaats van mijn tekst. De ruimtes langs de rand tonen de nieuwe namen wel. In de PDF is het wel goed. Ernst: hinderlijk (je denkt dat het fout gaat). Screenshot: `img/traveller-emma/e1-preview-centre-decks.jpg`, `e2-preview-sleek.jpg`.
3. **Regelboekje en instructies noemen mijn woorden niet overal.** Waar: rules_booklet.pdf en instructies bij de kaarten. Wat: ik zette "jail" op "lost luggage". De kaarten volgen dat, het boekje zegt nog "jail" en "land on Go to jail" (die ruimte heet bij mij "Missed the flight"). De kaartinstructie zegt "Chance: 16 cards / Community Chest: 16 cards" in plaats van mijn decknamen. De prijslijst noemt de eerste groep "Brown" terwijl hij in Riso paars is, en de kolom heet "HOTEL" terwijl ik "hostel" koos. Home-instructie bord zegt "Start at Go" terwijl mijn hoek "Start of the trip" heet. Ernst: hinderlijk.
4. **Wijzigingen kunnen verloren gaan als je meteen sluit.** Waar: Edition, Parts. Wat: ik zette Box lid en Dice aan, sloot na 0,4 seconde, en ze stonden uit. Lijkt een kleine vertraging bij het opslaan. Voor een echte gebruiker zelden een probleem. Ernst: klein.
5. **Foto's op straten komen niet op de eigendomskaart.** Waar: title deed in PDF. Wat: de foto staat wel op het bord, niet op de kaart. Bij een foto-spel (vakantie) verwacht je hem ook op de kaart. Bij stations en nutsbedrijven zegt de editor wel "Shows on the space and on the title deed". Ernst: klein, eerder een gemis. Screenshot: `pdf-deeds-no-photo.jpg`.
6. **Header van een brownstraat zegt "brown" ook als de kleur paars is (Riso).** Klein.

## UX: wat kan beter

- **Foto bijsnijden/verschuiven ontbreekt.** Waar: straat, pion, kaart, doosdeksel. Pionnen en straten snijden een staande foto in het midden af, gezicht half weg (`pawn-portrait-crop.jpg`). Een panorama op een kaartachterkant of op het deksel wordt een smalle middenstrook; je ziet bijna niets (`pdf-card-backs-panorama.jpg`, `boxlid-panorama.jpg`). Voorstel: een sleepbare focus of "kies uitsnede". Er is wel zoom, draaien en zwart-wit.
- **Voorbeeld neemt 40% van de telefoon in beslag** (staand), zodat je maar een paar velden ziet; met toetsenbord bijna niets. Voorstel: voorbeeld inklapbaar of kleiner zodra je typt.
- **Sjabloon Family blijft Family.** 32 kaarten gaan over Oma en de oude televisie. Om het naar Schotland te brengen moet ik ze een voor een openen. Voorstel: "Alle kaarten" als lijst met tekst direct bewerkbaar, of knop "Standaardkaarten gebruiken".
- **Kaartenraster op telefoon** toont hoge lege tegels met afgekapte tekst ("If…"), moeilijk te scannen (`cards-grid.jpg`). Voorstel: 2 kolommen of een lijst.
- **Het getal "0/41", "33/41" bij Board** is onduidelijk. Bij een sjabloon staat er 0/41 terwijl alles al gevuld is. Wat telt het? Voorstel: uitleg of "aangepast".
- **Knop "Pick a space" ligt op het bord** onderin en dekt ruimtes af (eerste screenshot editor).
- **Valuta-standaard M voor Engels.** Een Brit verwacht £. Voorstel: bij een Engelse taal vragen of kiezen (£ of $), of tenminste afleiden uit het land.
- **Parts-label zegt "Chance and Community Chest"** ook als je ze hernoemd hebt.
- **Ongebruikte pionnen printen mee.** Alleen 3 pionnen met foto, maar de PDF heeft 8 stands, 5 leeg met "Pawn 4". Waarschuwing staat wel in Check. Voorstel: een keuze voor het aantal pionnen.
- **Het bord in de home-set wordt over 7 A4-vellen verdeeld waarbij de titelbanner over meerdere vellen loopt.** Plakken is puzzelen (`pdf-home-board-sheets.jpg`). Voorstel: uitleg hoe de middenstukken in elkaar passen, of de titel binnen één vel houden.
- **Samen maken, vriendenpagina:** tab heet "Towns" en het veld "A name from your town, for example", wat past bij dorpseditie, niet bij een reis. Het bord toont geen straatnamen, dus een vriend moet raden welke ruimte hij kiest (`friend-page.jpg`). Voorstel: namen op het bord, tab "Places".
- **Safari-melding** "deletes this if you don't visit for 7 days" is nuttig, maar een knop "Download backup" zou beter helpen dan inloggen met Google.
- **Check-waarschuwing is goed** (102 dpi bij het piepkleine plaatje, 8 lege pionnen), maar ze noemt niet hoe je het oplost bij een foto die je niet groter kunt krijgen.

## Ontwerp

- Mooi: speelgeld met eigen banknaam, valuta en kleur (`pdf1`, 15 pagina's). Doosdeksel, pionnen met foto, de iconen op hoeken. Het Riso-bord is levendig, Classic voelt als een echt spel, Sleek is netjes maar vrij grijs.
- Mooi: eigendomskaarten van de PDF zijn rustig en goed leesbaar, ook met é en ã.
- Goedkoop: kaarten met een panoramafoto op de achterkant, zie boven. Het plaatje van 160x120 is zichtbaar blokkerig op het bord, terecht gewaarschuwd.
- Rommelig: voorbeeld van het bord op de telefoon is erg klein en de helft van het voorbeeldscherm is leeg.
- De PDF-titel in de bestandseigenschappen is "Printopoly", niet mijn editienaam. Bij meerdere edities in de downloadmap lastig.

Screenshots: `img/traveller-emma/pdf-board-panels.jpg`, `pdf-lid-pawns.jpg`, `pdf-home-deeds.jpg`, `e3-preview.jpg`.

## Features die ik zou willen

- Foto verschuiven en uitsnijden (focuspunt): must. Mijn foto's zijn het hele spel.
- Landscape-layout: voorbeeld naast formulier: must (ik hou de telefoon vaak liggend voor het bord).
- Foto ook op de eigendomskaart (optie per straat): must voor een foto-spel.
- Alle kaarten als lijst bewerken, of kaarten leegmaken: must bij sjablonen.
- Kaartachterkant en doosdeksel als collage van meerdere foto's: nice.
- Valuta afleiden uit land of taal (£ bij en-GB): nice.
- Aantal pionnen kiezen: nice.
- Een QR-code of kaart per plek ("waar was dit foto genomen") op de eigendomskaart: nice.
- Bestandsnaam en PDF-titel met de editienaam: nice.
- Back-up downloaden voor mensen zonder account: nice.

## Wat goed werkte

- Foto's van elke soort: HEIC, 21 MB, 54 megapixel en staand, allemaal binnen 3 seconden verwerkt, met een duidelijke dpi-melding.
- Speciale tekens (é, ã, ç, 't) komen goed door op bord, kaarten, deeds en boekje.
- Woorden aanpassen (cabin, hostel, decknamen) loopt door in kaarten, deeds en boekje.
- Print: 75 tot 80 seconden voor een complete set, duidelijke statussen, PDF's per onderdeel en een ZIP, instructies per onderdeel in correct Engels.
- Geen Nederlandse tekst gevonden in de Engelse pagina's, het formulier of de PDF's.
- Samen maken-link is snel gemaakt en het bijdragen als vriend heeft geen account nodig.
