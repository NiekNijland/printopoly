# Feedback ronde 3: student Daan, snel een spel voor het studentenhuis (telefoon 320x640 en 375x667)

Persona: Daan, 21, student in Groningen. Oude iPhone SE (320x640), soms 375x667. Wil zo snel mogelijk iets printbaars voor zijn huis: huisgenoten als straten, Groninger kroegen als stations. Slaat foto's over, houdt de standaardteksten, print zuinig thuis. Alles met één duim, zonder account.

Gemaakt:

1. **Huize De Kachel**. Sjabloon Vriendengroep, thema Riso (volgt het sjabloon), Nederlands, euro. Aangepast: 17 vakken. Twaalf straten hernoemd naar huisgenoten (Jesse, Lotte, Mo, Pien, Bram, Fenna, Tim, Sanne, Noah, Eva, Luuk, Roos, Sam), vier stations naar kroegen (Simplon, Mullit, Vera, De Drie Gezusters). Thuisprint-set gemaakt: bord (7 vel), kaarten (16 vel), pionnen (1 vel). Daarna Samen maken-link gemaakt en met een tweede profiel als huisgenoot gebruikt. Viewport 320x640.
2. **Vrijgezellen Joost**. Sjabloon Vrijgezellenfeest, niets aangepast behalve de naam. Thema Riso, Nederlands, euro. Van home tot gedownloade PDF's in 26 seconden scripttijd (een mens doet er naar schatting 2 tot 3 minuten over). Thuisprint-set met bord (7 vel), kaarten (7 vel), speelgeld (35 vel, 17 MB) en pionnen. Viewport 375x667.
3. **Flat 7**. Leeg sjabloon, Engels, thema Strak, munt M. Onderdelen: bord, eigendomsbewijzen, kaarten en huisregels. Veertien straten en vier stations hernoemd door steeds op "volgende" te tikken. Thuisprint-set: bord (7 vel), kaarten (16 vel). Viewport 375x667 voor het maken, 320x640 voor het printen.

Schermafbeeldingen staan in `docs/feedback/ronde-3/img/student-daan/`.

## Samenvatting

Een editie maken gaat echt snel. Kiezen, naam typen, klaar: onder de 4 seconden en de editor staat er. Het hernoemen van vakken met de pijl "volgende" onderin is goed met één duim te doen. Het mooiste vond ik dat de Kans-kaarten automatisch mijn nieuwe namen overnemen ("Ga naar Sanne"). Het grootste probleem voor mijn situatie is dat alles uitgaat van een bord dat je al hebt en van stickerpapier: een student met een gewone printer en zonder bord komt hier niet mee weg. Daarnaast klopt de tekst op de kaarten niet meer als je stations tot kroegen maakt ("Huur met 2 stations", "vervoersvak"), en staat er een lege huisregelskaart in de printset van editie 3. Op 320 breed past alles, maar de plakbalk onderin neemt op de printpagina een kwart tot een derde van het scherm.

## Werkt niet (bugs)

**1. Lege huisregelskaart in de printset (editie 3).** Waar: Onderdelen bij een nieuwe editie, daarna printset. Wat: ik vinkte "Huisregels" aan in een lege editie en schreef niets. De PDF bevat toch een kaart "House rules / Flat 7" met een leeg kader (`dl/e3pdf/cards.pdf`, laatste pagina). De Controle blijft op 0. Verwacht: een waarschuwing "Huisregels is leeg" of de kaart niet printen. Ernst: hinderlijk (papier en inkt weg, het lijkt een fout). Stappen: Leeg sjabloon, Onderdelen, Huisregels aanvinken, Editie maken, Thuisprint-set maken. Beeld: `img/student-daan/pdf-e3-strak.jpg` (rechts).

**2. Kaarttekst klopt niet meer na hernoemen: "De reünie is bij De reünie."** Waar: Kans-kaart in editie 1 (ook in de PDF, `cards.pdf`). Wat: de kaart noemt een vak met zijn eigen naam in de zin. Bij standaardnamen zoals "Het stadion" is het al een beetje stug, en bij een eigen naam leest het raar. Verwacht: een zin die ook werkt als het vak "De reünie" heet, of de kaart overslaan als vak en onderwerp samenvallen. Ernst: klein.

