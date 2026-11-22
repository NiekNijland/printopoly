# Feedback ronde 4: opa Bert, 78, eerste keer online (iPad 820x1180 staand en 1180x820 liggend)

Persona: Bert, 78, nooit eerder zoiets gemaakt. Zit op een iPad (touch, scherm met factor 2), staand en liggend. Grotere tekst aan (125% via CSS). Leest elk woord, gaat langzaam en raakt snel de weg kwijt. Wil drie spellen maken en laten printen bij de kopieerwinkel: een over zijn oude buurt in Rotterdam, een voor zijn visclub en een voor zijn achterkleinkinderen. Geen Samen maken gebruikt, niet ingelogd.

Gemaakt (alles NL, munt euro, Chrome met iPad-gebruikersagent, één vast profiel):

1. **Kralingen vroeger**. Sjabloon "Je dorp of wijk", thema Klassiek. 27 vakken hernoemd naar Rotterdamse plekken (Oude Haven, Station Blaak, Euromast, Erasmusbrug), plaatsnamen op straatgroepen, foto's op 6 straten (waaronder een piepkleine van 160x120 px en een HEIC-achtig bestand), ondertitel "Rotterdam, 1962". Geprint: **Thuisprint-set** met bord (7 vellen) en kaarten (16 vellen), 25 seconden. PDF's gedownload en bekeken.
2. **Vissersclub De Snoek**. Sjabloon "Club of vereniging", thema gewisseld naar Strak. 28 vakken hernoemd (Steiger 7, Karperwater, Snoekenbank), 3 foto's, 2 Kans-kaarten herschreven. Geprint: **Drukkerij-set** met alle 5 onderdelen (bord 4 panelen, 122 losse kaarten, 22 vellen SRA3 geld, pionnen, doosdeksel), 25 seconden. Dit was mijn enige volledige geldrun.
3. **Het spel van Overgrootvader Bert**. Sjabloon "Familie", thema Klassiek. 12 vakken hernoemd en 4 foto's (Emma, Lars, tuin, opa), 4 pionnen met namen Emma, Lars, Opa Bert, Sophie, een foto op de pion van Emma, ondertitel "Voor Emma, Lars en Sophie". Geprint: **Thuisprint-set** met bord, kaarten, speelgeld (24 A4) en pionnen, 25 seconden.

Extra: foto van 4032x3024 als HEIC op een vak gezet (5 seconden, klaar). Liggend de editor en het vergrote bord bekeken. Pagina "Mijn edities" en de Printgids bekeken. Geen consolefouten van de site gezien.

## Samenvatting

Een editie maken ging snel: van sjabloon naar editor in minder dan een halve seconde, en alles werkt met een vinger. Het mooiste vond ik het resultaat: namen en foto's komen vanzelf in bord, eigendomsbewijzen en kaarten, en de PDF's zijn netjes. De printpagina is rustig en de status is duidelijk. Het grootste probleem voor Bert is het vergrote bord: dat is groter dan het venster en je ziet niet dat je moet schuiven. Daarnaast weet iemand die naar de kopieerwinkel wil niet welke set hij moet kiezen, en bij de Drukkerij-set krijg je 122 losse kaartpagina's die een kopieerwinkel niet kan gebruiken. Het blijft een tool waarin je veel moet snappen, maar Bert redt het als hij tijd neemt.

## Werkt niet (bugs)

**1. Vergroot bord is groter dan het venster, zonder aanwijzing dat je kunt schuiven** (hinderlijk)
- Waar: editor, knop "Bord vergroten".
- Wat gebeurde: staand (820 px) is het bord 820 px breed in een vak van 760 px. De linker- en rechterkolom worden afgesneden ("Vrij parkeren", "Erasmusbru", "Euromas"). Liggend (1180x820) is het vak 616 px hoog voor een bord van 820 px: de bovenste rij ontbreekt. Het gebied scrolt wel (overflow-auto), maar er is geen schuifbalk, geen pijl en geen hint.
- Verwacht: het hele bord past, of er staat "Sleep om de rest te zien".
- Stappen: iPad, editor openen, "Bord vergroten".
- Screenshots: `img/opa-bert/05-bord-vergroten-staand.jpg`, `img/opa-bert/06-bord-vergroten-liggend.jpg`. Let op: de tekstgrootte stond op 125%, ik heb niet zonder 125% vergeleken. De afmetingen horen bij een 820 en 1180 px brede iPad.

**2. Lange namen in de vakkenlijst worden afgekapt zonder puntjes** (klein)
- Waar: lijst links in de editor. "Speeltuin Bergpold", "De Woonkamer van O", "Het Clubhuis aan de M". Bij 125% tekst valt dit vaak voor. Bert denkt dat hij een naam verkeerd typte.
- Voorstel: puntjes (…) of de naam over twee regels.
- Screenshot: `03-lijst-afgekapt.jpg`.

