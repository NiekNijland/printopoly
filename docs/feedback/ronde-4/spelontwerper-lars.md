# Feedback ronde 4: Lars, hobby-spelontwerper (desktop 2560x1440)

Persona: Lars, 39, ontwerpt in zijn vrije tijd bordspellen. Hij duwt aan de spelkant: 32 kaarten per stapel met eigen teksten en bedragen, alle woorden hernoemd, alle huren aangepast, vakken wisselen, eigen bordmaat. Hij controleert of kaarten, eigendomsbewijzen, boekje en geld met elkaar kloppen. Hij gebruikt ongedaan maken, lijst plakken en zoeken veel.

Gemaakt:

1. **Zeven Zeeën** (piratenspel). Leeg gestart, thema Klassiek, Nederlands. Eigen bordmaat 520 / 72 / 4. Alle 11 onderdelen aan. Eigen munt Dukaat (dk). Woorden: hut(ten), fort(en), steiger(s), bron(nen), "het kerkerhol", stapels Lotkaart en Schatkist, bank Piratenbank. 22 straten geplakt als lijst, 12 hoeken, stations en belastingen hernoemd. Alle 22 straten: prijs en alle huren per kleurgroep tussen -20% en +20%. Salaris 240, Havengeld 180. 16 extra kaarten per stapel (dus 32 + 32) met eigen tekst, variabelen en bedrag. 8 huisregels. Geprint (Drukkerij-set): bord, kaarten en eigendomsbewijzen, speelgeld (volledige bank), spelregelboekje. Gedownload en gelezen: bord, kaarten, speelgeld, boekje.
2. **Dungeon Deals**. Leeg gestart, thema Riso, Engels, eigen munt Gold (g). Woorden: tent(s), keep(s), portal(s), well(s), "the dungeon", stapels Quest en Loot, bank Guild Bank. 22 straten geplakt. Prijzen aangepast en vakken gewisseld (zie bug 1). Geprint: kaarten en eigendomsbewijzen (Engels).
3. **Spoorbaron**. Leeg gestart, thema Strak, Nederlands, euro. Eigen bordmaat 400 / 60 / 3, onderdelen: bord, bewijzen, kaarten, huisregels, boekje. Woorden: loods(en), depot(s), seinhuis(huizen), "de wachtkamer", stapels Spoorwegkaart en Telegram, bank Spoorbank. 30 regels geplakt in een kolom van 22 straten. Lange reeks aanpassingen met ongedaan maken en opnieuw. Niet geprint.

Niet getest: telefoon, Samen maken, foto's.

## Samenvatting

De editor is voor een spelontwerper bijna precies wat ik wil. Lijst plakken, zoeken, ongedaan maken, de Controle en de bedragen met grenzen werken goed en ik had in een kwartier 22 straten, 64 kaarten en alle woorden aangepast. Het mooist zijn de woorden: "hut", "fort" en "het kerkerhol" komen overal in de kaarten terug. Het grootste probleem is dat het gedrukte werk niet meer klopt met wat ik ontwerp. De eigendomsbewijzen in de PDF hebben de standaardhuren, het boekje heeft de standaardprijzen en het standaardsalaris. En: als ik twee aangepaste straten uit verschillende kleurgroepen wissel, kan ik de editie daarna niet meer openen. Dat laatste is blokkerend.

## Werkt niet (bugs)

