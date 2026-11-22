# Feedback ronde 5: oma Gerda maakt spellen voor de kleinkinderen (Android 360 × 740, grote letters)

Persona: Gerda, 71, woont in Ruinerwold. Ze is niet handig met computers en heeft een kleine Android-telefoon. Ze leest langzaam, tikt op grote dingen en raakt snel de weg kwijt. Ze wil een spel maken met de namen van de familie en van het dorp, voor Daan, Noor en Fleur.

Opmerking over de test: ik heb met een script (headless Chrome, Android-user-agent, 360 × 740, aanraken) getikt en geveegd. De grote letters van Android heb ik nagedaan met een standaard lettergrootte van 20 in plaats van 16 (125%). Monospace-tekst schaalde daardoor niet mee; dat is van de test, niet van de site. De foto's zijn gemaakt met ImageMagick (kleurverloop, twee gezichtjes als cirkels, een bijschrift), van 180 × 135 px tot 4032 × 3024 px. Ik heb geen Samen maken-link gemaakt en niet ingelogd.

Gemaakt (alle drie Nederlands, euro, Thuisprint-set):

1. **Het spel van Oma Gerda**. Sjabloon Familie (via "Bekijk dit sjabloon" en "Begin met deze als basis"), thema Klassiek. Ondertitel "Voor Daan, Noor en Fleur". 12 vakken hernoemd door te typen in de lijst (Het huis van Oma Gerda, Dorpsstraat 12, De schuur van Opa Henk, Logeren bij Oma, Het huis van Fleur en meer). Foto's op 4 vakken, waaronder een piepkleine van 180 px. Midden: "Naam met foto". 4 pionnen met naam en foto (Oma Gerda, Daan, Noor, Fleur). Geprint: bord, kaarten en pionnen, speelgeld uitgevinkt.
2. **Ons Ruinerwold**. Sjabloon Dorp of wijk, thema Klassiek. 13 vakken hernoemd (Dijkhuizen, Oude Postweg, Bakker Jansen, Kerk Ruinerwold, Café De Kroon, De Brink, De Molen, Huize Gerda en meer), 3 foto's (kerk, bakker, molen). Midden: "Foto over het hele midden" met een staande foto van de kerk. Geprint: bord en kaarten.
3. **Fleur wordt 8!** Dit was de tweede poging. De eerste keer tikte ik op Nieuwe editie meteen op de grote rode knop "Editie maken" en kreeg ik een lege "Onze editie" (zie UX 1). Daarna per ongeluk ook nog een kopie gemaakt. Beide verwijderd via Mijn edities. Toen opnieuw met sjabloon Feest (kwam vanzelf in Riso). 7 vakken hernoemd (Het huis van Fleur, Juf Annemiek, Zwemles, De pony van Fleur, Oma's appeltaart, Fleur is jarig!, Fleurs kroon), 2 Kans-kaarten herschreven, foto in het midden en op een vak, 4 pionnen, uitnodiging met datum en adres. Geprint: bord, kaarten, speelgeld (aanbevolen, 2 tot 4 spelers), pionnen, doosdeksel (stond al aan) en uitnodiging.

## Samenvatting

Voor Gerda is dit een stuk vriendelijker dan ik verwachtte. Met grote letters past bijna alles op de telefoon, de knoppen zijn groot genoeg, en namen typen in de lijst gaat vlot. Foto toevoegen is nu één tik. De meldingen zijn in gewone taal ("Deze foto is te klein en wordt korrelig op papier"), en de printpagina begint op de Thuisprint-set. Het mooiste vond ik de uitnodiging voor Fleur met het eigen bord erop, en het vergrote bord waarop ze alle namen kan lezen. Het grootste probleem is de weg kwijtraken: de terugknop van Android gooit haar uit de editor, de sjablonen staan onder de vouw zodat ze per ongeluk een lege editie maakt, en het mapje rechtsboven zegt niet dat daar haar spellen staan. Printen ging snel (7 tot 23 seconden per set), maar ze krijgt een ZIP of losse PDF's op een telefoon, en dan houdt het voor haar op.

## Werkt niet (bugs)

1. **Terugknop van Android verlaat de editor.** Waar: editor, een vak open (paneel van Bakker Jansen). Wat gebeurde: de terugknop (Android-gebaar of knop) bracht me naar de startpagina, niet terug naar de lijst. Een tweede keer terug sloot de site helemaal. Verwacht: terug sluit het paneel en je staat weer in de lijst. Ernst: hinderlijk; voor Gerda bijna blokkerend, want dit is precies hoe zij "terug" doet. Stappen: startpagina, Verder met, editie openen, vak openen, terugknop. Screenshot: `img/oma-gerda/16-androidterug-uit-editor.jpg`.
2. **Foto over het hele midden past niet direct.** Waar: Midden van het bord, Afbeelding, "Foto over het hele midden", staande foto van 2400 × 3200. Wat gebeurde: meteen na het kiezen staat er "De foto bedekt het kader niet helemaal. Zoom in of schuif de foto terug", terwijl ik niets verschoof. In de PDF zit langs twee randen een groene strook, de foto is sterk ingezoomd (het bijschrift "Kerk Ruinerwold" valt weg) en de twee gezichten liggen precies op het kruis van de vouwlijnen. Verwacht: een nieuwe foto vult het kader vanzelf en het midden van de foto ligt niet op de vouw. Ernst: hinderlijk. Screenshots: `img/oma-gerda/17-foto-hele-midden-melding.jpg`, `img/oma-gerda/27-pdf-bord-dorp-foto-midden.jpg`.
3. **Segmentbalk in het midden past niet bij grote letters.** Waar: Midden van het bord, "Wat staat er in het midden?". Met 125% tekst is "Naam" 42 px breed en "Logo" 39 px, het woord "Naam" loopt buiten het rode kader. Verwacht (B196): de keuze past op één regel, of breekt netjes af op twee regels. Ernst: klein, voor Gerda hinderlijk (kleine tikvlakken). Screenshot: `img/oma-gerda/08-midden-segmentbalk-grote-letters.jpg`.
4. **Voorbeeld: sluitknop zakt naar een eigen regel.** Waar: Voorbeeld op de telefoon met grote letters. Het kruisje staat onder "Voorbeeld − Passend +", los op een tweede regel, en de tabs (Bord, Eigendomsbewijzen, Kaarten, ...) lopen rechts van het scherm af zonder teken dat je kunt schuiven. Onder het bord is een half scherm leeg. Ernst: klein. Screenshot: `img/oma-gerda/10-voorbeeld-sluitknop.jpg`.
5. **Voorbeeld van een sjabloon: tabs afgekapt en vakken leeg.** Waar: Nieuwe editie, "Bekijk dit sjabloon" (Familie). De tabs heten "Eigend", "Algem", "Huisreg" (afgekapt zonder puntjes). Op het bord staan geen namen in de vakken, dus Gerda ziet niet wat het sjabloon invult; alleen onder het bord staat één naam ("Het ouderlijk huis"). Ernst: klein. Screenshot: `img/oma-gerda/03-voorbeeld-sjabloon-lege-vakken.jpg`.
6. **Pionnenlijst laat geen foto zien.** Waar: Doos, Pionnen. Na een foto op Oma Gerda en Daan blijven de rondjes in de lijst leeg. De waarschuwing "2 pionnen hebben nog geen foto" stond alleen als driehoekje bij Noor, niet bij Fleur. Ernst: klein. Screenshot: `img/oma-gerda/09-pionnen.jpg`.

Console: alleen een geblokkeerde Bugsnag-sessie, geen fouten van de site zelf.

## UX: wat kan beter

1. **Sjablonen staan onder de vouw, de rode knop niet.** Waar: Nieuwe editie op 360 px. Het eerste scherm is een grote tekening van het Zaterdagclub-bord, en onderaan staat al een vaste balk met "Onze editie" en "Editie maken". De sjablonen beginnen pas na een hele schermhoogte scrollen. Gerda tikt op de grote rode knop en krijgt een lege standaardeditie zonder dat ze iets koos. Een sjabloon wisselen kan daarna niet meer, dus ze moet opnieuw beginnen. Voorstel: op de telefoon de tekening weglaten of klein maken en "Begin met…" direct onder de titel; of de knop pas actief na een keuze, met "Kies eerst hoe je begint". Screenshot: `img/oma-gerda/02-nieuwe-editie-sjablonen-onder-de-vouw.jpg`.
2. **Waar staan mijn spellen?** Waar: kop van elke pagina. Mijn edities is een blauw mapje zonder tekst. Gerda zoekt het woord "spellen" of "edities". "Verder met" op de startpagina helpt wel, maar toont alleen de laatste twee; haar familiespel, het belangrijkste, verdween daar nadat ze er twee bij maakte. Voorstel: het mapje een woord geven ("Mijn spellen" of "Mijn edities"), en in "Verder met" alle edities tonen tot een stuk of vijf. Screenshots: `img/oma-gerda/14-home-verder-met.jpg`, `img/oma-gerda/22-home-verder-met-twee.jpg`.
3. **Mijn edities is eng.** "Wis je je browsergegevens, dan ben je ze kwijt" begrijpt Gerda niet, en het enige alternatief is Google. Ze schrikt en weet niet wat ze moet doen. Voorstel: een rustigere zin ("Je spellen staan op deze telefoon") en een manier zonder Google om een spel veilig te stellen, zie Features. Screenshot: `img/oma-gerda/15-mijn-edities.jpg`.
4. **Het voorbeeld van een vak is piepklein.** Waar: vak openen op de telefoon. Bijna de helft van het scherm is het voorbeeld, maar het vak zelf is ongeveer 40 px breed en de naam is onleesbaar. "Sleep om te verschuiven, knijp om te zoomen" is op zo'n klein vak met een vinger niet te doen. Na een foto klapt het voorbeeld in tot "Voorbeeld tonen", zodat Gerda haar foto niet ziet. Voorstel: het vak op de telefoon groot tonen (zoals "Bord vergroten" dat zo goed doet), of "Bord vergroten" openen met dat vak in beeld. Screenshots: `img/oma-gerda/06-vak-klein-voorbeeld.jpg`, `img/oma-gerda/07-kleine-foto-melding.jpg`.
5. **Vinkjes op de printpagina zijn klein.** Het vinkje per onderdeel is 20 × 20 px. Tikken op de titel of het plaatje doet niets. Voorstel: de hele kop van de rij aantikbaar maken, of een groter vinkje. Screenshot: `img/oma-gerda/12-vinkje-speelgeld.jpg`.
6. **Printen op een telefoon.** Na Set maken staat er "ZIP downloaden" en per onderdeel "PDF" en "Delen". Een ZIP opent Gerda niet op haar Android. "Delen" is goed (naar WhatsApp van haar zoon), maar staat niet bovenaan en de grote rode knop wijst naar de ZIP. Voorstel: op een telefoon de grote knop "Alles delen" of "Naar mijn e-mail" maken, en de ZIP klein eronder. Screenshot: `img/oma-gerda/11-printpagina-boven.jpg`.
7. **Pagina's of vellen** (nog open uit ronde 4, Ria punt 5). Bij Kaarten staat nog "7 vellen A4 · dubbelzijdig, 9 kaarten per vel · plus een proefpagina". De PDF heeft 16 pagina's. Het bestelblad zegt wel netjes "16 pagina's A4". Voorstel: overal dezelfde zin. Screenshot: `img/oma-gerda/13-printpagina-rijen.jpg`.
8. **Doosdeksel staat bij Feest aan, op A3.** Gerda heeft een A4-printer. Het deksel stond in de Thuisprint-set al aangevinkt en kwam als A3-PDF. Ze ziet "1 vel A3" pas als ze het leest. Dit punt stond ook bij Fatima in ronde 4. Voorstel: in de Thuisprint-set uit laten staan, of op twee A4's. Bij Dorp of wijk stond speelgeld juist uit, bij Familie aan; voor Gerda is niet te zien waarom. Screenshot: `img/oma-gerda/23-print-doosdeksel-aan.jpg`.
9. **Woorden die Gerda niet kent of verkeerd leest.** Proefvel: "Past het, bestel dan", terwijl ze thuis print. Boekje: "Vouw de vellen in het midden en niet ze" leest als "en niet ze" (bedoeld is nieten). Kaarten-PDF: "Uitlijntest". Bestelblad voor thuis: "RGB (sRGB). Omzetten naar CMYK mag." Bord vergroten: "Met de pijltjes loop je langs het bord, Enter opent het vak" op een telefoon zonder pijltjes. Menu van de editie: "Sneltoetsen?" op een telefoon. Voorstel: "Vouw de vellen dubbel en zet er een nietje in", "Proefvel" zonder "bestel" in de Thuisprint-set, toetsenbordtekst alleen tonen met een toetsenbord. Screenshots: `img/oma-gerda/18-menu-sneltoetsen.jpg`, `img/oma-gerda/30-pdf-bestelblad.jpg`, `img/oma-gerda/21-bord-vergroten.jpg`.
10. **Het spelregelboekje noemt huisjes en dobbelstenen.** "In de doos zit: 32 huisjes en 12 hotels, 2 dobbelstenen". Die maakt de site niet meer (B200). Gerda heeft een oude doos, dus het klopt voor haar, maar het boekje zegt nergens dat die uit je eigen doos komen. Voorstel: "uit je eigen doos" erbij.
11. **Kaarttekst helemaal vervangen op Android.** Het tekstveld van een kaart is geen gewoon invoerveld. Alles selecteren en overtypen werkte in mijn script alleen met een trucje; met een gewone tik kwam de nieuwe tekst midden in de oude. Een echte Android-gebruiker moet lang drukken en "Alles selecteren" kiezen, en dat kent Gerda niet. Voorstel: een knop "Tekst wissen" naast "Standaard". Met de hand nakijken op een echte telefoon.

## Ontwerp

Mooi:

- De startpagina en de editor zijn ook met grote letters netjes: niets loopt buiten het scherm (360 px breed overal) en de knoppen zijn 44 tot 48 px hoog (`img/oma-gerda/01-landing.jpg`, `img/oma-gerda/04-editor-start.jpg`).
- Namen typen in de lijst voelt als een schriftje invullen (`img/oma-gerda/05-namen-typen-in-lijst.jpg`).
- Bord vergroten is het mooiste scherm voor Gerda: grote letters in elk vak, en de uitleg zegt dat je kunt schuiven (`img/oma-gerda/21-bord-vergroten.jpg`).
- De uitnodiging voor Fleur met het eigen bord en de eigen tekst is echt iets om rond te sturen (`img/oma-gerda/20-uitnodiging.jpg`, `img/oma-gerda/29-pdf-uitnodiging.jpg`).
- Het bord in de PDF: foto's van de familie op de vakken en de foto in het midden staat nu in een eigen vak, buiten de vouw (`img/oma-gerda/24-pdf-bord-familie.jpg`).
- Pionnen met foto en naam, netjes op één vel (`img/oma-gerda/26-pdf-pionnen.jpg`).
- Kaarten en eigendomsbewijzen zijn rustig en leesbaar, ook de zelf geschreven kaarten (`img/oma-gerda/25-pdf-kaarten-familie.jpg`).
- Verwijderen vraagt het duidelijk en zegt dat het niet terug kan (`img/oma-gerda/19-verwijderen.jpg`).

Goedkoop of niet af:

- Het doosdeksel van Fleur is een roze vlak met de titel en vier icoontjes. Op A3 is dat veel papier voor weinig (`img/oma-gerda/28-pdf-doosdeksel-a3.jpg`).
- Speelgeld: 24 vellen, 4,5 MB, en de eerste vier vellen zijn alleen biljetten van € 1 (nog zo uit ronde 4, Ria).
- Het thuisbord heeft nog steeds vier grote effen middenvlakken; veel inkt (nog zo uit ronde 4, Ria).
- Eigendomsbewijs met foto: de foto wordt een smalle strook en de gezichtjes zijn half afgesneden (Oma's keuken, Logeren bij Oma) (`img/oma-gerda/25-pdf-kaarten-familie.jpg`).
- Foto over het hele midden: zie bug 2, de foto is vooral een grote uitvergroting van twee gezichten op de vouw (`img/oma-gerda/27-pdf-bord-dorp-foto-midden.jpg`).

## Features die ik zou willen

- **Een spel bewaren zonder Google.** Bijvoorbeeld "Stuur mij een link per e-mail" of een code om op te schrijven. Waarom: Gerda heeft geen zin in Google-inloggen, en als haar kleinzoon de telefoon "opschoont" is alles weg. Must.
- **"Alles delen" of "Naar mijn e-mail" na het printen, als grote knop op de telefoon.** Waarom: ze print niet vanaf de telefoon; haar zoon of de bibliotheek print. Een ZIP kan ze niet openen. Must.
- **Terugknop die doet wat je verwacht.** Zie bug 1. Must.
- **Kies een sjabloon voordat de rode knop werkt, en later van sjabloon kunnen wisselen.** Waarom: ze maakte per ongeluk een lege editie. Must.
- **Een groot voorbeeld van het vak op de telefoon.** Waarom: ze wil haar foto en naam zien zoals ze op het bord komen. Nice, bijna must.
- **Een A4-variant van het doosdeksel.** Waarom: thuisprinter is A4. Nice.
- **Uitnodiging rechtstreeks naar WhatsApp.** De PNG en "Delen" zijn er al; een knop "Deel de uitnodiging" in de editor bij de Uitnodiging zou het voor Gerda vindbaar maken. Nice.

## Wat goed werkte

- Foto toevoegen is één tik ("Foto" opent meteen de foto's); ronde 4 punt van Ria is opgelost.
- Gewone taal bij een te kleine foto, en "Scherp genoeg" bij een goede.
- "Tekst van de kaart" en de uitleg over het grijze blokje in plaats van "variabelen".
- De printpagina begint op Thuisprint-set, met bovenaan in één zin welke set bij welke winkel hoort.
- "Nog even nakijken" bovenaan, met "Aanpassen" dat meteen het juiste vak opent.
- Printen ging snel: 7 tot 23 seconden per set, ook met speelgeld. Bestandsnamen dragen de naam van de editie (`het-spel-van-oma-gerda-bord-thuis.pdf`).
- Het printen ging door toen ik de pagina halverwege sloot; later stond alles klaar.
- Aantal pionnen kiezen in één rij, en de PDF had echt maar 4 pionnen.
- In de PDF's stonden alle eigen namen, foto's, bedragen en het euroteken.