**3. Kaartminiaturen breken woorden midden in** (klein)
- Waar: tab Kaarten, de rij kleine kaartjes. "wedstrij d", "supporte rsbus", "voorzitte r", "contribut ie". Het stipje "aangepast" ligt bovenop de tekst ("Ga naa●").
- Screenshot: `11-kaarten-lijst.jpg`.

**4. Eén Kans-kaart werd niet vervangen door mijn tekst** (klein, twijfel)
- Waar: Kaarten, Kans 3. Ik tikte in het tekstveld, selecteerde alles en typte nieuwe tekst. Kaart 1 en 2 namen de tekst over, kaart 3 niet. Het kan aan mijn script liggen (Cmd+A in een rich-text veld op iPad-emulatie). Ik meld het zonder zeker te weten dat het een bug is.

## UX: wat kan beter

**1. Welke set voor de kopieerwinkel?**
- Waar: printpagina, kop met "Drukkerij-set" en "Thuisprint-set".
- Bert wil naar de kopieerwinkel. Er staat nergens dat de kopieerwinkel de Thuisprint-set op A4 kan doen. De naam "Drukkerij-set" klinkt als het juiste. Bij die set krijg je een kaartenbestand van 122 pagina's met één kaart per pagina (81 x 106 mm) en geld op SRA3. Dat kan een kopieerwinkel niet zomaar. De Printgids noemt de kopieerwinkel één keer (bij het proefvel).
- Voorstel: een derde keuze of een korte regel bovenaan: "Kopieerwinkel of eigen printer: kies Thuisprint-set. Drukkerij of vinylprinter: kies Drukkerij-set." Plus een korte lijst "Dit geef je mee aan de winkel" (PDF, papier 160 tot 200 g, dubbelzijdig, op 100%).

**2. De melding over Safari bij de eerste tik**
- Waar: bovenaan de lijst in de editor: "Safari wist dit als je de site 7 dagen niet opent." Dit staat er al voordat je iets deed. Voor Bert klinkt dat als "mijn werk verdwijnt". Later verandert het in "Alleen in deze browser · 07:57 · Inloggen met Google", dat is rustiger.
- Voorstel: één vaste, rustige regel ("Je werk staat alleen op deze iPad. Open de site minstens eens per week, of log in met Google om het te bewaren") en pas een waarschuwing als er echt iets verloren kan gaan.

**3. Het naamveld staat ver onder de sjablonen**
- Waar: Nieuwe editie. Je kiest een sjabloon bovenaan, de naam, taal, thema, onderdelen en munt staan na twee schermen scrollen, en "Editie maken" zweeft in een balk onderin. Bert zag in mijn test pas na scrollen dat hij een naam kon geven. Er staat al "Onze editie" in, dus het gaat niet mis, maar hij heet dan zo.
- Voorstel: naam bovenaan, of in de balk onderin ("Editie maken van: ____").
- Screenshots: `22-nieuwe-editie-top.jpg`, `01-nieuwe-editie-naamveld.jpg`.

**4. "Verhaal" voor de tekst van een kaart**
- Waar: Kaarten, het veld met de kaarttekst heet "Verhaal". Bert zoekt "Tekst". De uitleg met "Invoegen", "variabelen" en "Standaardtekst" is moeilijk. De bolletjes ("Start", "€", "De Oude Maas") in de tekst begrijpt een beginner niet zonder uitleg.
- Voorstel: "Tekst van de kaart", en één zin dat een grijs bolletje vanzelf meeverandert.
- Screenshot: `11-kaarten-lijst.jpg`.

**5. Veel meldingen over de foto na een lage dpi**
- Een piepkleine foto (160x120) geeft "Controle: 2" met uitleg per vak (102 en 75 dpi). Dat is goed. In de lijst staat wel een klein driehoekje bij het vak, maar Bert ziet pas wat het betekent als hij op Controle tikt. In het paneel bij de foto zelf zag ik geen melding. Voorstel: een gele regel direct onder de foto ("Deze foto is klein, op papier wordt hij korrelig").
- Screenshot: `04-controle-popover.jpg`.

**6. De Controle-lijst bedekt het linker deel**
- De popover van Controle ligt over de lijst links. Bert denkt dat hij het niet kan sluiten. "Sluiten" staat rechtsonder in de popover. Een kruisje rechtsboven helpt.

**7. De vier chips in het paneel "Editie"** (Algemeen, Uiterlijk, Woorden, Onderdelen, Bord, Samen maken)
- Ze springen naar een stuk lager in dezelfde pagina. Dat werkte, maar je ziet niet dat je op dezelfde pagina blijft: het paneel lijkt dan veranderd. Voorstel: de chip wordt dik als je in die sectie staat.