**3. Stations blijven "stations" en "vervoersvak" op de kaarten.** Waar: eigendomsbewijzen ("Huur met 1 station", "Huur met 2 stations" onder SIMPLON) en Kans-kaarten ("Ga naar het dichtstbijzijnde vervoersvak. Is er een eigenaar, dan betaal je dubbele huur."). Wat: ik maakte van de vier stations kroegen, maar de tekst blijft over stations en vervoer gaan. Ook "De nachtbus vertrekt bij Simplon" en "Je zingt te hard in de nachtbus" blijven staan (dat is template-tekst, dat mag, maar het past niet bij een kroegentocht). Verwacht: bij Editie, Woorden een veld voor het woord "station" en "nutsbedrijf", net als bij huis en hotel. Daar kan ik nu alleen huis en hotel veranderen. Ernst: hinderlijk als je een eigen thema maakt (dat is precies wat ik wilde). Beeld: `img/student-daan/51-woorden.jpg`, `img/student-daan/pdf-e1-kaarten-pionnen.jpg`.

**4. Dunne donkere streep langs de rechterrand van de editor op 320 en 375.** Waar: editorscherm (niet op de andere pagina's). Wat: een smalle donkere rand rechts, alsof er een paneel net buiten beeld valt. Pagina scrolt niet zijwaarts (scrollWidth 320), dus het is alleen een visuele rand. Ernst: klein. Beeld: `img/student-daan/04-editor.jpg`, `img/student-daan/47-editor-en.jpg`.

**5. Bord in de editor toont geen enkele naam.** Waar: tab Bord op 320. Wat: alle vakken zijn leeg met alleen kleurstrepen en bolletjes. Ook na "Vak kiezen" (inzoomen) staan er geen namen op, en de vakken zijn dan ongeveer 23 px breed, te klein voor een duim. Je kiest dus feitelijk altijd uit de lijst eronder. Verwacht: bij inzoomen namen op de vakken, of het bord weglaten als keuzemiddel op een kleine telefoon. Ernst: hinderlijk, niet blokkerend. Beeld: `img/student-daan/52-vakkiezen.jpg`.

**6. Console-fout bij het laden: `sessions.bugsnag.com ERR_CONNECTION_REFUSED`.** Waar: elke pagina. Dit komt waarschijnlijk van mijn headless omgeving, niet van de site. Ik meld het voor de volledigheid. Ernst: klein / waarschijnlijk geen bug.

## UX: wat kan beter

**Printpagina: wat is het verschil tussen Drukkerij en Thuisprint?** Waar: bovenaan de printpagina. De pagina opent altijd op "Drukkerij-set", ook als je daarvoor al Thuisprint gebruikte (de tab wordt niet onthouden). Er staat geen zin bij de tabs die uitlegt wat je betaalt of nodig hebt. Voorstel: onthoud de laatste tab per editie en zet één regel onder de tabs ("Drukkerij: je bestelt online. Thuis: je print zelf op A4.").

**Plakbalk op de printpagina is te groot op 320x640.** Waar: onderkant printpagina. Er staat een alinea privacytekst plus één knop, en na het maken staan er twee grote knoppen met een tweede alinea. Samen is het 25 tot 33 procent van het scherm. De onderdelenkaart, die ik wilde lezen, is dan een smalle strook. Voorstel: privacytekst naar boven of in de knop-tekst ("Thuisprint-set maken · PDF's blijven 7 dagen staan"), na het maken één knop ("Download alles (ZIP)").
Beeld: `img/student-daan/13-thuis-top.jpg`, `img/student-daan/e1-done.jpg`.

**Het bord gaat uit van een bord dat je al hebt, en van stickerpapier.** Waar: startpagina ("Het bord plak je als sticker op het bord dat je al hebt"), bord-onderdeel op de Thuisprint-tab ("Print op volle A4-stickervellen, mat") en de plakinstructie in de PDF. Een student heeft meestal geen oud bord en geen stickervellen. Voorstel: een derde route "Thuis op gewoon papier": print op 90 g, plak op een stuk karton (twee A3 of bordkarton) en een zin over hoe je de vouw in vieren maakt. Zet bovenaan de Thuisprint-tab een korte checklist ("Wat heb je nodig: stickerpapier, mes, liniaal, een bord").

**Totaal aantal vellen en inkt ontbreekt.** Waar: Thuisprint-tab. Per onderdeel staat "7 vellen", "35 vellen", maar nergens een totaal (hier 50) of een idee van inkt. Het speelgeld is 35 vellen in kleur, 17 MB. Voor een goedkope printer is dat veel. Voorstel: totaal onderaan ("In totaal 50 vel A4, waarvan 35 voor geld"), en een zuinige optie voor geld: "Alleen briefjes van 10, 50 en 100" of "Zwart-wit".

**Pionnen staan standaard aan in het Vriendengroep-sjabloon en geven een waarschuwing.** Waar: Controle: 1 in editie 1 ("8 pionnen hebben nog geen foto en worden lege staanders met alleen een naam"). Een lui gebruiker heeft geen foto's en print een vel met acht kale staanders ("Pion 1" ... "Pion 8"). Voorstel: pionnen niet standaard aan, of pas aanzetten zodra er minstens één foto is. De waarschuwing is overigens duidelijk en eerlijk.

**Teller "Bord 6/41", "Kaarten 0/35" leest als een voortgangsbalk.** Waar: tabs in de editor. Het is het aantal aangepaste vakken, maar 0/41 voelt als "nog niets af". Verwacht: een label als "6 aangepast". Dat de teller bij Kaarten op 0/35 blijft staan terwijl de kaarten wel de nieuwe namen overnemen, is ook verwarrend.

**Terug naar de lijst staat linksboven, niet bij de duim.** Waar: vak-editor. Onderin staan wel vorige/volgende, wat heel fijn is. Maar "terug naar alle vakken" is het pijltje linksboven, en dat is op een telefoon niet met één duim te halen. Voorstel: een "Alle vakken" knop in de onderbalk, of zet de lijst bij tikken op de titel.

**Controlebalk op 320 is krap.** Waar: onderbalk met "Controle: 1" en in de vak-editor "Controle: 1" tussen de pijlen. De tekst raakt de randen van de knop op 320 breed. Voorstel: korter ("1 ⚠") of de pijlen kleiner.

**Placeholder in het vriendenformulier is voor een dorp.** Waar: de Samen maken-pagina voor huisgenoten, veld "Naam voorstellen": "Een naam uit jullie dorp, bijvoorbeeld…". Afgekapt en past niet bij een studentenhuis. Voorstel: neutrale tekst ("Een idee voor een naam"), of de placeholder volgt het sjabloon.

**Munt "M" zonder uitleg.** Waar: Nieuwe editie, bij Engels: "Munt: M. Die volgt de taal." Wat M betekent (Monopoly-geld) staat nergens. Voorstel: "M (Monopoly-geld)".

**De onderdelenlijst noemt "Eigendomsbewijzen · nodig als je straatnamen verandert".** Dat is nuttig, maar zo'n student ziet Bord, Eigendomsbewijzen, Kans en Algemeen Fonds, Speelgeld, enz. en weet niet wat het minimum is. Voorstel: een duidelijke knop "Alleen het hoognodige" (bord + eigendomsbewijzen) naast "Alles".

**Beschrijving van de sjabloonkaartjes is afgekapt.** Waar: Nieuwe editie op 320. "Voor de groep die elke week hetzelfd…" en "Voor kerst, de vakantie en…" eindigen op puntjes. Het zijn de enige zin die je hebt om te kiezen. Voorstel: twee regels toestaan of de zinnen korter maken.

**Sjabloonkeuze: Vriendengroep past ook voor huisgenoten, maar het eerste scherm zegt dat niet.** Sjablonen als "Vriendengroep" en "Je dorp of wijk" lagen voor de hand. Een eigen kaart "Studentenhuis" zou beter zichtbaar zijn voor mijn doelgroep. Zie ook wensen.

## Ontwerp

Mooi: het kleurgebruik, de dikke contouren en de titelbalk op 320 zijn levendig en goed leesbaar. De kleurblokjes bovenaan elke pagina geven een eigen gezicht. Het Voorbeeld (preview) met de roze titellint ziet er echt als een spel uit. De print-PDF's zijn netjes: het bord in zeven A4's met snijtekens en een uitlijntest voor de dubbelzijdige kaarten, het speelgeld met guilloche-patroon is echt mooi. De Samen maken-pagina voor huisgenoten is vrolijk en duidelijk (genummerde stappen 1, 2, 3).

Minder: de lege vakken in de editor. Een bord zonder namen voelt als een leeg raster, terwijl het Voorbeeld heel mooi is. Op het printscherm is de bovenste helft (tabs, introductie) zo hoog dat je op 320x640 niet eens de eerste kaart volledig ziet. De Strak-PDF is zuinig met inkt (grijze vlakken, zwart lint), maar de kleurstreken bij de straten en de blauwe en roze iconen blijven helder gekleurd, dus echt zwart-wit is het niet. De kaarten hebben dunne tekst: bij 50 dpi is "Huur met 4 huizen" amper te lezen, op papier waarschijnlijk wel.

PDF's bekeken: `img/student-daan/pdf-e1-bord.jpg`, `img/student-daan/pdf-e1-bord-vakken.jpg`, `img/student-daan/pdf-e1-kaarten-pionnen.jpg`, `img/student-daan/pdf-e2-geld.jpg`, `img/student-daan/pdf-e3-strak.jpg`. Namen en bedragen staan er allemaal in; de Kans-kaarten pakken de nieuwe vaknamen op.

## Features die ik zou willen

1. **Studentenhuis-sjabloon met huisgenoten, kroegen en huisregels (must).** Straten zijn kamers of huisgenoten, stations zijn kroegen, nutsbedrijven zijn de wifi en de waterkoker, Kans-teksten gaan over afwas en schoonmaakrooster. Daan wil geen 28 vakken invullen.
2. **Veld voor de naam van stations en nutsbedrijven bij Woorden (must).** Zodat "Huur met 2 kroegen" kan, en "vervoersvak" op de Kans-kaarten verdwijnt. Past ook bij school (haltes) en bedrijf.
3. **Lijst plakken: namen in één keer invoeren (must).** Een veld waarin je 12 namen onder elkaar plakt (uit de groepsapp) en die worden de straten in volgorde. Nu is het per vak tikken, tikken, typen, volgende.
4. **Thuisprint op gewoon papier met plakinstructie op karton (must).** Zie UX. Voor wie geen stickerpapier of bord heeft.
5. **Zuinige print-optie voor speelgeld en kaarten (nice).** Alleen de grote briefjes, of zwart-wit, of kleinere set (bijvoorbeeld 20 vel in plaats van 35).
6. **Eén knop "Snelle set" voor het echt luie pad (nice).** Kies sjabloon, geef naam, download alles voor thuis. Zonder tab-keuze en zonder onderdelen.
7. **Totaal vellen en geschatte inkt op de printpagina (nice).**
8. **Huisgenoten laten hun eigen straat claimen via de Samen maken-link (nice).** Nu kunnen ze een idee voor een naam sturen op een vak dat ik kies. Beter: "Ik ben Lotte, ik neem vak 'Het oude studentenhuis'". Dat spaart mij het invullen.
9. **Delen als afbeelding van het voorbeeld met één tik (nice).** Voor de groepsapp: "dit is onze editie". Het "Plaatje voor de groepsapp" bestaat al bij Samen maken, maar ik vond het pas na doorzoeken.

## Wat goed werkte

- Editie aanmaken: onder 4 seconden van "Editie maken" tot de editor, op 320 en 375.
- Sjabloon kiezen op een kleine telefoon: grote kaarten, twee naast elkaar, rode rand voor je keuze, "Bekijk dit sjabloon" bij elk.
- Vak voor vak hernoemen met volgende/vorige onderin: snel en duimvriendelijk. Hernoemen en doorgaan kostte ongeveer 2 seconden per vak met de keyboard open.
- De Kans-kaarten nemen hernoemde vakken over ("Loop naar Sanne").
- Thuisprint-set: 15 seconden wachten op drie PDF's, duidelijke statussen, ZIP-knop, en de melding "Je kunt deze pagina sluiten. De bestanden staan 7 dagen klaar."
- "Mijn edities" toont "Thuisprint-set klaar tot 28 nov", en de kaartjes met knoppen Openen en Printen zijn groot genoeg.
- Samen maken werkt zonder account, de huisgenoot-pagina is duidelijk, en het voorstel kwam binnen met melding "Wacht op jou (1)" en "1 nieuw".
- Controle-melding over pionnen zonder foto is eerlijk en begrijpelijk.
- Geen horizontaal scrollen op 320 en geen layoutbreuken.
