# Feedback ronde 5: vader op de bank, alles op de telefoon (iPhone 390 × 844, ook even liggend 844 × 390)

Persona: Mo, 38, vader van Sam (bijna 8) en Lotte. Doet alles op zijn telefoon, 's avonds op de bank. Wil een spel met de familie erin, een spel voor zijn vriendengroep en een spel voor het verjaardagsfeest van Sam. Heeft thuis een gewone inkjetprinter en het oude spel in de kast. Site in het Nederlands.

Gemaakt:

| Editie | Sjabloon | Thema | Taal | Munt | Wat ik aanpaste | Geprint (Thuisprint-set) |
| --- | --- | --- | --- | --- | --- | --- |
| Familie Bakker | Familie | Klassiek | NL | € | 14 straten hernoemd, 9 foto's op vakken (een piepkleine WhatsApp-foto, een HEIC, een foto van 17 MB), midden "Naam met foto", ondertitel, 3 kaarten herschreven, 5 pionnen met naam en foto | bord, kaarten en eigendomsbewijzen, pionnen (speelgeld uitgezet) |
| De Vrijdagmiddagclub | Vrienden | Riso (kwam van het sjabloon) | NL | eigen munt "Pils" met 🍺 | 6 namen in één keer geplakt, 3 foto's (één op "Hele vak"), foto over het hele midden, extra Kans-kaart met "Betaal 🍺 30" | bord, kaarten, pionnen, uitnodiging; daarna los het speelgeld (Aanbevolen) |
| Sam wordt 8! | Feest (via "Begin met" op de landing) | Strak | NL | € | 10 straten hernoemd naar plekken van Sam, 3 foto's, midden "Naam met foto", 6 pionnen met de namen van vriendjes, uitnodiging met datum, plek en "Zwemspullen mee!" | bord, kaarten, pionnen, uitnodiging (doosdeksel en geld uitgezet) |

Vier printruns in totaal. Elke run was in 6 tot 34 seconden klaar.

## Samenvatting

Op de telefoon voelt het nu als een app en niet meer als een website die krap past. Foto's zetten gaat in één tik, de lijst met namen typt lekker door, en Voorbeeld met mijn eigen foto's op het bord was het leukste moment. De PDF's zijn netjes: mijn namen, foto's, de eigen munt met bierglas en de ingevulde uitnodiging staan er allemaal goed op. Het grootste probleem is dat het nakijken staande foto's ten onrechte afkeurt: elke portretfoto van de telefoon krijgt "De foto bedekt het kader niet helemaal", ook als hij het kader gewoon vult. Daarnaast verdween mijn foto bij "Foto over het hele midden" na het kiezen, en het zoekveld belooft "plak namen", wat daar niet werkt.

## Werkt niet (bugs)

1. **Staande foto's krijgen een valse waarschuwing.** Waar: vak, pion en midden, en daarna in "Nog even nakijken". Wat gebeurde: elke staande foto (3024 × 4032, zoals uit een iPhone) op "Vullend" en zoom 100% gaf "De foto bedekt het kader niet helemaal. Zoom in of schuif de foto terug." In het voorbeeld vult de foto het kader gewoon. Liggende en vierkante foto's hadden het niet. Op 110% zoom is de melding weg. Verwacht: "Vullend" op 100% dekt altijd. Ernst: hinderlijk; bij mij stonden 4 van de 5 meldingen in "Nog even nakijken" hierdoor, bij de Feest-editie 2 van de 2. Stappen: vak openen, Afbeelding, Foto, staande foto kiezen. Screenshot: `img/vader-mo/05-valse-waarschuwing-staande-foto.jpg`, `09-printpagina-nakijken.jpg`.

