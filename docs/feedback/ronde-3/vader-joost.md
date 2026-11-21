# Feedback ronde 3: vader Joost, alles op de bank (Android-telefoon, 360 x 780)

Persona: Joost, 42, doet alles op de bank in korte sessies. Hij gaat weg en komt via Mijn edities terug. Hij begint bij een sjabloon, voegt foto's van het dorp toe, geeft per kleurgroep een eigen plaatsnaam en past een paar huren aan. Hij print de Thuisprint-set. Testopzet: puppeteer met telefoonprofiel (touch, Android-useragent), één profiel, elke stap in een nieuwe sessie (pagina opnieuw laden), dus alles kwam uit IndexedDB. Foto's waren zelfgemaakte JPEG's van 2000 tot 4000 px, plus één piepklein bestand (120 x 90) en één groot bestand (4032 x 3024).

Gemaakt:
1. **Heusden aan de Maas.** Sjabloon "Je dorp of wijk", thema Klassiek, Nederlands, euro. Aangepast: 10 foto's tegelijk geüpload, een eigen foto bij de bakker, plaatsnamen per kleurgroep (Oud-Heusden, De Werf, Achter de dijk, Het nieuwe Heusden, Dorpskern), prijs van de kerk 180 naar 200, huur met 1 huis 70 naar 80. Geprint: Thuisprint-set met bord (7 vellen), eigendomsbewijzen en kaarten (16 vellen). Dit duurde 36 seconden.
2. **VV Heusden.** Sjabloon "Bedrijf of team" (er is geen sportclub-sjabloon, dit leek er het meest op), thema Strak, Nederlands, euro. Aangepast: onderdelen Pionnen, Huisjes en hotels en Dobbelstenen erbij, 8 foto's tegelijk als pionnen, acht kleurgroepen hernoemd (Het Clubhuis, Het Sportpark, De Tribune, Kantine, Het Veld, Langs de lijn, De Vereniging, Hoofdsponsor), 6 vakken hernoemd (De derde helft, De dug-out, De sponsor, De hoofdtribune, De kapotte ballenpomp), 3 foto's op het bord. Geprint: de hele Thuisprint-set (bord, kaarten, pionnen, huisjes, hotels, dobbelstenen). 36 seconden.
3. **Familie Joost.** Sjabloon "Familie", thema Riso, Nederlands, euro. Aangepast: foto in het ovaal van biljet 5 en biljet 20, plaatsnamen per groep (Bij opa en oma, In Heusden, Op vakantie, Thuis, Zomer, Feestdagen, Vroeger), twee vakken hernoemd. Geprint: bord, kaarten, speelgeld (35 vellen) en pionnen. 24 seconden.

## Samenvatting

Op de telefoon werkt het verrassend goed. Sjabloon kiezen, een straat openen, een plaatsnaam typen en weer terug voelt vlot. Mijn edities, opslaan en terugkomen werkten elke keer zonder verlies. Het mooiste is het geld: de biljetten met een foto in het ovaal zien er echt uit, en ook de PDF's voor de Thuisprint zijn netjes en snel klaar (24 tot 36 seconden). Het grootste probleem is het uploaden van veel foto's tegelijk. De foto's worden zonder melding over de eerstvolgende vakken verdeeld, dus de foto van de kerk staat wel op de kerk, maar "Bakker Jansen" staat op de supermarkt. Een Joost met 8 dorpsfoto's moet daardoor alles zelf herschikken, en dat kan alleen door per vak opnieuw te uploaden. Daarnaast is het bord op de telefoon in de editor een lege tekening zonder namen, en kun je op de telefoon de prijs en hypotheek wel aanpassen maar niet echt "een beetje" bij de huur schuiven zonder een lange lijst invoervelden.

## Werkt niet (bugs)