1. **Twee aangepaste straten wisselen maakt de editie onopenbaar.** Waar: Bord, ⋯ menu, "Wisselen met…". Wat gebeurde: ik wisselde Ankerbaai (bruin, prijs 70) met Kaperspad (lichtblauw, prijs 120). De melding zegt "Prijs en kleur horen bij de plek", maar de bedragen reizen mee met de naam. Op de bruine plek staat dan 120 (buiten het bereik 48 tot 72), de editor toonde meteen "Controle: 9" en foutregels. Na herladen zegt de pagina "De editie kon niet worden geopend" met alleen een knop "Mijn edities". Ik kreeg de editie niet meer open en heb hem moeten herstellen door de opgeslagen gegevens in de browser met de hand terug te zetten. Een gewone gebruiker is alles kwijt. Hetzelfde gebeurde bij mijn tweede editie (Mushroom Row met prijs 66 gewisseld met Mimic Alley met prijs 110). Verwacht: bedragen blijven bij de plek (zoals de melding zegt), of het wisselen weigert, en een editie opent altijd, ook met een bedrag buiten het bereik (bijvoorbeeld door het terug te zetten naar de dichtstbijzijnde grens). Ernst: blokkerend. Stappen: pas bij twee straten van verschillende kleurgroepen de prijs aan, wissel ze, laad de pagina opnieuw. Screenshots: `img/spelontwerper-lars/08-na-wisselen-fouten.jpg`, `img/spelontwerper-lars/09-editie-kon-niet-worden-geopend.jpg`, `img/spelontwerper-lars/10-editie2-kon-niet-worden-geopend.jpg`.
2. **Eigendomsbewijzen in de PDF hebben de standaardhuren, niet mijn aangepaste.** Waar: Printen, Kaarten en eigendomsbewijzen. Wat gebeurde: Kombuiskade staat in de editor (bewijs-tab en printpagina) met huur 12, 36, 108, 192, 300. In de PDF staat 10, 30, 90, 160, 250. Ankerbaai: editor 5, 24, 72, 216, 384, 540; PDF 4, 20, 60, 180, 320, 450. Het bord in de PDF heeft mijn prijzen wel (dk 70, dk 280, dk 320). Ik controleer juist of alles klopt, dus dit is voor mij de grootste fout. Verwacht: de PDF toont wat de editor toont. Ernst: blokkerend voor een ontwerper (spelers rekenen met het verkeerde bedrag). Stappen: pas een huur aan, print kaarten en eigendomsbewijzen, vergelijk. Screenshot: `img/spelontwerper-lars/19-pdf-eigendomsbewijs-default-huur.jpg`.
3. **Spelregelboekje gebruikt de standaardbedragen.** Waar: boekje, hoofdstuk 6 (salaris), hoofdstuk 7 (belasting) en de prijslijst. Wat gebeurde: ik zette het salaris op 240 en Havengeld op 180. Het boekje zegt "je dk 200 van de bank" en "dk 200 of dk 100". De prijslijst heeft Kapiteinsbrug 350 (bord: 280), Rumsteeg 100 (bord: 120), Admiraalsbaai prijs 400 en huur 50 (mijn editie: 320 en 40). Hypotheek, bouwkosten en forthuren zijn ook standaard. Ook de standaardkaarten zeggen "Je krijgt dk 200 van de bank" bij Uitvaren terwijl het salaris 240 is. Verwacht: het boekje en de standaardteksten volgen de bedragen van de editie. Ernst: hinderlijk tot blokkerend (de uitleg spreekt het bord tegen). Screenshot: `img/spelontwerper-lars/22-pdf-boekje-prijslijst.jpg`.
4. **Eigen bedragen op extra kaarten tonen geen munt en geen bedragbalk.** Waar: extra kaart met bedrag, in editor en PDF. Mijn tekst "Een storm! Betaal {amount} voor de reparatie" wordt "Betaal 50", zonder "dk". De standaardkaarten tonen onderaan een balk "Ontvang € 50"; een extra kaart met bedrag toont niets. Verwacht: `{amount}` geeft "dk 50" (zoals `{currency}`) of de kaart krijgt de bedragbalk. Ernst: hinderlijk. Screenshots: `img/spelontwerper-lars/20-pdf-extra-kaart.jpg`, `img/spelontwerper-lars/17-amount-variabele.jpg`.
5. **De knop "Standaard" valt buiten het paneel.** Waar: Editie, Algemeen, Eigen munt (Teken) en Woorden (Nutsbedrijf, Nutsbedrijven). De knop staat naast het label en loopt rechts buiten het paneel (afgekapt tegen de rand van het scherm). Verwacht: het label breekt af of de knop zet zich eronder. Ernst: klein. Screenshots: `img/spelontwerper-lars/02-woorden-standaard-overflow.jpg`, `img/spelontwerper-lars/03-eigen-munt-overflow.jpg`.
6. **Artikel klopt niet bij hernoemde woorden.** Waar: standaardkaarten met `{station}` en `{utility}`. "Ga naar het dichtstbijzijnde steiger" en "het dichtstbijzijnde bron". In het Nederlands hoort er "de" bij. Verwacht: een woord kan "de" of "het" zijn, of de standaardzin schrijft het artikel zonder de uitgang. Ernst: klein. Screenshot: `img/spelontwerper-lars/06-kaarten-tab.jpg`.
7. **Het standaardkaartje "Je trein vertrekt zo" blijft staan.** Ik heb stations hernoemd naar steigers, maar kaart 6 praat nog over "trein" en "het eerstvolgende steiger". Ernst: klein.
8. **Groepskleur hex-veld toont de verkeerde kleur in Riso.** Waar: straat, Stijl, Groepskleur. De straat is paars, het hex-veld en het kleurvak onderaan tonen #955436 (het bruin van Klassiek) en geen swatch is geselecteerd. Verwacht: de huidige kleur. Ernst: klein. Screenshot: `img/spelontwerper-lars/15-riso-hex-veld.jpg`.
9. **Groepskleuren in Strak komen niet overeen met het bord.** In Strak zijn de swatches gedempt, het bord gebruikt de volle kleuren (donkerblauw #0072BB). Er is geen swatch geselecteerd. Ernst: klein.
10. **Paneelmaat op de printpagina klopt waarschijnlijk niet (ronde 3, bug 5, nog niet duidelijk).** Bij een bord van 520 mm staat "4 stuks, elk 258 × 258 mm, 3 mm afloop". Een kwart van 520 is 260. De PDF-pagina is 275,9 mm. Ik kan niet uitrekenen welke maat ik bij de stickerdrukker moet bestellen. Ernst: klein tot hinderlijk. Screenshot: `img/spelontwerper-lars/13-printpagina.jpg`.

## UX: wat kan beter

- **De basishuur is vast bij sommige straten.** Waar: straat, Huur, eerste regel. Bij de eerste bruine straat staat "standaard dk 2, 2 tot 2": de knoppen zijn grijs. Dat volgt uit de 20%-regel (20% van 2 is minder dan 1), maar het zegt het niet. Voorstel: één regel "Te laag om te veranderen" of toestaan met afronding. Screenshot: `img/spelontwerper-lars/05-huur-basis-vast.jpg`.
- **Geen overzicht van alle huren en prijzen op één plek.** Ik moest 22 straten één voor één openen om huren in te stellen (14 s met een script, een uur met de hand). Voorstel: een tabel "Prijzen en huren" met alle straten onder elkaar (kolommen prijs, huur, 1 tot 4, hotel), plus een regel "alle bruine straten +10%". Zonder dat kan ik de balans van het spel niet zien.
- **Balans niet zichtbaar.** De Controle zegt niets over spelbalans: een hotelhuur die lager is dan de huur met 4 huizen, startgeld dat niet past bij prijzen, of de som van de bank. Voorstel: een melding "Huur met hotel is lager dan met 4 huizen" en een regel "Startgeld vs. gemiddelde straatprijs".
- **Wisselen kan alleen met straten.** Het venster "Wisselen met…" toont alleen straten. Ik wil ook een station of belasting kunnen wisselen met een straat, of Kans-vakken verschuiven. Voorstel: laat wisselen met elk vak toe, met de bedragen en het soort mee of op de plek.
- **Hernoemde woorden en vaknamen staan op twee plaatsen.** Het woord "gevangenis" pas ik aan bij Woorden ("het kerkerhol") en de hoek zelf bij het vak ("Kerkerhol (op bezoek)"). Dat is te begrijpen, maar twee keer invullen zal makkelijk vergeten worden. Voorstel: bij het woord een regel "Ook het hoekvak hernoemen?".
- **Beschrijving onder Onderdelen zegt nog "Huisjes en hotels".** Na hernoemen naar hutten en forten staat daar nog "32 huisjes en 12 hotels om te vouwen". Ook de printpagina.
- **Standaardsalaris staat vast in kaartteksten.** Voorstel: `{salary}` als variabele, zodat "Je krijgt het salaris" meebeweegt.
- **Menu ⋯ duwt het hele paneel omlaag.** Als het menu opent, schuift de inhoud 108 px naar beneden. Voorstel: laat het menu over het paneel heen komen.
- **Kaartenlijst op 2560 px.** De lijst met 32 kaarten per stapel is prettig (genummerd, tegels). Alleen de tekst is erg klein (afgekapt). Voorstel: de tekst op de tegel op groter scherm groter.
- **Editor op groot scherm.** Het voorbeeld in het midden is klein (370 px breed op 2560 px) en veel ruimte blijft leeg. Voorstel: laat het voorbeeld meeschalen met het scherm.
- **Plakken: kolom naar straten.** Plakken vult alleen straten en meldt "22 namen ingevuld. 8 regels bleven over". Dat is helder. Voorstel: ook "plak voor stations" of de volgorde van de lijst kiezen.
- **Printpagina: wachtlus.** Een run duurde op de server enkele seconden tot minuten; de pagina zegt dan "Maken" met een status. Ik kon na het klikken niet goed zien dat er al een run klaar was; pas na herladen stond "KLAAR, PDF, Instructies". Voorstel: de status van de eerste klik duidelijker.

## Ontwerp

- **Editor:** rustig en goed leesbaar. Controle, "aangepast"-tellers in de tabs ("34 aangepast"), de stip bij gewijzigde rijen en de "Standaard"-knopjes zijn precies wat ik nodig heb. Het schakelen tussen Vak en Eigendomsbewijs en Voorkant en Achterkant is snel.
- **Bord:** Klassiek en Riso zien er netjes uit. Het gele lint met de titel in het midden is mooi. Strak is stijf maar rustig. Een eigen bordmaat van 400 mm (30 mm per vak) geeft heel kleine vakken zonder waarschuwing.
- **Speelgeld:** de dk 1-biljet met guilloche, huisje en sleutel ziet er echt uit. De naam van de munt staat verticaal op de rand. Zie `img/spelontwerper-lars/21-pdf-biljet.jpg`.
- **Kaarten (PDF):** een rustige opmaak, goed leesbaar, maar de extra kaarten zijn kaal naast de standaardkaarten met een bedragbalk. Zie `img/spelontwerper-lars/20-pdf-extra-kaart.jpg`.
- **Boekje:** 16 A5-pagina's, nette lay-out, maar de prijslijst klopt niet met mijn bord (bug 3). Zie `img/spelontwerper-lars/23-pdf-boekje-1.jpg`.
- **Foutscherm:** "De editie kon niet worden geopend" is kaal: geen uitleg, geen herstel, geen ontwerp dat bij de rest past. Zie `img/spelontwerper-lars/09-editie-kon-niet-worden-geopend.jpg`.

## Features die ik zou willen

- **Tabel met alle prijzen en huren** (prijs, huren, bouwkosten, hypotheek per straat, per kleurgroep invulbaar). Waarom: ik ontwerp de balans, geen losse straat. Must.
- **Balanscontrole in Controle**: huur loopt op met bebouwing, salaris past bij de prijzen, hotelhuur hoger dan 4 huizen, bank heeft genoeg biljetten voor het aantal spelers. Waarom: dat is waar een spelontwerper op let. Must.
- **PDF en boekje volgen altijd de editor** (huren, prijzen, salaris, belasting, hypotheek). Waarom: anders kan ik het niet uitgeven. Must.
- **Variabelen `{salary}`, `{tax}`** in kaarten en standaardteksten. Waarom: kaarttekst volgt de regels. Nice.
- **Wisselen met elk vak en kaartenvolgorde slepen** (nu 1 tot 32 vast). Waarom: ik wil kaarten schudden en de volgorde van het spel bepalen. Nice.
- **Kaarten dupliceren en kaart naar andere stapel kopiëren.** Waarom: veel kaarten lijken op elkaar. Nice.
- **Editie dupliceren** (voor een tweede variant). Waarom: ik maak varianten (ronde 3 vroeg dit ook, Henk). Must voor wie meer edities maakt.
- **Export en import van de hele editie als bestand (JSON of tabel)**. Waarom: back-up en delen met testspelers, en na bug 1 weet ik dat één editie in de browser kwetsbaar is. Must.
- **Eigen biljetwaarden en eigen startbedrag.** Waarom: bij 1 dk-munt en prijzen van 70 wil ik andere coupures. Nice.
- **Versie en wijzigingsgeschiedenis van de editie** (terug naar gisteren). Waarom: ongedaan maken verdwijnt bij herladen. Nice.

## Wat goed werkte

- Lijst plakken: 22 namen in één keer, één stap ongedaan te maken ("Ongedaan: 3 namen."), en "8 regels bleven over" bij te veel.
- Zoeken in de lijst van vakken en kaarten.
- Ongedaan maken en opnieuw: 12 stappen terug en weer vooruit, ook over prijzen en namen heen.
- Bedragen buiten de grens gaan naar de dichtstbijzijnde grens met een duidelijke melding ("Maximaal 300. Het bedrag staat nu op 300.").
- Woorden in kaarten (`{hotel}`, `{jail}`, `{space:N}`): ze veranderden mee met mijn hernoemingen. Ook in het Engels.
- 32 kaarten per stapel, "Deze stapel heeft 32 kaarten. Meer kan niet." en een duidelijke waarschuwing bij een lege kaart of `{amount}` zonder bedrag.
- Huisregels: Enter maakt nu altijd een nieuwe regel (ronde 3, bug 4 is opgelost). De kaart nummert zelf.
- De printrun met vier onderdelen kwam zonder "Te veel aanvragen" door.