2. **Foto kwijt bij "Foto over het hele midden".** Waar: Midden van het bord, Afbeelding. Wat gebeurde: tik op "Foto over het hele midden" opent meteen de fotokiezer. Ik koos een foto, maar daarna stond er alleen een knop "Foto kiezen" en geen foto. Twee keer nagedaan, twee keer hetzelfde. Via "Foto kiezen" lukte het wel. Bij "Naam met foto" werkte dezelfde route wel. Verwacht: de gekozen foto staat erin. Ernst: hinderlijk. Stappen: Midden, Afbeelding, eerst Naam, dan "Foto over het hele midden", foto kiezen. Screenshot: `12-foto-hele-midden-weg.jpg`.

3. **"Plak namen" in het zoekveld doet niets.** Waar: Bord, het veld "Zoek een vak of plak namen". Wat gebeurde: ik plakte zes namen uit mijn notities in dat veld. Het werd één lange zoekterm: "Niets gevonden voor 'Café De ZwaanKees z'n garage…'". Plakken werkt wel als je in het naamveld van een straat plakt (6 namen ingevuld, 3 andere vakken overgeslagen), maar dat staat nergens. Verwacht: plakken in het veld met dat woord vult de straten, of de hint staat bij de naamvelden. Ernst: hinderlijk. Screenshot: `11-plak-namen-zoekveld.jpg`.

4. **"Voor voor" op de kaart.** Waar: kaart, veld "Waarvoor". Ik typte "voor de schoonmaker". Op de kaart: "Betaal € 18 voor voor de schoonmaker". De uitleg eronder zegt wel "zoals Betaal € 50 voor je taalcursus", maar je typt het woord "voor" bijna vanzelf. Verwacht: een "voor" aan het begin weghalen, of het veld laten beginnen met een vaste "voor". Ernst: klein, maar het komt zo in de PDF. Screenshot: `06-voor-voor.jpg`.

5. **Eigen munt valt nog steeds stil terug op euro** (ronde 4, Hans, bug 35). Waar: Editie, Algemeen, Munt. Ik koos "Eigen munt" en ging weg zonder iets in te vullen. Na terugkomen stond er weer "€ euro", zonder melding. Ernst: klein.

6. **Na "Aanpassen" in Nog even nakijken is de sectie Afbeelding dicht.** Waar: printpagina, Aanpassen bij een fotomelding. Het vak gaat open, de melding staat bovenaan, maar de knoppen voor zoom en "Andere foto" zitten in een dichte sectie. Verwacht: Afbeelding open. Ernst: klein. Screenshot: `10-aanpassen-afbeelding-dicht.jpg`.

7. **Het segment "Wat staat er in het midden?" is te krap op 390 px.** "Naam" raakt de rode rand van de keuze, "Logo" staat tegen de buitenrand. Ernst: klein. Screenshot: `03-midden-keuze-krap.jpg`.

8. **Laatste naam weg bij snel wegklikken (met de hand nakijken).** Ik gaf pion 6 een naam en herlaadde binnen een halve seconde: weg. Met 2,5 seconde wachten bleef hij staan. Kan een scriptding zijn, maar op de telefoon veeg je een app ook snel weg. Ernst: klein.

Niet meer stuk uit ronde 4: de printpagina is na het maken niet meer breder dan het scherm (Fatima, bug 8; 390 px breed), en een foto kiezen is één tik (UX 4).

## UX: wat kan beter

1. **Uitnodiging: de velden voor datum en plek vond ik pas bij de derde editie.** Bij De Vrijdagmiddagclub zette ik de uitnodiging aan op de printpagina en kreeg een PNG voor de groepsapp met lege stippellijnen bij Wanneer, Waar en Neem mee. Die stuur je niet. Pas bij het feest vond ik onder Doos, Uitnodiging het veld "Wanneer, waar, wat neem je mee". Voorstel: in de rij Uitnodiging op de printpagina een regel "Datum en plek nog leeg. Vul ze in" met een link naar dat veld. Screenshots: `24-uitnodiging-lege-regels.jpg`, `16-uitnodiging-velden.jpg`, `26-uitnodiging-ingevuld.jpg`.

