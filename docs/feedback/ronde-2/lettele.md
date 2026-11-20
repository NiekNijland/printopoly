# Feedback ronde 2: Lettele (EN, Riso, tablet 1024×768)

Persona: ontwerper, 26, tablet eerst. Editie "Lettele Monopoly" (Riso, EN, M-valuta): alle onderdelen aan, 28 straten/stations/nutsbedrijven hernoemd naar Lettele en Salland, 62 foto's (WebP 3000×2000) verspreid over vakken, centrum, deksel, pionnen, biljetten, kaarten en huisregels, 7 biljetkleuren, bank "Bank of Lettele", 16 eigen kaarten met bedragen, huisregels.

## Korte samenvatting

De editor is op tablet prettig en de Riso-kleuren staan consistent in editor en PDF (roze bord, blauwe Chance, roze Community Chest). Uploaden in batches werkt zonder fouten (1 job-POST plus 5 foto-POSTs, 62 foto's, alle 201). Maar de uitkomst is onbruikbaar: **in geen enkele PDF komt een foto terecht**. Overal staat het kleine kapotte-afbeelding-icoontje (een 14×16 px placeholder), op het bord, de kaarten, de pionnen, het deksel en de biljetten. Ik heb dat uitgesloten van mijn eigen test: ook een klein proefje met 1 tot 5 foto's, en ook een JPEG, geeft hetzelfde. Daarnaast faalt het onderdeel Play money twee keer ("failed, try again"), en gedragen een paar editorvelden zich stale. Drie printruns gebruikt (hoofdset, proefje met 4 foto's, proefje met JPEG), plus 1 retry van geld.

## Bevindingen

### 1. Foto's ontbreken in alle PDF's (kapotte-afbeelding-icoon)
- Waar: print-shop set van productie, alle onderdelen (bord, kaarten, pionnen, deksel, biljetten).
- Wat: elk fotokader toont het standaard-icoon voor een niet ladend plaatje. `pdfimages -list` laat alleen een 14×16 px afbeelding zien (417 B), geen echte foto. Bord 88 KB, deksel 10 KB: zo klein kan het niet met 62 foto's.
- Verwacht: de foto, bijgesneden op het kader, op 300 dpi.
- Ernst: **blokkerend**. Het hele idee van "eigen foto's op je bord" werkt niet in de PDF.
- Stappen: editie met een foto op het deksel, Print, Make print shop set, PDF downloaden. Reproduceerde met 62 foto's (WebP), met 4 foto's (WebP) en met een JPEG van 2400×1600 op het deksel. Vermoeden: Chrome op de server kan de ondertekende `print-render/...` crop-URL niet ophalen (host, signed URL of resolver-regel). De editor zelf geeft op deze foto's "Resolution 1693 dpi, sharp enough", dus de upload zelf is goed gekeurd.
- Bijzonder: de status zegt "ready" met groen vinkje. Er is geen waarschuwing dat foto's ontbreken. Een printshop-klant bestelt zo een leeg bord. Idee: de renderer moet falen (of waarschuwen) als een foto niet laadt.

### 2. Play money faalt twee keer ("failed, try again")
- Waar: print-pagina, onderdeel Play money, mijn hoofdset (210 biljetten, 7 gekleurde biljetten met foto's, bankbenaming).
- Wat: na de uploads en de rest van de onderdelen klaar, staat geld op "failed". "Try again" geeft opnieuw "failed" (na ~1 minuut). Geen reden getoond. Het proefje met 1 biljetfoto lukte wel (15 pagina's SRA3-formaat, 530 KB).
- Verwacht: geld is gemaakt, of een duidelijke melding waarom niet (te veel biljetten met foto, tijd-out).
- Ernst: **blokkerend** voor de set (de ZIP is nooit klaar zolang één onderdeel faalt; knop "Download print shop set (ZIP)" bleef wel zichtbaar, maar `zip/printer` gaf `printerZipReady: false`).
- Stappen: nieuwe editie, alle onderdelen, 7 eigen biljetkleuren plus foto's, Print, Make.

### 3. Print starten geeft ~65 seconden geen voortgang
- Waar: print-pagina, na "Make print shop set".
- Wat: alle onderdelen blijven "NOT MADE YET" terwijl 62 foto's uploaden (6 POSTs, circa 65 s). Pas daarna springt de eerste naar "being made". Het ziet eruit alsof er niets gebeurt. Ook de overgang van editor naar print-pagina na de klik op Print duurt een paar seconden zonder indicator.
- Verwacht: een voortgangsregel ("Photos uploaden 3 van 6").
- Ernst: hinderlijk.

### 4. Naamveld toont oude waarde bij wisselen van onderdeel (stale invoer)
- Waar: editor, Name-veld rechts, tab Board en Box.
- Wat: ik hernoemde Community Chest met toetsenbord naar "Dorpskist". Daarna toonden Start, Centre of the board en Box lid in het veld Name ook "Dorpskist", terwijl kop en voorbeeld de juiste naam hadden. Idem in de kaartentab: het verhaalveld en het bedragveld van een kaart toonden de waarde van een andere kaart (bij kaart "Community Chest 3": tekst van kaart 8, bedrag 45 van kaart 7) terwijl de voorbeeldkaart klopte. Een echte klik op een kaart herstelt het verhaalveld niet altijd; het bedragveld bleef stale.
- Verwacht: veld volgt de selectie. Nu bestaat het risico dat iemand de verkeerde kaart overschrijft (ik heb dat zelf gedaan: de tekst van CC 3 werd aan de stale tekst vastgeplakt).
- Ernst: hinderlijk. (Let op: ik zette een deel van de waarden met scripts; de stale toestand ontstond ook na echte toetsaanslagen.)
- Stappen: spatie hernoemen, daarna andere spaties selecteren, kijk naar Name.

### 5. Foto- en naamvelden voor vakken waar ze niets doen
- Waar: editor, Community Chest, Chance, Income Tax, Start, Free Parking.
- Wat: bij deze vakken verschijnt wel "Name" en "Photo" (met zoom en zwart-wit) en de lijst krijgt na upload een foto-stip, maar de preview toont de foto niet bij Chance/Community Chest. Op het bord in de PDF staat een foto-kader alleen bij Start, Free Parking en Go to Jail, niet bij Chance/Community Chest/belastingvakken.
- Verwacht: alleen velden tonen die iets doen, of de foto tonen.
- Ernst: klein.

### 6. Kaarten: standaardteksten zonder muntteken naast eigen kaarten met "M"
- Waar: cards.pdf (Chance en Community Chest).
- Wat: eigen kaarten tonen "Collect M150", "Pay M40". Standaardkaarten zeggen "Caught speeding: pay a 15 fine", "Your treat: pay each player 50", "collect 150". Het muntteken ontbreekt in de lopende tekst, terwijl de bedragregel onderaan wel M heeft. Ook de homepage-voorbeeldkaart ("Pay Jan 50").
- Verwacht: één spelling van bedragen.
- Ernst: hinderlijk (spelregel is anders niet duidelijk bij valuta "M").

### 7. Standaardkaart verwijst naar oude straatnaam
- Waar: editor, kaart Chance 3, blok "Standard card".
- Wat: "Walk on to Linden Avenue ... first pink space (Linden Avenue)" terwijl die straat in mijn editie "Zandbelt" heet. Op de gedrukte kaarten klopt het wel (daar stond "Advance to the Oude Molen" omdat ik het zelf schreef), maar de standaardkaart-uitleg blijft op de oude naam hangen.
- Ernst: klein.

### 8. Deksel en centrum: "Background: board green" in een roze Riso-editie
- Waar: editor, Box lid en Centre of the board, laag "Background".
- Wat: de laaglabel zegt "board green" terwijl de achtergrond roze is. Ook het deksel zelf toont een lege fotokader, en op een tablet is het kleine voorbeeld (~180 px) matig om te beoordelen.
- Ernst: klein.

### 9. Riso is niet doorgevoerd op eigendomsbewijzen, biljetten, huisregels en instructies
- Waar: PDF's.
- Wat: eigendomsbewijzen zijn crème met dikke zwarte rand en bruin/rood/geel van het klassieke thema, "Title deed" is piepklein (~5 pt), en de achterkant is één grote lege vlakte met "Mortgage M30". Het bord en de kaartenachterkant zijn roze en blauw (wel Riso). Het huisregelskaart-voorbeeld en de biljet-standaard zijn crème. Instructie-PDF's zijn kale Helvetica, zwart op wit (niet in huisstijl). Mijn gekozen biljetkleuren heb ik niet kunnen beoordelen omdat geld faalde.
- Verwacht: duidelijk één stijl per thema (roze achtergrond of Riso-accenten op deeds en notes).
- Ernst: hinderlijk voor een ontwerper; het ziet er niet als één set uit.

### 10. Bord-PDF: geen paneelletters of snijmarkeringen
- Waar: board.pdf (4 pagina's, 254 × 254 mm).
- Wat: bleed van 3 mm zit erin (alleen kleurvlak, geen marks, logisch voor vinyl). Maar de pagina's dragen geen aanduiding A, B, C, D, terwijl de instructie zegt "Lay panel A against the outer corner". Een drukker of gebruiker moet de volgorde raden uit de bestandsvolgorde.
- Ernst: klein.

### 11. Pionnen: 8 voorbeelden zonder foto, achterkant op de kop
- Waar: tokens.pdf (A4 liggend, crop marks aanwezig).
- Wat: alle foto's ontbreken (zie 1). Layout klopt: voor- en achterkant gespiegeld voor vouwen. Woord "Pawn" onderaan staat in lichtgrijs en is bijna onzichtbaar.
- Ernst: klein.

### 12. Homepage en print-gids tonen nog "Pay Jan 50" en dergelijke
- Waar: homepage, print-gids, voorbeeldkaarten.
- Wat: "You lose the pot at cards. Pay Jan 50." Het is een voorbeeldkaart, maar mist het M. Zie ook 6.
- Ernst: klein.

### 13. Instructietekst klopt niet met de set
- Waar: instructions cards.
- Wat: "Quantity: 60 cards (61 with the house rules card)" terwijl mijn set 61 kaarten bevat. De rest, 122 pagina's (voor- en achterkant afwisselend), is voor een printshop goed verwoord.
- Ernst: klein.

### 14. Editor-minikaart toont de foto's niet
- Waar: editor, minibord linksboven.
- Wat: alleen een stip per vak, geen miniatuur van de foto. Ook het centrum in het minibord blijft wit terwijl het echte centrum roze met titel en foto is. Pionnen-rondjes in de lijst blijven grijs ook na upload.
- Ernst: klein (idee: miniaturen).

### 15. Voorbeeld van een biljet is erg klein
- Waar: editor, Money.
- Wat: het biljet beslaat ~180 px op 1024 px breed met veel ongebruikte ruimte. Op een tablet moet je op een foto van 60 px beslissen of het mooi is.
- Ernst: idee.

## Niet gedaan
- Tablet staand (768×1024) niet doorlopen; geen tijd.
- Home-print set niet gemaakt (printruns gebruikt voor de foto-diagnose).
- Gekleurde biljetten, deksel met foto en pionnen met foto niet in PDF kunnen beoordelen door bevinding 1 en 2.

## Wat wel goed was
- Het toevoegen van veel foto's in één keer (batches van 10) en het hernoemen van vakken werkt snel.
- Roze/blauwe Riso-vlakken en het bord met kleurbalk komen overeen met de editor (WYSIWYG, wanneer er geen foto is).
- Typografie op de eigendomsbewijzen is leesbaar en consistent (mono bedragen, rechts uitgelijnd).
- Resolutiecontrole in de editor ("1693 dpi, sharp enough") is duidelijk.