**8. Pionnen**
- "Aantal pionnen" geldt voor de hele set en staat in het paneel van één pion. "Pion 4" werd na het kiezen van 4 een lege plek. Controle meldt "3 pionnen hebben nog geen foto" onder de naam van één pion ("Lars · Doos"). Voorstel: de melding noemt alle drie de namen.
- Screenshots: `13-pion-editor.jpg`, `23-controle-pionnen.jpg`.

**9. Onderste balk op de printpagina neemt veel ruimte**
- Staand op de iPad is dat ongeveer een zesde van het scherm. De tekst "Voor de PDF's sturen we je editie en foto's naar onze server…" is lang en staat steeds in beeld. Voorstel: pas laten zien bij de eerste keer printen, daarna kleiner.
- Screenshot: `08-printpagina-klaar.jpg`.

## Ontwerp

- **Mooi**: het geheel is warm en duidelijk, goede grote knoppen en contrast, ook bij 125% tekst. De vakkenlijst met kleurblokjes, het vak-voorbeeld en de eigendomsbewijzen met foto en plaatsnaam zien er echt als een spel uit. Liggend (3 kolommen: lijst, voorbeeld, paneel) is de editor prettig en gebruikt de ruimte goed. `07-liggend-editor.jpg`
- **Mijn edities** met "Thuisprint-set klaar tot 29 nov" en Dupliceren is helder. `15-mijn-edities.jpg`
- **PDF's**: bord, kaarten en pionnen zien er verzorgd uit, met snijtekens en uitlijntest. Het eigendomsbewijs met foto en plaats is mooi. De achterkant (hypotheek) is rommeliger maar duidelijk. `17-pdf-bord-e1.jpg`, `18-pdf-kaarten-e1.jpg`, `19-pdf-bord-doos-e2.jpg`
- **Goedkoop of niet af**: de pion met een foto heeft de naam heel klein onder de foto geperst, de pion zonder foto toont de naam groot. Dat oogt ongelijk (`21-pdf-pion-geld-e3.jpg`). Op het speelgeld wordt de lange bankier ("Het spel van Overgrootvader Bert") klein en afgebroken in de zijbalk. Het doosdeksel van thema Strak is wit met één regel; mooi en strak, maar wel kaal (`19-pdf-bord-doos-e2.jpg`).
- De bovenste rij van het bord staat in de preview ondersteboven (hoort bij het spel), voor een beginner kan dat verontrusten. Een klein stukje uitleg ("Zo ligt het bord op tafel") helpt.

## Features die ik zou willen

- **Een kopieerwinkelpakket (must)**: één bestand of één pagina "Neem dit mee naar de winkel", met papiersoort, formaat, dubbelzijdig, de aantallen en een knop "Stuur deze lijst naar mijn e-mail" of "Print deze lijst". Bert gaat naar iemand die niets van het spel weet.
- **Mijn werk veilig bewaren zonder Google (must)**: een bestand "Bewaar mijn editie" dat hij op de iPad in Bestanden zet, en dat hij weer kan openen. Ik zou Bert geen Google-account laten maken.
- **Stap voor stap hulp voor beginners (must)**: een korte rondleiding bij de eerste editie: "1. Tik op een vak, 2. Typ de naam, 3. Voeg een foto toe, 4. Print". Nu moet hij zelf ontdekken dat het Vak-paneel naast de lijst staat.
- **Grotere tekst of een tekstgrootte-schakelaar in de site (nice)**: Bert zet de tekst groter via iPad-instellingen. Een knop "Grotere letters" op de site zelf is makkelijker te vinden.
- **Namen en plaatsen als lijst plakken (nice)**: Bert typt 27 namen. Een lijst waar hij ze achter elkaar kan typen (Enter naar volgende) scheelt veel tikken en fouten.
- **Foto's kiezen met een voorbeeld en een wisselknop (nice)**: bij "Andere foto" zou een lade met eerder gebruikte foto's helpen als dezelfde foto op meer plekken moet.
- **Een kinderversie met grotere letters (nice)**: voor de achterkleinkinderen een sjabloon met korte, simpele kaarten.

## Wat goed werkte

- Van sjabloon naar editor in 0,1 tot 0,3 seconden. Alles met één vinger.
- Alle namen en foto's komen in bord, eigendomsbewijzen en kaarten, en de plaatsnaam hoort bij de hele straatgroep (met de tekst "geldt voor alle 3 roze straten").
- HEIC-foto van 4032x3024: in 5 seconden klaar, geen gedoe. Piepkleine foto krijgt een eerlijke dpi-melding.
- Printen: 25 seconden per set, ook met 22 vellen SRA3 geld. Duidelijke status (Wacht, Klaar), print blijft na herladen bewaard, de link werkt, en PDF's en instructies per onderdeel zijn los te downloaden.
- Controle-melding voor pionnen zonder foto is concreet.
- Mijn edities toont wanneer de set klaar is en tot wanneer de bestanden bewaard blijven.
- Geen Nederlandse of Engelse tekst door elkaar, geen fouten in de console.