- **Meerdere foto's tegelijk uploaden, geen melding en geen keuze waar ze heen gaan.** Waar: veld, Afbeelding, Foto kiezen, meerdere bestanden kiezen. Wat gebeurde: 10 foto's gingen op 10 opeenvolgende vakken (straten, stations, ook Vrij parkeren), zonder melding. De teller bij Bord sprong stilletjes van 0/41 naar 10/41. Verwacht: een overzicht "10 foto's, kies bij welk vak elke foto hoort", of op zijn minst een melding met de verdeling en een knop om ze te ruilen. Ernst: hinderlijk (voor deze persona bijna blokkerend). Stappen: kerk openen, Afbeelding, Foto, 10 bestanden kiezen. Screenshots: `img/vader-joost/15-na-upload.jpg`, `img/vader-joost/16-reopen-na-upload.jpg`, `img/vader-joost/32-voorbeeld.jpg`.
- **Een te hoge prijs wordt stil teruggezet.** Waar: Bedragen, Prijs. Wat gebeurde: ik typte 500 bij de kerk, het veld sprong terug naar 180. Er stond geen melding, alleen het kleine grijze regeltje "standaard € 180, 144 tot 216". Verwacht: het veld wordt rood of er komt een korte uitleg "maximaal 216". Ernst: klein tot hinderlijk. Screenshot: `img/vader-joost/25-prijs-500.jpg`.
- **Tikken op "Bord vergroten" opent het vak Start.** Waar: editor, de kaart met het bord. Wat gebeurde: ik tikte op de knop "Bord vergroten" en kwam in het vak Start terecht, zonder een grotere versie van het bord. Het kan zijn dat de knop onder de bordtegels zit. Ernst: klein. Screenshot: `img/vader-joost/19-bord-groot.jpg`.
- **Instelbare prijs en hypotheek lopen niet mee.** Waar: kerk, prijs van 180 naar 200 gezet. Wat gebeurde: de hypotheek bleef € 90 en de huur van een leeg vak bleef € 14. Op het eigendomsbewijs staat daardoor een hypotheek van € 90 bij een prijs van € 200. Het staat netjes uitgelegd ("de huur volgt vanzelf"), maar de huur volgde de prijs niet. Verwacht: of de huren schalen mee, of de tekst zegt dat je ze zelf moet aanpassen. Ernst: klein.
- **Spookstreep boven elke kaart in Mijn edities.** Waar: Mijn edities. Wat gebeurde: boven het bordplaatje staat een dun gekleurd bandje met een zwarte lijn, het lijkt een afgesneden kaartrand. Ernst: klein, het oogt niet af. Screenshot: `img/vader-joost/80-mijn-1.jpg`.

## UX: wat kan beter

- **Foto's per vak vinden en herschikken.** Waar: alle plekken met foto's. Er is geen fotobibliotheek van wat je al uploadde. Elke foto opnieuw uit de galerij kiezen kost op de bank veel tikken. Voorstel: een lade "Mijn foto's" in de editie, met slepen of tikken naar een vak, en de optie om dezelfde foto op meerdere plekken te gebruiken.
- **De foto op de eigendomsbewijzen.** Waar: Eigendomsbewijs. De foto komt alleen op het bordvak, niet op het eigendomsbewijs. Joost verwacht de foto van de kerk ook op de kaart van de kerk. Voorstel: "Foto ook op het eigendomsbewijs" als schakelaar.
- **De kop kapt de editienaam af.** Waar: kop van de editor ("Heusden aan de ..."), en in het midden van het bord ("Heusden aan de M..." op de miniatuur). Met een naam langer dan 15 tekens zie je hem niet meer. Voorstel: laat de naam op twee regels staan, of toon hem vol zodra je de naam aantikt.
- **Het bord in de editor is op de telefoon een lege tekening.** Waar: editor, Bord. De miniatuur toont alleen witte tegels met kleurstrepen, zonder namen. Joost ziet daarom niet wat hij doet. De echte weergave zit pas achter Voorbeeld. Voorstel: toon tekst en foto's in de miniatuur, of geef "Vak kiezen" een groter, leesbaar bord.
- **De lijst met vakken staat onder een grote kop.** Waar: editor, startscherm. Het veld "Editie", de tabs en het bord nemen ongeveer 2/3 van het scherm in. De lijst begint pas ver onder de vouw. Voorstel: laat het bord inklappen na de eerste keer, of maak het zoekbaar ("Zoek een vak").
- **Zoeken in de lijst.** 41 vakken onder elkaar. "De kerk met de scheve toren" vinden betekent 20 keer scrollen. Voorstel: zoekveld bovenaan, of groeperen per kleur (dan past de plaatsnaam per groep er ook beter bij).
- **De plaatsnaam is verstopt.** Waar: veld, Tekst. De mogelijkheid om een plaatsnaam per kleurgroep te zetten vond ik pas door een veld te openen. Het label "geldt voor alle 3 oranje straten" is goed. Maar er is geen overzicht van alle plaatsnamen per groep. Voorstel: een scherm "Kleurgroepen" met acht regels: kleur, plaatsnaam, huurschaal.
- **Huur is een lange lijst.** Waar: Bedragen, Huur. Voor een kleine aanpassing moet je door zes invoerblokken scrollen. De hulptekst "standaard € 70, 56 tot 84" helpt wel. Voorstel: één schuifje "duurder of goedkoper" per kleurgroep, daarnaast de lijst voor wie het precies wil.
- **Het geld kost 35 vellen.** Waar: Thuisprint met Speelgeld. Het geld voor één spel is 35 A4-vellen (30 stuks biljet van 1 is 5 vellen). Dat zie je pas na het maken. Voorstel: laat het aantal vellen op de printpagina zien vóór het maken, en bied een korte variant ("geld voor 4 spelers").
- **ZIP op een telefoon.** Waar: print, onderaan "Thuisprint-set downloaden (ZIP)". Een ZIP uitpakken op Android is gedoe, en printen vanaf de telefoon gaat per PDF. De losse PDF-links per onderdeel bestaan wel, maar staan klein in de lijst. Voorstel: maak "Open PDF" de eerste knop op de telefoon en de ZIP de tweede.
- **De balk onderaan van de printpagina.** Waar: print. De vaste balk met uitleg en knop neemt ongeveer 180 van de 780 pixels in. Samen met de eerste kaart blijft er weinig ruimte over. Voorstel: de uitleg alleen eenmalig tonen.
- **Geen sportclub-sjabloon.** Het sjabloon "Bedrijf of team" heeft kantoorstraten (De printer die nooit werkt, De server). Een sportclub moest ik grotendeels zelf hernoemen. Voorstel: een sjabloon "Club of vereniging".
- **Foto-waarschuwing is wel goed, maar mist een stap.** Bij mijn foto van 120 px kwam "76 dpi, kies een grotere foto" (screenshot `img/vader-joost/18-controle.jpg`). Goed. Maar er is geen knop om meteen die foto te vervangen. Een tik op de waarschuwing opent wel het vak (dat werkte, goed).

