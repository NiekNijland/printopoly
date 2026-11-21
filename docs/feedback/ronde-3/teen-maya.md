# Feedback ronde 3: tiener die grappige edities voor haar vriendengroep maakt (iPhone, 390 px)

Persona: Maya, 16. Gebruikt de site in het Engels op haar iPhone, is ongeduldig en tikt snel. Maakt edities met inside jokes, zet memes op Kanskaarten, laat vrienden via Samen maken bijdragen insturen en wil alles makkelijk delen. Print weinig, hooguit de kaarten thuis.

Gemaakt (alles via headless Chrome met iPhone-profiel, schermpad staat tussen haakjes):

1. **Squad Wars 2026**: sjabloon "The Friends Game", thema Riso, Engels, munt M. Ik hernoemde 22 vakken (Zoe's Basement, Night Bus 69, Karaoke Disaster Bar, enzovoort), schreef 8 Kanskaarten en 5 Algemeen Fonds-kaarten om met memes, maakte een Samen maken-link en speelde drie vrienden (Zoe, Lina, Mats) in drie aparte profielen. Alle 4 bijdragen toegepast. Geprint: thuisset, alleen "Cards and deeds" (16 A4-pagina's, 4 minuten wachten).
2. **Rizz Estate**: leeg sjabloon, thema Sleek, Engels, eigen munt "Rizz" met teken R. Zes vakken hernoemd, een foto op een vak, 4 Kanskaarten herschreven, 1 nieuwe kaart toegevoegd, pionnen en doosdeksel aangezet, 4 pionnen met foto (kat, karaoke, kelder, piepklein 120 px). Poging tot printen van de pionnen: zie bug 9, niet gelukt.
3. **Lina's 17th: Birthday Bash**: sjabloon Birthday, thema Riso, munt $, 6 vakken hernoemd. Niet geprint.

## Samenvatting

De editor voelt snel en grappig genoeg voor een tiener: namen typen, Volgende tikken en verder, en de kaartteksten volgen je hernoemde vakken automatisch. Samen maken is het mooiste: de vriendenpagina is helder, de live voorbeeldkaart is leuk en bijdragen toepassen is één tik. Het grootste probleem staat in de PDF: mijn eigen memekaarten printen met het oude bedrag uit het sjabloon eronder ("Sigma moment ... Collect 200" met "Collect M40" onderaan). Daarnaast faalt "Make the picture" (de deelafbeelding voor de groepschat) met een serverfout, terwijl delen juist waar Maya voor komt. Het bord in de editor is een blanco schema zonder namen, waardoor je je eigen werk nergens echt ziet behalve in Preview.

## Werkt niet (bugs)

