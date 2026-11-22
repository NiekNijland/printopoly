# Feedback ronde 6: drukke moeder, alles op de iPhone (iPhone 390 × 844)

Persona: Sara, 36, moeder van Lieke (bijna 10). Ze doet alles op haar iPhone, tussen andere dingen door. Ze maakt een spel voor Liekes verjaardag met foto's uit haar fotorol (meestal staand, en het liefst een paar tegelijk), met een uitnodiging met datum en plek. Ze print thuis op een gewone printer en deelt de bestanden vanaf haar telefoon. Daarna een kerstspel voor de familie en een leeg bord dat de kinderen zelf invullen. Site in het Nederlands.

Gemaakt:

| Editie | Sjabloon | Thema | Taal | Munt | Wat ik aanpaste | Geprint (Thuisprint-set) |
| --- | --- | --- | --- | --- | --- | --- |
| Lieke wordt 10! | Feest (via "Begin met" op de landing) | Riso | NL | € | 6 namen in één keer geplakt, 9 foto's op vakken in twee keer meerdere tegelijk (ook een piepkleine WhatsApp-foto en een liggende), foto over het hele midden, ondertitel "Feest op zaterdag 6 december", 8 pionnen met naam, 4 met foto, uitnodiging met datum, plek en "Zwemspullen en een warme trui" | bord, kaarten en eigendomsbewijzen, pionnen, uitnodiging (PDF en PNG); daarna "Alles delen" en "Deel je bord" |
| Kerst bij de Jansens | Familie | Klassiek | NL | € | 8 namen geplakt, 5 foto's tegelijk, foto over het hele midden (foto van 6 MB, 4284 × 5712), een kaart herschreven (betalen, met "Waarvoor"), een extra Kans-kaart met foto | eerst het proefvel, daarna bord, kaarten, speelgeld (één keer, 24 vellen), doosdeksel, spelregelboekje |
| Ons eigen spel | Leeg | Strak | NL | € | "Alle namen op het bord leegmaken", daarna 4 namen van de kinderen geplakt | bord, kaarten en eigendomsbewijzen |

Vier printruns. De sets waren in 10 tot 49 seconden klaar, ook met 24 vellen speelgeld.

## Samenvatting

Op de telefoon werkt het nu echt fijn. Het mooiste was vijf foto's in één keer kiezen: de site zet ze op de volgende straten en laat je in een lijstje meteen wisselen. Op het bord en in de PDF staat alles goed: mijn namen, foto's, euro's en een ingevulde uitnodiging die er feestelijk uitziet. "Alles delen" geeft de PDF's netjes aan het deelmenu, en "Deel je bord" toont nu het echte bord met foto's. Het grootste probleem voor mij: de knop Delen bij de uitnodiging stuurt een link naar een PDF, terwijl ik het plaatje in de klassenapp wil zetten. Verder springt "terug" vanuit een pion naar het tabblad Bord, en de lijst met pionnen toont nog steeds geen foto's.

## Werkt niet (bugs)

1. **Delen bij de uitnodiging deelt een link, niet het plaatje.** Waar: printpagina, rij Uitnodiging, knop "Delen" (aria: "PDF delen: Uitnodiging"). Wat gebeurde: het deelmenu kreeg alleen een URL naar `/api/print/…/files/home/invitation`, geen bestand. "Alles delen" geeft wel bestanden, maar alleen de vier PDF's, niet de PNG van de uitnodiging. Bij de PNG staat geen deelknop. Verwacht: bij de uitnodiging deel ik het plaatje (de PNG van 1080 px), want dat zet je in een groepsapp. Een PDF-link zie je in de app niet meteen; een plaatje wel. Ernst: hinderlijk. Stappen: set met uitnodiging maken, bij Uitnodiging op Delen tikken. Screenshot: `img/moeder-sara/10-printpagina-alles-delen.jpg`.