## Ontwerp

- **Mooi:** de landing, de sjabloonkaarten en de miniatuur van het bord in Mijn edities. Het klassieke thema met geel lint en groene vlakken ziet er levendig uit. De biljetten (Riso) zijn het mooist: guilloche-patroon, foto in het ovaal, dikke waarde. Zie `img/vader-joost/pdf-e3-geld.jpg` en `img/vader-joost/76-biljet-foto.jpg`.
- **Prima:** de kaarten (Kans en Algemeen Fonds) zijn goed leesbaar, met streepjes aan de zijkant, en de uitlijntest staat er netjes bij. Eigendomsbewijzen zijn strak, met de plaatsnaam boven de naam. Zie `img/vader-joost/pdf-e1-kaarten.jpg`.
- **Kleine foto's op het bord:** de foto's op de vakken zijn ongeveer 1,7 cm breed. Mijn "Molen" en "Kerk" zijn straks niet meer te herkennen. De foto's hebben ook geen rand, ze lopen in het vak over. Zie `img/vader-joost/pdf-e1-bord.jpg`.
- **Pionnen:** de foto wordt als smalle strook uitgesneden. Bij mijn testfoto's zit het gezicht aan de rand en wordt het half afgesneden. Zie `img/vader-joost/pdf-e2-pionnen-huisjes.jpg`. Bij een pion verwacht je het gezicht in het midden.
- **Strak-thema:** werkt als goedkope-inkt-variant, maar de hoeken en kaartvlakken zijn lichtgrijs en het geheel oogt kaal. Zie `img/vader-joost/pdf-e2-bord.jpg`. Handig om te printen, minder feestelijk.
- **Bord in 7 vellen:** de grote vlakken met alleen het lint van de titel zijn veel lege groene of roze pagina's. Wel logisch, maar het woord "Heusden" valt over twee vellen heen en je moet echt knippen en plakken. Dat is niet erg als je de printgids leest.
- **Mijn edities:** het balkje boven elk kaartje is een rare rand (zie bug). Verder zien de kaarten er goed uit en de status "Thuisprint-set klaar tot 28 nov" is heel handig.

## Features die ik zou willen

- **Fotolade met slepen en toewijzen** (must). Joost maakt 8 foto's van het dorp en wil kunnen kiezen welke bij welk vak hoort, vooral op de telefoon.
- **Zoekveld in de vakkenlijst** (must). 41 vakken scrollen op de bank is te lang.
- **Overzicht Kleurgroepen** met plaatsnaam en huurschaal per groep (must). Dat is precies wat deze persona doet.
- **Foto op het eigendomsbewijs** (nice). Dan krijgt de kerk een kaart met de kerk erop.
- **Gezicht in het midden bij pionnen** met een uitsnede-voorbeeld (nice, wel belangrijk voor foto-pionnen).
- **Sjabloon "Club of vereniging"** (nice). Veel mensen willen dit voor een sportclub of een school.
- **Minder geld** (nice): de optie "voor 4 spelers" in plaats van 35 vellen.
- **Delen vanaf de telefoon** (nice): een "Delen"-knop (Android deelmenu) voor de printlink, zodat Joost de PDF's naar de printer van zijn vrouw kan sturen.

## Wat goed werkte

- Opslaan en terugkomen: alle drie de edities en alle foto's waren er in elke nieuwe sessie nog.
- Een vak openen, plaatsnaam typen en terug: snel, ook met het toetsenbord.
- Plaatsnaam per kleurgroep met het label "geldt voor alle 3 oranje straten", en de knop "Standaard" om terug te gaan.
- Foto's van 4000 px verwerken ging vlot (10 foto's in een paar seconden), en de foto-waarschuwing over dpi is duidelijk en klopt.
- PDF's: 24 tot 36 seconden per set, goede paginanummering, kaarten voor- en achterkant, uitlijntest bij de kaarten. De losse downloads per onderdeel stonden er direct.
- Mijn edities met "Dupliceren", "Naam wijzigen" en een statusregel hoe lang de print klaar staat.