2. **De keuze van onderdelen reist mee naar een nieuwe editie, en dat zie je niet.** Bij de familie zette ik Speelgeld uit. Bij de vrienden-editie stond Speelgeld daarna ook uit, terwijl ik daar juist geld wilde. Bij het feest stonden Doosdeksel, Uitnodiging en Speelgeld weer aan (van het sjabloon). Ik snap niet wat de regel is. Voorstel: één vaste regel, en boven de lijst kort zeggen waar de keuze vandaan komt ("Zoals bij je vorige editie").

3. **"Niet in je set" in de editor pas na een bezoek aan de printpagina.** Bij een nieuwe editie staan Doosdeksel en Uitnodiging in de Doos-tab er gewoon bij, zonder "niet in je set" en niet lichter. Pas nadat ik de printpagina had geopend, kreeg de editor die labels. Voorstel: meteen de standaardkeuze van de set tonen.

4. **Doosdeksel thuis is A3.** Het feest-sjabloon zet het doosdeksel aan in de Thuisprint-set, en dan staat er "1 vel A3" in de balk. Ik heb geen A3-printer. Voorstel: thuis op twee A4's, of het deksel bij Thuisprint standaard uit (ronde 4, Fatima, UX 3 staat nog open).

5. **Hoeveel geld past niet bij het aantal pionnen** (ronde 4, Ria). De vrienden-editie heeft 8 pionnen, en bij Speelgeld staat "Aanbevolen voor de Thuisprint-set: 2 tot 4 spelers". 24 vellen A4 voor 2 tot 4 spelers is voor een avondje thuis al veel. Voorstel: Aanbevolen volgt het aantal pionnen, en zeg erbij hoeveel je moet knippen (144 biljetten).

6. **"Deel je bord" toont geen foto's en zegt iets anders dan het doet.** Het plaatje heeft geen foto's van Sam, en de banier zegt "Bedenk mee aan onze eigen editie". Dat is de oude Samen maken-tekst; ik wilde alleen laten zien wat ik maakte. Voorstel: banier "Onze eigen editie" en, als het kan, de foto's erin. Screenshot: `18-deel-je-bord-en-printgids.jpg`.

7. **Hoe het werkt opent in de printgids eerst het deel Drukkerij-set**, terwijl ik op Thuisprint sta. Voorstel: het deel van de gekozen set eerst, of meteen naar dat deel springen.

8. **Liggend (844 × 390) is de editor drie smalle kolommen.** Het paneel rechts laat twee velden zien, het voorbeeld in het midden is klein. Op de printpagina nemen kop en balk samen meer dan de helft van de hoogte. Liggend gebruik ik hem dus niet, en dat is ook goed, maar staand zou beter een tip zijn dan drie kolommen. Screenshot: `17-liggend.jpg`.

9. **Pionnenlijst zonder foto.** In de Doos-tab heeft elke pion een grijs rondje, ook als er een foto op staat. Bij vijf pionnen weet ik niet meer welke foto bij wie hoort. Voorstel: het rondje wordt de foto. Screenshot: `07-pionnen-geen-foto-in-lijst.jpg`.

10. **Kleine teksten.**
    - "Dupliceren: Kopie voor een ander stel of een andere groep" klinkt naar bruiloften, niet naar mijn familie.
    - Bij een onaangeroerde sjabloonkaart staat "Bedragen · 1 aangepast". Ik had niets aangepast.
    - Extra kaart: "Kies 1 tot 500." en direct eronder "Kies een bedrag tot 500." Eén zin is genoeg.
    - Het midden heeft bij "Foto over het hele midden" geen miniatuur van de foto en geen Plakken, bij een vak wel.

## Ontwerp