2. **Terug vanuit een pion gaat naar het tabblad Bord.** Waar: Doos, een pion openen, linksboven "Terug naar het bord". Wat gebeurde: ik kwam op het tabblad Bord uit, niet op Doos. Bij acht pionnen moet ik elke keer weer naar Doos tikken en omlaag scrollen. Verwacht: terug naar de lijst waar ik vandaan kwam. Ernst: hinderlijk. Screenshot: `08-terug-van-pion-naar-bord.jpg`.

3. **Het spelregelboekje telt een extra kaart niet mee.** Waar: Kerst bij de Jansens, PDF spelregelboekje. Ik voegde een 17e Kans-kaart toe. Die staat goed in de kaarten-PDF, maar het boekje zegt bij "In de doos zit" nog "16 kaarten Kans en 16 kaarten Algemeen Fonds". Ernst: klein. Screenshot: `20-pdf-boekje-en-geld-kerst.jpg`.

4. **Een naam leegmaken zet hem stil terug naar de standaardnaam.** Waar: lijst van het bord en het veld Naam in een vak. Ik wiste "Kroonplein" om hem leeg te laten voor de kinderen. Na het verlaten van het veld stond er weer "Kroonplein". Alleen een spatie typen geeft een leeg vak. Er is wel "Alle namen op het bord leegmaken", maar dat zit verstopt in het menu (…) van één vak, en het wist ook de namen die ik net had getypt. Verwacht: leeg is leeg, met de bestaande melding "nog geen naam". Ernst: hinderlijk voor een leeg bord. Screenshot: `21-namen-leegmaken-verstopt.jpg`.

Gecontroleerd uit ronde 5 en nu goed:
- R5-01: staande foto's van 3024 × 4032 krijgen geen valse waarschuwing meer. Overal "Scherp genoeg".
- R5-02: "Foto over het hele midden" in een nieuwe editie opent de fotokiezer en de foto staat er daarna in.
- R5-09: de piepkleine foto (240 × 320) gaf geen dubbele melding. Hij gaf zelfs helemaal geen melding: "Scherp genoeg" bij 37 bij 36 mm. Op papier zag hij er ook redelijk uit, dus dat klopt waarschijnlijk.
- R5-10: plakken in "Zoek een vak of plak namen" vult de straten ("6 namen ingevuld. 3 vakken van een andere soort zijn overgeslagen."). `02-plakken-zoekveld.jpg`
- R5-11 en R5-12: bij een kaart kies ik Betalen of Ontvangen, en "voor de piek en de lichtjes" wordt "Betaal € 45 voor de piek en de lichtjes", zonder dubbel "voor". `16-kaart-betalen-voor.jpg`
- R5-13: een leeg bord geeft één regel: "28 vakken hebben nog geen naam. Wil je ze leeg printen…". `22-leeg-nakijken.jpg`
- R5-20: elke nieuwe editie begint met bord en kaarten, en de editor zegt meteen "niet in je set".
- R5-21: op de telefoon staan de sjablonen in het eerste scherm en de balk zegt "Begin: Feest · Riso". `01-nieuwe-editie-feest.jpg`
- R5-24: "Deel je bord" toont het echte bord met foto's en de banier "Onze eigen editie". `11-deel-je-bord.jpg`
- R5-26: het proefvel toont "Ons huis" en € 60, en de rij zegt "Past het, print dan de rest". `18-pdf-proefvel-kerst.jpg`
- R5-27: de vinkjes zijn 24 px en een tik op de titel van de rij zet ze om.
- R5-29: het doosdeksel komt thuis op 2 vellen A4 met een overlap. Het boekje noemt de huisjes, hotels en dobbelstenen uit je eigen spel.
- R5-30: het boekje zegt nu "Vouw de vellen dubbel en zet er twee nietjes in".

## UX: wat kan beter

