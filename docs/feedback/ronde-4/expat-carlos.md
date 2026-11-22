# Feedback ronde 4: Spaanse expat in Utrecht, Engelse site met euro en Spaanse namen (laptop 1366 × 768)

Persona: Carlos, 35, woont in Utrecht, komt uit Sevilla. Gebruikt de Engelse site. Wil euro's, maar een deel van zijn teksten in het Spaans (ñ, á, ¡). Maakt een Utrecht-editie voor Spaanse vrienden, een Sevilla-editie en een Nederlandse editie voor zijn schoonfamilie. Print bij de kopieerwinkel en leest de instructies als iemand die de Nederlandse drukkerijtermen niet kent. Alles met een script (headless Chrome), geen Samen maken, geen account.

Gemaakt:

1. **Utrecht para los amigos**. Leeg sjabloon, thema Sleek, taal English, munt € euro (eerst per ongeluk M, in de editor omgezet naar euro). Alle 34 vakken hernoemd naar Utrechtse straten met Spaanse stukken (Café El Niño, Plaza Año Nuevo, ¡Vete a la cárcel!). Woorden aangepast: casa, hotel, estación, Suerte, Caja de la comunidad, Banco de Utrecht. Zeven kaarten in het Spaans herschreven. Ondertitel Spaans, foto van de vrienden in het midden, foto op de Domtoren, korte tekst op Start en gevangenis aangepast. Onderdelen: bord, eigendomsbewijzen, kaarten, speelgeld, spelregelboekje. Geprint: Drukkerij-set (speelgeld voor 2 tot 4 spelers), klaar in ongeveer 20 seconden.
2. **Sevilla, mi ciudad**. Sjabloon Je dorp of buurt, thema Riso, English, € euro. Alle 34 vakken hernoemd (Giralda, Triana, Feria de Abril, Real Alcázar), woorden Spaans, zeven kaarten Spaans, foto op La Giralda. Onderdelen: bord, eigendomsbewijzen, kaarten, pionnen (4: Carlos, Lola, Paco, Marisol, één met een piepklein foto), huisregels, huisjes en hotels. Geprint: Thuisprint-set, binnen een minuut.
3. **Familie De Vries**. Sjabloon Familie, thema Classic, taal Nederlands, € euro. Zes vakken hernoemd (Oma Gerda's keuken, Het huisje in Domburg), foto op het huis in Amersfoort, twee kaarten herschreven. Onderdelen: bord, eigendomsbewijzen, kaarten, speelgeld, pionnen, spelregelboekje, uitnodiging. Geprint: Drukkerij-set (speelgeld voor 5 tot 8 spelers), ongeveer 20 seconden.

Ik heb de PDF's gedownload en bekeken (bord, kaarten, geld, boekje, pionnen, uitnodiging, instructies).

## Samenvatting

Het voelde als een site die serieus meedenkt met mensen die niet standaard Nederlands of Engels zijn. De Woorden-lijst is precies wat ik nodig had: ik zette "casa", "estación" en "Suerte" in en ze kwamen overal terug, ook op de eigendomsbewijzen, de kaarten en in het regelboekje. Accenten en ¡ ¿ komen foutloos in de PDF's. Het euroteken staat overal goed, en de Nederlandse editie krijgt vanzelf "€ 60". Het grootste probleem is dat de vaste woorden Engels blijven zodra je een eigen taal gebruikt: "Collect €50", "Pay €200", "Rent", "Mortgage value" en "Place the deck here" staan onder Spaanse tekst, en er is geen Spaanse of "eigen" taal. Het tweede probleem is dat de site na het printen van de Nederlandse editie stil naar /nl springt en dan de hele pagina Engels laat met de NL-knop actief. Voor de drukkerij mis ik instructies in het Nederlands die ik aan de balie kan laten zien.

## Werkt niet (bugs)

1. **Taal springt na het printen van een Nederlandse editie.**
   Waar: printpagina van Familie De Vries, direct na "Make print shop set".
   Wat gebeurde: de run was klaar (6 van 6), de URL werd `/nl/print/<token>` en de knop NL werd actief, maar de pagina bleef Engels (kop "Print Familie De Vries", "Cards and deeds", "Download print shop set"). Na een herlaad is alles Nederlands ("Familie De Vries printen", "Drukkerij-set downloaden (ZIP)"). De Engelse edities bleven netjes op /en.
   Verwacht: de taal van de site blijft die ik koos, of de hele pagina wisselt in één keer en vraagt het eerst.
   Ernst: hinderlijk. Voor een Engelstalige gebruiker met een Nederlandse editie wordt alles ineens Nederlands na één klik.
   Stappen: Nieuwe editie, taal Nederlands, Print, "Make print shop set", wachten tot klaar. Dan Herladen.
   Schermafdruk: `img/expat-carlos/73-after-print.jpg` (Engels met NL actief) en `img/expat-carlos/74-nl-print-token.jpg` (na herladen).

2. **Voorbeeldtekst bij het kaartbedrag noemt altijd "M50".**
   Waar: kaart, veld "For" (in de Engelse editor). Hulptekst: "like Pay M50 for your language course", ook in een editie met euro.
   Verwacht: het teken van de editie (€50).
   Ernst: klein.
   Schermafdruk: `img/expat-carlos/24-card7.jpg`.

3. **"Board green" bij thema Sleek.**
   Waar: Midden van het bord, "What lies underneath?" Knop heet "Board green", maar bij Sleek is het bord wit.
   Ernst: klein.

4. **"M (not a real currency)" staat als gewone keuze naast de echte munten.** Waar: Nieuwe editie, Currency. Mijn eerste klik op het veld "€200" in mijn script landde op "M200" en ik merkte het pas in de editor ("Classic · English · M"). Waarschijnlijk mijn script, dus geen bug. Wel viel me op dat de proefmunt even groot en even opvallend is als €. Ernst: klein.

Ronde 3 nagekeken: nr 17 (eigen woorden in regelboekje) grotendeels opgelost, behalve de kopjes (zie Ontwerp). Nr 25 (Aangepast-teller van een sjabloon) is opgelost: Familie De Vries zegt "8 changed". Nr 6 (teller bij overslaan): geen last. Nr 22 (248 × 248 mm): staat nu goed op de printpagina bij mijn standaardbord.

## UX: wat kan beter

1. **Bij English staat £ als standaard munt, ook voor iemand in Nederland.** Waar: Nieuwe editie, "The currency follows the language". De voorbeeldeditie op de startpagina toont ook £ en "Pay £200" bij Engels. Ik moest zelf op Change klikken en € kiezen. Voorstel: onthoud de laatst gekozen munt, of vraag er bij Engels expliciet naar met € bovenaan voor bezoekers uit Nederland.
2. **Een eigen taal kiezen kan niet.** Waar: "Language of board and cards" kent alleen Nederlands en English. Als ik Spaanse woorden invul, krijg ik Spanglish: "Rent with 1 casa", "Go to la cárcel right now", "Casas cost €50 each", "Full colours and casas". Voorstel: laat me per editie "Eigen taal" kiezen (alle vaste woorden worden invulvelden of blijven leeg), of voeg Spaans toe. Zie Features.
3. **Veel vaste teksten kun je niet aanpassen.** Op het vak Impuestos staat "Pay €200" zonder invulveld (alleen naam, plaatje en bedrag). "Place the deck here", "Mortgage value", "While this property is mortgaged…", "Title deed", "play money" en "Pawn" op de pion staan vast. Voorstel: bij Woorden een uitklapbaar blok "Vaste teksten", of ten minste "Betaal" en "Ontvang" aanpasbaar. Bij Start en bij de gevangenis kon het al via "Short text", dat is goed.
4. **Kaartbedrag onderaan blijft Engels onder Spaanse tekst.** Op een kaart met "¡Te ha tocado la lotería de Navidad! Cobra del banco." staat eronder "Collect €50". Het veld "For" volgt het bedrag, maar de werkwoorden Collect en Pay zijn niet te veranderen. Voorstel: laat het woord bij het bedrag onder Woorden aanpassen, of bied "alleen het bedrag" aan zonder werkwoord.
5. **Instructies volgen de taal van de editie, niet de taal van de site.** Familie De Vries is Nederlands, dus de instructies en bestandsnamen in de ZIP zijn Nederlands (`instructies-speelgeld.pdf`, "Laat het geld printen bij de kopieerwinkel"). Ik las de pagina in het Engels en moest die instructies in het Nederlands lezen. Bij mijn Engelse edities zijn ze Engels, terwijl de drukkerij in Utrecht Nederlands spreekt. Voorstel: instructietaal los kiezen, of beide talen in de ZIP.
6. **Printgids voor iemand zonder Nederlandse drukkerij-ervaring.** De gids zegt "Order as custom-size vinyl sticker, white, matte laminated, with repositionable adhesive", "Choose SRA3", "350 gsm", "rounded corners". Er staat nergens welk type winkel je in Nederland zoekt (copyshop, drukkerij, online drukker), wat een SRA3-vel is (A4 is bekend, SRA3 niet) of wat je moet zeggen aan de balie. Voorstel: een korte kaart "Laat dit aan de balie zien" in het Nederlands met de woorden die de drukkerij kent (zelfklevend vinyl, mat gelamineerd, afgesneden, 350 grams karton), en een zin over SRA3 (iets groter dan A3).
7. **De gids noemt "Go", het bord zegt "Start".** In de Engelse Printgids: "starting with Go in a corner" en "Start at Go". Het Engelse bord en de editor gebruiken "Start" (bij mij "Salida"). Voorstel: "the Start corner".
8. **De printgids zegt dat dezelfde tekst als PDF in elke set zit.** In mijn ZIP zitten alleen vier of zes korte instructie-PDF's per onderdeel, niet de hele gids. Voorstel: de tekst aanpassen of de gids toevoegen.
9. **Bedragformaat volgt de taal van de editie.** In English: "€1,025" en "€1,500". Een Spanjaard schrijft "1.025 €". In Nederlands: "€ 1.500". Voorstel: aparte keuze voor schrijfwijze van bedragen (met voorbeeld in de editor), bijvoorbeeld "1.025 €".
10. **Laptop 1366 × 768: de vakkenlijst begint onderaan het scherm.** Links staan editie, tabbladen, minibord, "Enlarge board" en zoekveld boven de lijst, zodat ik maar twee vakken zie zonder te scrollen. Voorstel: minibord kleiner op lage schermen, of lijst eerst en bord inklapbaar.
11. **Extra foto per ongeluk.** Waar: Midden van het bord. Ik koos "Name with photo", uploadde, en zocht daarna op de pagina een tweede uploadveld ("Choose photo") dat bij "Photo over the whole centre" hoort. Het laatste bestandsveld op de pagina bleek "Add photo" bij Extra layers te zijn, en zo kwam er een tweede foto bij. Dat klopt technisch, maar de pagina heeft twee uploaders met bijna dezelfde naam. Ik kon de extra laag wel weghalen met het kruisje. Voorstel: Add photo anders noemen ("Extra photo on top").

## Ontwerp

Wat mooi was:

- Utrecht-editie in Sleek: strak, veel wit. De bordkleuren komen goed uit, de Domtoren-foto op het vak is netjes gekaderd (`img/expat-carlos/40-deed.jpg` en `pdf-e1-bord.jpg`). Het bord in de PDF is goed leesbaar en de euro staat overal goed.
- Riso voor Sevilla: roze en blauw, vrolijk. De Thuisprint-bordpagina's (`pdf-e2-thuis-bord.jpg`) zijn netjes verdeeld en het raster is makkelijk te knippen.
- Het speelgeld met € en "Banco de Utrecht" ziet er echt uit (`pdf-e1-geld.jpg`).
- De Nederlandse set: eigendomsbewijzen met "Huur met kleurgroep", "Hypotheekwaarde", de uitnodiging "Je bent uitgenodigd" en het boekje klinken natuurlijk (`pdf-e3-kaarten.jpg`, `pdf-e3-uitnodiging-boekje.jpg`).
- Spaanse kaarten met ¡ en ñ staan scherp en passen (`pdf-e1-spaanse-kaarten.jpg`).
- Mijn edities: duidelijke kaarten met "Print-shop set is out of date, make it again" en "Print-shop set ready until 29 Nov" (`95-my-editions.jpg`).

Wat minder was:

- **Spanglish in de PDF's.** Een eigendomsbewijs leest "Rent with 1 casa / Casas cost €50 each / Hoteles cost €50 each" en op het boekje "Full colours and casas", "32 casas and 12 hoteles" (`pdf-e1-kaarten.jpg`, `pdf-e1-regelboekje.jpg`). Op de stationskaart staat "Rent with 2 estaciones". Spaanse woorden midden in Engelse zinnen lezen slordig.
- **Engelse bijschriften op het bord en de kaarten.** "Pay €200" onder Impuestos, "Place the deck here" in de kaartvakken (`pdf-e1-bord.jpg`) en de pionnenvoet met "Pawn" (`pdf-e2-pionnen.jpg`).
- **Spaans en Engels op één kaart.** "Collect €50" onder een Spaanse tekst (`24-card7.jpg`).
- **Foto in het midden van het Sleek-bord** staat half onder het lint en half over de rode vouwstrepen, en is klein. De foto moet je zelf slepen (`32-centre-photo.jpg`).
- **Pionnen**: een foto van 120 px krijgt netjes een waarschuwing (143 dpi), maar de pion toont het toch pixelig. Dat is correct; het past wel bij "Check".
- Het boekje voor de Spaanse editie is helemaal Engels ("How to play", "A game for 2 to 8 players").

## Features die ik zou willen

1. **Eigen taal of Spaans voor bord en kaarten.** Waarom: mijn vrienden lezen geen Engels of Nederlands. Alle vaste woorden (Collect, Pay, Rent, Mortgage value, Place the deck here, Title deed) als invulveld bij Woorden, of Spaans erbij. Must.
2. **Instructies voor de drukkerij in het Nederlands, los van de editietaal.** Waarom: de kopieerwinkel in Utrecht spreekt Nederlands, ik lees Engels. Ik wil een "toon dit aan de balie"-pagina met de juiste termen, ook bij Engelse edities. Must.
3. **Munt onthouden en € als vooraf gekozen munt bij bezoek uit Nederland.** Waarom: elke nieuwe editie weer £ rechtzetten is ruis. Nice.
4. **Schrijfwijze van bedragen kiezen (1.025 € of €1,025).** Waarom: mijn Spaanse en Nederlandse edities hebben elk hun eigen gewoonte. Nice.
5. **Een woord voor het bedrag op kaarten aanpasbaar, ook "alleen het bedrag".** Waarom: ik wil geen "Collect" onder Spaanse tekst. Must als feature 1 niet komt.
6. **Zoek en vervang over de hele editie.** Waarom: ik wijzig "casa" of een straat op meer plekken (vak, deed, kaarten) en wil zien waar het nog staat. Nice.
7. **Per vak kleur of foto kopiëren naar een andere editie ("Dupliceer en vervang taal").** Waarom: ik wil de Utrecht-editie snel omzetten naar Sevilla zonder alles over te typen. Nice.

## Wat goed werkte

- Woorden-lijst: één keer invullen, overal terug (vak, deed, kaart, boekje, speelgeld). De placeholders tonen wat de standaard was en "Standard" zet het terug.
- Namen in de kaartlijst met een variabele (Salida, Domplein) volgen mee als je het vak hernoemt.
- Accenten, ñ, ¡ en ¿ in vakken, kaarten en PDF's: geen enkele fout.
- Euro in alle PDF's en de Nederlandse editie krijgt "€ 60" met spatie zonder dat ik iets deed.
- Check-knop meldt een lage resolutie en pionnen zonder foto.
- Snelheid: Drukkerij-set in ongeveer 20 seconden, Thuisprint onder een minuut, geen "Te veel aanvragen".
- De 4 pionnen van 8 teruggebracht naar 4 en de naam per pion op de PDF.
- Mijn edities toont wanneer de printset niet meer klopt met de editie.