Mooi:
- De nieuwe editie-pagina met sjablonen als kaartjes, en de naam die meteen meeverandert ("Het Familiespel"). `01-nieuwe-editie.jpg`
- Het minibord laat nu foto's en waarschuwingen zien. Voorbeeld met al mijn foto's op het bord is echt leuk om aan Sam te laten zien. `08-voorbeeld.jpg`
- Het voorbeeld klapt in tot "Voorbeeld tonen" zodra je in het formulier scrolt. Daardoor heb je op de telefoon eindelijk ruimte (ronde 4, UX 5).
- Printpagina: "Nog even nakijken" bovenaan met een knop per punt, duidelijke rijen per onderdeel, en de balk met "Samen 16 vellen A4". Na het maken wordt de knop "ZIP downloaden". `09-printpagina-nakijken.jpg`, `20-klaar-zip.jpg`
- De uitnodiging is het mooiste stuk papier van de set. `26-uitnodiging-ingevuld.jpg`

Minder:
- De tekst in de balk ("Samen 41 vellen A4 en 1 vel A3, waarv…") wordt op 390 px afgekapt.
- In Voorbeeld lopen de acht tabbladen van het scherm af ("Gelc"), zonder teken dat er meer is. Onder het bord staat op de telefoon een halve lege pagina.

PDF's:
- Bord thuis: 7 vellen, elk vak een losse sticker, het midden in vier stukken. Mijn foto's staan erop (300 dpi, ook de foto van 17 MB, die is netjes verkleind). De te kleine foto is ook in de PDF te klein, maar daar was ik voor gewaarschuwd. `21-pdf-bord-familie.jpg`
- Foto over het hele midden loopt over vier stickers. De tekst in mijn foto staat precies op de vouw; de hint had dat gezegd. `23-pdf-bord-vrienden-heel-midden.jpg`
- Kaarten en eigendomsbewijzen kloppen, met proefpagina. De pionnen zijn klein en het vel is grotendeels leeg. `22-pdf-kaarten-pionnen.jpg`
- Speelgeld met 🍺 als munt ziet er goed uit en is 4,5 MB voor 24 vellen. In ronde 4 was dat 12 MB. `25-pdf-geld-pils.jpg`
- Strak-thema voor het feest is rustig en netjes. `27-pdf-bord-feest-strak.jpg`
- Bestelblad en instructies in de ZIP zijn duidelijk, met een stuk "Zonder stickerpapier of zonder bord". Dat had ik nodig.

## Features die ik zou willen

| Wens | Waarom (Mo) | Belang |
| --- | --- | --- |
| Datum en plek van de uitnodiging invullen vanaf de printpagina | Ik maak de uitnodiging pas als ik ga printen, en dan wil ik hem meteen in de groepsapp zetten | must |
| Meerdere foto's tegelijk kiezen uit mijn fotorol en ze aan vakken toewijzen | Negen keer vak openen, Afbeelding, Foto is op de bank veel tikken | nice |
| Foto's op het plaatje van "Deel je bord" | De familie-app wil de gezichten zien, niet alleen de namen | nice |
| Pion met de foto als rondje in de lijst | Zie UX 9 | nice |
| Minder speelgeld kunnen printen, of alleen de briefjes die het oude spel mist | Ik heb het oude spel nog. 24 vellen knippen doe ik niet | nice |
| Doosdeksel thuis op A4 | Geen A3-printer | nice |

## Wat goed werkte

- Foto kiezen in één tik, ook een HEIC en een foto van 17 MB, binnen 4 seconden.
- De lijst met naamvelden: typen, Tab, volgende straat. Plakken van een lijst in een naamveld vult de straten, en de melding zegt wat er overgeslagen is.
- Eigen munt met een emoji werkt, tot in de PDF.
- Extra kaart toevoegen met een eigen bedrag.
- "Nog even nakijken" met Aanpassen per punt; de melding over de te kleine foto was terecht en duidelijk.
- Printen was snel: 6 tot 34 seconden, en "Alleen dit maken" voor het speelgeld werkte los van de rest.
- Mijn edities en de "Verder met"-balk op de landing: ik vond mijn edities meteen terug.