1. **Foto's tegelijk kiezen: geen plaatjes in het lijstje.** Na het kiezen van vijf foto's staat er "IMG_4101.jpg → Huis van Lieke" enzovoort. Op een iPhone zegt een bestandsnaam niets, en soms heet elke foto "image.jpg". Ik zette daardoor twee foto's verkeerd (de juf op de school en opa op de juf). Wisselen in het lijstje werkt goed (het ruilt de twee), maar alleen zolang het lijstje open staat. Daarna moet je per vak "Andere foto" doen. Voorstel: een kleine miniatuur voor elke regel. Screenshots: `03-vijf-fotos-tegelijk.jpg`, `04-fotos-wisselen.jpg`.

2. **Foto's tegelijk: alleen vooruit en alleen straten.** Het lijstje biedt alleen straten na het vak waar je begon, en slaat stations over ("van een andere soort"), terwijl een station wel een foto kan krijgen. De zin "Overgeslagen: 4 vakken met al een foto, van een andere soort of zonder plek voor een foto" vond ik vaag; ik wist niet welke vier. Voorstel: noem de vakken, of laat alle vakken met een fotoplek kiezen.

3. **Pionnenlijst zonder foto** (ronde 5, Mo, UX 9, nog open). In Doos heeft elke pion een grijs rondje, ook als er een foto op staat. Ik zette met één keer kiezen vier foto's op vier pionnen en kon daarna in de lijst niet zien wie welke had. Voorstel: het rondje wordt de foto. Screenshot: `09-pionnen-zonder-miniatuur.jpg`.

4. **Feest zonder uitnodiging aan.** Het Feest-sjabloon zet de uitnodiging niet meer aan (dat is nu voor alle sjablonen gelijk, prima). Maar in de editor staat bij Uitnodiging alleen "niet in je set", zonder knop om hem erin te zetten. Ik moest dat op de printpagina doen. Voorstel: in de editor bij een onderdeel dat niet in de set zit een knopje "In mijn set".

5. **Foto over het hele midden: het gezicht valt op de naad.** De foto begint met de ogen boven de horizontale vouw, maar een gezicht in het midden van de foto valt altijd op de verticale naad tussen de vier stickers. In de PDF loopt die naad precies tussen Liekes ogen. De hint noemt alleen de vouwlijn. Voorstel: de foto standaard iets naar links of rechts zetten, of de hint zeggen dat het midden uit vier stickers bestaat. Screenshots: `06-foto-hele-midden.jpg`, `12-pdf-bord-feest.jpg`.

6. **Twee verschillende verhalen over opslag.** In de editor stond één keer "Bewaard op dit toestel. Safari wist het als je de site 7 dagen niet opent." Op Mijn edities staat "Daar blijft hij, tenzij je de sitegegevens van de browser wist." Ik maak het kerstspel in november en open het half december weer. Welke klopt? Voorstel: op beide plekken dezelfde zin, en op een iPhone de 7 dagen ook op Mijn edities. Screenshot: `25-mijn-edities.jpg`.

7. **Uitnodiging: één regel per regel.** De uitleg bij "Wanneer, waar, wat neem je mee" zegt "Datum, plek en wat iedereen meeneemt, één regel per regel." Dat leest raar. Voorstel: "Elk op een eigen regel." En vier uitnodigingen per vel is voor een klas van 7 meisjes twee vellen; de rij kan zeggen hoeveel vellen je voor hoeveel kinderen nodig hebt.

8. **Leeg bord om zelf te schrijven.** Een vak zonder naam print als lege ruimte. Voor kinderen met een pen zou een stippellijn handig zijn, ook in de kop van een leeg eigendomsbewijs. Screenshot: `23-pdf-leeg-bord.jpg`.

9. **Voorbeeld op de telefoon.** De tabbladen lopen nog steeds van het scherm af ("Gelc", met nu een zachte rand), en onder het bord is de helft van het scherm leeg. Screenshot: `24-voorbeeld.jpg`.

10. **Kleine teksten.** Een kaart uit het sjabloon wijst na mijn plakken naar een andere plek: "Je mag als eerste een cadeau brengen naar Opa Wim." Dat volgt logisch uit het hernoemen, maar zie je pas als je de kaarten doorleest. Een regel bij het plakken als "3 kaarten noemen deze vakken" zou helpen.