1. **Deelplaatje maken geeft serverfout.** Waar: editor, Edition, Make it together, "Make the picture". Wat: rode melding "Making the picture didn't work. Try again in a moment." Netwerk: `POST /api/share-image` geeft 500, drie keer achter elkaar hetzelfde. Verwacht: een plaatje van het bord om in de groepschat te sturen. Ernst: hinderlijk, voor deze persona bijna blokkerend (de hele reden om te delen). Screenshot: `img/teen-maya/e1_picture.jpg`.
2. **Bedrag onder op de kaart past niet bij de zelfgeschreven tekst.** Waar: PDF Cards and deeds (en waarschijnlijk de kaartafdruk in het algemeen). Wat: de tekst is los van het bedrag-veld. Mijn kaart "Sigma moment: you win the argument. Collect 200 from the bank." print met onderaan "Collect M40". "Birthday of the group chat admin! Every player gives you 30." print met "Collect M160". "Mats finally pays you back ... Collect 50." print met "Pay M60". Verwacht: dat de tekst en het bedrag niet tegenspreken, of een duidelijke waarschuwing dat het bedrag apart staat (Amounts in de kaarteditor). Ernst: hinderlijk, een speler leest twee bedragen op één kaart. Stappen: kaart 1 van Kans/Algemeen Fonds, tekst vervangen, printen. Screenshot: `img/teen-maya/pdf_chance.jpg`, `img/teen-maya/pdf_chest.jpg`.
3. **Ruwe vertaalsleutel op de vriendenpagina.** Waar: vriendenlink, tab "Towns" (Plaatsen), kaart "Town for Brown": "Now: group.brown" in plaats van een naam. Verwacht: een gewone naam. Ernst: klein. Screenshot: `img/teen-maya/f3_towns.jpg`.
4. **Uitlijntest-achterkant: tekst over de kaartvakken heen.** Waar: PDF Cards and deeds, pagina 2 ("Alignment test, back"). De uitlegtekst staat over de bovenste en middelste kaartkaders en knipt de rand door. Verwacht: tekst buiten of tussen de vakken. Ernst: klein, wel rommelig voor wie de test echt print. Screenshot: `img/teen-maya/pdf_aligntest.jpg`.
5. **Lange titel wordt afgekapt op het bord.** Waar: editor, bordmidden bij "Lina's 17th: Birthday Bash" toont "Lina's 17th: Birthday…" met puntjes. Verwacht: kleiner lettertype of twee regels, zeker op het geprinte bord. Niet in de PDF gecontroleerd. Ernst: klein. Screenshot: `img/teen-maya/n3_created.jpg`.
6. **Voorbeeldkaart op de startpagina en op "Nieuwe editie" mengt munten.** Waar: demo-Kanskaart toont "Pay Jan €50" terwijl het bord M gebruikt ("Collect M50" op de kaart ernaast). Ernst: klein. Screenshot: `img/teen-maya/home1.jpg`.
7. **Foto van een vak komt niet op de eigendomskaart.** Waar: ik zette een foto (Zoe's kelder) op het vak "Zoe's Basement". In de PDF-kaart staat geen foto. Misschien bedoeld (foto is voor het bord), maar het staat nergens uitgelegd. Ernst: klein tot hinderlijk. Screenshot: `img/teen-maya/pdf_deeds.jpg`.
8. **Pionfoto wordt in een smalle strook gekropt.** Waar: pion 1 met een vierkante kattenfoto. Alleen het midden van het gezicht (ogen, oren) zit in de strook, de rest valt weg. Er is geen duidelijke verschuif-regeling voor het uitsnijden. Ernst: hinderlijk, want een pion met een afgesneden gezicht is niet leuk. Screenshot: `img/teen-maya/e2_pawn1_photo.jpg`.
9. **Pionnen printen van Rizz Estate lukte niet in mijn run.** Waar: printpagina, thuisset. Ik tikte "Make" bij de verkeerde knop (de onderdelen staan op andere plek zodra er een doosdeksel is) en daarna bleef alles op "NOT MADE YET" staan zonder foutmelding of melding in beeld. Dit kan mijn script zijn, dus onzeker. Wel opvallend: het voorbeeld van Tokens op de printpagina toont geen foto's op de pionnen (alleen "Maya" en "Zoe"). Screenshot: `img/teen-maya/e2_pawn1_photo.jpg`.
10. **"Changed: 61" op Mijn edities terwijl ik nog niets had aangepast.** Direct na het maken van Squad Wars 2026 (eerste keer) stond dit bij de editie. Wat dit getal telt is onduidelijk. Ernst: klein. Screenshot: `img/teen-maya/list1.jpg`.

## UX: wat kan beter

- **Bord in de editor toont geen namen.** Op de telefoon zie je een wit schema met kleurstroken en stippen voor "veranderd". Je weet niet welk vakje wat is zonder te tikken. Voorstel: namen (klein) op de vakjes, of de Preview ook als bord bovenaan tonen.
- **"Pick a space" ligt over het bord.** De knop onderaan rechts bedekt een stuk van de onderste rij en de hoek. Voorstel: de knop onder het bord of in de hoek buiten het bord zetten.
- **"Enlarge board" werkt vreemd.** Na tikken zie je een uitgezoomd stuk van het bord in een klein venster; de kop van de pagina scrolt half weg. Voorstel: echt schermvullend met slepen en knijpen, of weglaten.
- **"From friends 3" is onduidelijk.** De rode balk springt naar de eerstvolgende bijdrage en laat daar Toepassen/Weigeren zien. Er is geen lijst met alle bijdragen en je ziet niet wat de balk doet voor je tikt. Voorstel: een overzichtslijst met naam, soort en voorbeeld, en dan per regel toepassen.
- **Kanskaarten in de lijst zijn lange lege blokken met afgekapte tekst.** "The first round is on you...." Op de telefoon scroll je lang. Voorstel: kleinere kaarten met 3 regels of een lijstweergave.
- **Tekstveld leeg maken wisselt stil naar een andere standaardtekst.** Als je een kaarttekst wist, toont de voorbeeldkaart opeens een nog andere tekst ("Go to the nearest utility ..."). Voorstel: lege kaart tonen met de waarschuwing die er bij een nieuwe kaart wel staat.
- **Kaarttekst met een bedrag: geen munt.** Standaardkaarten tonen "Collect 200" zonder M, de onderkant van de kaart toont "Collect M200". Een tiener typt "Pay 50" en begrijpt niet waarom er geen M staat. Voorstel: een knop of variabele voor het bedrag in de tekst (zoals Insert voor vakken), of een veld "Bedrag" direct onder de tekst.
- **Friends-sjabloon kent "Towns", "from your town".** De vriendenpagina vraagt "A name from your town, for example" ook bij pionnen en bij een vriendengroep-editie. Voorstel: placeholder aanpassen per soort onderdeel en het Towns-tabblad verbergen als er geen plaatsen zijn.
- **Vrienden zien alle Kanskaarten.** Op de bijdragepagina staan de volledige teksten van mijn kaarten. Voor een spel wil je verrassing. Voorstel: optie "kaarten verbergen voor vrienden".
- **Munt in het Engels is "M".** Een Engelstalige tiener verwacht $ of £. Het hulpje "It follows the language" is te weinig. Eigen munt toont "R 200" met spatie terwijl "M200" zonder spatie staat. Voorstel: dezelfde schrijfwijze overal.
- **"Delete everything" staat naast "Close link" en "New link" in dezelfde tekstlinkstijl.** Makkelijk verkeerd te tikken. Voorstel: Delete rood en apart; ik tikte niet op de knop dus niet getest of er een bevestiging komt.
- **Grote knop "Create edition" blijft onderaan** (goed), maar de pagina erboven heeft veel lege ruimte; het kiezen van thema en onderdelen zit achter "Change". Voor snelle tikkers prima.
- **Opslaan:** ik verloor eenmaal de laatste ~7 wijzigingen toen ik de browser meteen na het typen sloot. In een proef met losse wijzigingen en wachttijden ging het goed. Onzeker of dit een echte bug is. Ernst: klein tot hinderlijk. (Browser-sluiten in mijn script is niet hetzelfde als een tab dichtvegen.)

## Ontwerp

- Home, mijn edities, printpagina en vriendenpagina zien er levendig en consistent uit: dikke zwarte randen, CMYK-strip bovenaan, roze vriendenpagina. Past goed bij een tiener.
- De editorpagina's (vak, kaart) zijn rustig en leesbaar. De voorbeeldkaart bovenaan is een fijne live terugkoppeling.
- Riso en Sleek zien er goed uit in de voorbeelden. Riso's "bruine" straat is paars, terwijl de lijst "brown" zegt.
- De PDF-kaarten zien er netjes uit: duidelijke kleurvlakken, keurige snijmarkeringen, goed leesbaar. Mijn memeteksten staan prima op de Kanskaart, behalve het afwijkende bedrag onderaan.
- In de PDF staat de laatste eigendomskaart (The Reunion) op de pagina met Kanskaarten; dat oogt als een verdwaalde kaart.
- Op de uitlijntest staat tekst over de kaders heen (bug 4).
- Foto's op vakken en pionnen: de kaart "Framed" ziet er netjes uit; de pionstrook is te smal voor gezichten (bug 8).

Screenshots: `img/teen-maya/home1.jpg`, `new_friends_bottom.jpg`, `editor1.jpg`, `e1_board_a.jpg`, `e1_board_big.jpg`, `e1_preview.jpg`, `e1_card_typed.jpg`, `e1_card4_del.jpg`, `e1_link3.jpg`, `e1_picture.jpg`, `f1_ready.jpg`, `f1_sent.jpg`, `f2_cardpick.jpg`, `f2_tiny.jpg`, `f3_towns.jpg`, `e1_applied_2.jpg`, `e1_inbox_zoe.jpg`, `e1_inbox_tap.jpg`, `list1.jpg`, `e2_curr.jpg`, `e2_photo_up.jpg`, `e2_pawn1_photo.jpg`, `n3_created.jpg`, `pdf_deeds.jpg`, `pdf_chance.jpg`, `pdf_chest.jpg`, `pdf_aligntest.jpg`.

## Features die ik zou willen

- **Plaatje voor de groepschat dat werkt, liefst als losse sticker/preview bij de link** (Samen maken). Waar het voor Maya om gaat. Must.
- **Bedrag in de kaarttekst als variabele of gekoppeld veld.** Anders printen tegenstrijdige kaarten. Must.
- **Meme/afbeelding op een Kanskaart** (plaatje plakken, het knopje "Paste" bestaat al voor vakken, hier ontbreekt het zoals ik het zag). Nice, maar voor deze doelgroep sterk.
- **Gezicht-slim uitsnijden van pionfoto's of een eenvoudige verschuif-regeling.** Must voor pionnen.
- **Meer dan één kaarten-voorbeeld tegelijk (kaartenlijst als overzicht)** en kaarten dupliceren. Nice.
- **Vrienden stemmen op ideeën, of de kaartenlijst verbergen.** Nice.
- **Directe "deel deze editie als alleen-lezen link" zonder dat vrienden iets hoeven te sturen** (bijvoorbeeld een voorbeeldlink naar het bord). Nice.
- **Thuisprint voor alleen de kaarten met een knop die minder dan 4 minuten duurt of een voortgangsbalk.** Het wachten zonder voortgang voelt lang voor een ongeduldig iemand. Must voor deze persona; de wachttijd was ruim 4 minuten voor 16 pagina's.

## Wat goed werkte

- Aanmaken van een editie in minder dan een seconde, met sjabloon en vaste knop "Create edition".
- Volgende/Vorige door alle vakken en kaarten tikken, namen typen en alles blijft staan.
- Hernoemde vakken verschijnen vanzelf in de kaartteksten (bijvoorbeeld "Go to Zoe's Hotspot").
- Samen maken: link maken is één tik, vriendenpagina is overzichtelijk, de live voorbeeldkaart werkt, foto's van 3000 en 4000 px worden direct getoond, en "From friends" met stip en teller helpt. Toepassen werkt in één tik, en foto en naam komen goed op het vak.
- Eigen munt, foto's op vakken en Preview met tabbladen werken zonder haperingen.
- De PDF-kaarten zijn scherp en leesbaar.