## Ontwerp

Mooi:
- De nieuwe editie-pagina op de telefoon: sjabloonkaarten met een plaatje, en de balk onderaan met "Begin: Feest · Riso", naam en knop. `01-nieuwe-editie-feest.jpg`
- Het minibord in de editor met de foto's erin, en het midden met de grote foto en het roze lint.
- De uitnodiging is het mooiste stuk papier: kop, het bord met foto's en mijn eigen regels eronder. `14-pdf-uitnodiging.jpg`
- "Deel je bord" is nu echt leuk om in de familie-app te zetten. `11-deel-je-bord.jpg`
- Het speelgeld met de naam van de editie op elk biljet, en het boekje met een eigen voorkant. `20-pdf-boekje-en-geld-kerst.jpg`

Minder:
- Het voorbeeld van een vak of kaart in het paneel is klein (een kaart van ongeveer 80 punten breed), terwijl er ruimte genoeg is. Een foto op een kaart beoordelen gaat daardoor lastig. `17-extra-kaart-met-foto.jpg`
- De lijst met vakken heeft een kleurblokje, geen foto. Na negen foto's zie je in de lijst niet welke vakken er een hebben.
- Het doosdeksel thuis is een effen vlak met de naam en vijf iconen. Voor een kerstcadeau had ik er graag een foto op gehad.

PDF's:
- Bord thuis: 7 vellen, mijn foto's scherp, de liggende foto "Speeltuin" netjes gedraaid in zijn vak. `12-pdf-bord-feest.jpg`
- Eigendomsbewijzen met fotostrook, de gezichten staan er heel op. `15-pdf-kaarten-feest.jpg`
- Pionnen: de naam onder de foto valt een klein stukje over de onderrand van de foto. Pionnen zonder foto zijn een kaartje met alleen de naam. `13-pdf-pionnen.jpg`
- Proefvel met mijn eigen startvak en eerste vak in euro's. `18-pdf-proefvel-kerst.jpg`
- Doosdeksel op 2 vellen A4, met een stippellijn waar het tweede deel overheen komt. `19-pdf-bord-en-deksel-kerst.jpg`

## Features die ik zou willen

1. **De uitnodiging als plaatje delen.** Een deelknop bij de PNG, en de PNG ook in "Alles delen" of juist apart. Ik stuur de uitnodiging naar ouders in de klassenapp en print hem niet. Must.
2. **Miniaturen bij foto's.** In het lijstje na het tegelijk kiezen, in de lijst met vakken en bij de pionnen. Op de telefoon zie ik anders niet wat waar staat. Must.
3. **Een foto op het doosdeksel.** Het kerstspel is een cadeau voor opa en oma; een familiefoto op de doos maakt het af. Nice.
4. **Een kerstthema.** Er zijn drie thema's (Klassiek, Riso, Strak). Een winterse kleur of sterretjes voor de familie-editie zou leuk zijn. Nice.
5. **"Leeg maken" als duidelijke keuze bij een nieuw leeg bord.** Bij "Leeg" verwachtte ik lege vakken, niet Molenweg en Veldweg. Een keuze "Lege vakken om zelf te schrijven" bij Nieuwe editie, of de menu-optie ook in het tabblad Bord. Nice.
6. **Aantal uitnodigingen kiezen.** "Hoeveel kinderen nodig je uit?" en dan het juiste aantal vellen. Nice.

## Wat goed werkte

- Vijf foto's tegelijk kiezen, en wisselen in het lijstje.
- Namen plakken in het zoekveld.
- Snelle printruns (10 tot 49 seconden), ook met al het speelgeld.
- "Alles delen" geeft de PDF's met nette bestandsnamen aan het deelmenu.
- De uitnodiging met datum en plek, op papier en in de editor.
- Betalen of ontvangen kiezen bij een kaart, met een duidelijke waarschuwing als de tekst iets anders zegt.
- Eén regel in "Nog even nakijken" voor een bewust leeg bord.
