# Feedback ronde 5: hardloopclub-trainer en snelle gebruiker (desktop 1920 × 1080 en venster van 1024 × 768)

Persona: Lukas, 34, Duitser in Amsterdam. Hij runt een hardloopclub en werkt het liefst met het toetsenbord. Hij plakt lijsten in één keer, leest "Nog even nakijken" (Engels: "Check before you print") regel voor regel en laat zijn set bij een drukkerij maken. Hij gebruikt de Engelse site (`/en`).

Gemaakt:

- **Vondelpark Runners**: sjabloon Groep, Classic, Engels, euro. 22 straatnamen in één keer geplakt. Stations en nutsbedrijven hernoemd (Tram 2 Stop, Water Station). Woorden aangepast: tram stop, refreshment point, the physio, Pace Card, Club Chest, Club Treasury. Clublogo in het midden (Logo), vier kaartteksten en vijf pionnamen aangepast. Geprint: Drukkerij-set, 2 sets, met bord, kaarten, speelgeld (aanbevolen, volledige bank), deksel en spelregelboekje.
- **ACME Team Day 2026**: sjabloon Vrienden, Riso, Engels, euro. Gemaakt in een venster van 1024 px breed. 10 namen geplakt (met Windows-regeleinden). Een te kleine foto op één straat, "Naam met foto" in het midden, een foto op het deksel en een ingevulde uitnodiging. Geprint: Thuisprint-set met bord, kaarten, pionnen en uitnodiging.
- **Opa Heinz Board 1985**: leeg, Strak (Sleek), Engels, eigen munt "Deutsche Mark" met teken DM, eigen bordmaat (A 480, B 64, C 4 mm). Geprint: testvel en Thuisprint-set met bord en kaarten.

## Samenvatting

Het ging snel. Van leeg naar drie geprinte sets kostte weinig tijd, en de PDF's kwamen in ongeveer 20 seconden binnen, ook voor twee drukkerij-sets met speelgeld. Het mooiste vond ik het bestelblad in de ZIP: dat kan ik zo aan de drukkerij geven. De sneltoetsen (1 tot 4, J/K, V, E, C, ⌘P en het overzicht onder ?) werken goed, en "Change" bij Nog even nakijken brengt me precies naar het juiste veld. Grootste probleem: het zoekveld zegt "Find a space or paste names", maar als je daar een lijst plakt, gebeurt er niets bruikbaars. Plakken werkt alleen in een naamrij. Verder geeft het Vrienden-sjabloon zelf twee onterechte waarschuwingen, en heet hetzelfde onderdeel op drie plekken anders (Pawns, Tokens, Proof sheet tegenover test sheet).

## Werkt niet (bugs)

1. **Plakken in het zoekveld doet niets, terwijl het veld daarom vraagt.** Waar: editor, lijst links, veld "Find a space or paste names". Wat gebeurde: ik plakte 22 namen. Chrome maakt er één regel van en de lijst zegt "Nothing found for "Vondelpark Loop Blauwbrug Bridge …"". Verwacht: dat de namen over de straten verdeeld worden, of een tekst die zegt waar je moet plakken. Plakken in de rij van de eerste straat werkt wel, en goed ("22 names filled in. 11 spaces of another kind were skipped."). Ernst: hinderlijk, want het is precies wat een snelle gebruiker eerst probeert. Stappen: editor openen, klik in het zoekveld, plak een lijst met meerdere regels. Screenshot: `img/club-lukas/d02-paste-in-search.jpg`, en ter vergelijking `img/club-lukas/d03-paste-in-row.jpg`.

2. **Het Vrienden-sjabloon geeft zelf twee waarschuwingen.** Waar: printpagina, Check before you print. Wat gebeurde: Chance 15 ("An old friend pays back what he owes, with interest.") en Community Chest 10 ("… everyone pays you back.") krijgen "The text says pay, but the bottom of the card says Collect". Ik had die kaarten niet aangeraakt. Verwacht: geen melding. "pays back" betekent dat je geld krijgt. Ernst: hinderlijk. Zo leer je mensen de meldingen te negeren. Stappen: nieuwe editie op Friends, Engels, naar Print. Screenshot: `img/club-lukas/t05-check-1024.jpg`.

3. **Testvel negeert de eigen munt.** Waar: testvel (calibration-PDF) van Opa Heinz Board 1985. Wat gebeurde: op het bord staat "DM 60", maar op het testvel staan "£60" en "Collect £200". Verwacht: DM, zoals op het bord. In `calibration-art.tsx` gaat alleen `resolved.currency.id` mee, en bij een eigen munt is dat "custom". Ernst: klein, het vel is alleen om te meten. Screenshot: `img/club-lukas/pdf-e3-testsheet.jpg`.

4. **Komma als decimaalteken op de Engelse site.** Waar: Edition, Board size, en het testvel. "A regular space is 38,22 mm wide", "leave 11,11 mm per space", "Regular space 38,22 × 64 mm". Verwacht in het Engels: 38.22. Ernst: klein. Screenshot: `img/club-lukas/v02-size-480.jpg`.

5. **Een ongeldige bordmaat geeft een kapot bord.** Waar: Board size, B (corner space) op 200 gezet. De foutmelding is goed, maar alle drie de velden worden rood. Het bord in het midden tekent piepkleine hoeken en een brede witte rand. Verwacht: alleen B rood, en het bord blijft op de laatste geldige maat staan. Ernst: klein. Screenshot: `img/club-lukas/v01-bad-size.jpg`.

6. **"Village or neighbourhood" loopt buiten zijn kader.** Waar: home, "Start from…" op 1920 px ("neighbourhoo" wordt afgekapt), en de sjabloonkaart op `/en/editions/new` op 1024 px ("neighbourhood" steekt over de rand). Ernst: klein, maar je ziet het meteen. Screenshots: `img/club-lukas/01-home-chip-village.jpg`, `img/club-lukas/q01-new-1024.jpg`.

7. **"Make it together" staat er nog.** Volgens de afspraak voor deze ronde is Samen maken bevroren. Toch staat het in het namenmenu ("Make it together, Friends send names and photos") en als eigen sectie in het editiepaneel, met een rode knop "Make a link". Ik heb niet geklikt. Ernst: hinderlijk als de functie echt bevroren is, want de knop lijkt gewoon te werken. Screenshots: `img/club-lukas/w01-namemenu.jpg`, `img/club-lukas/v02-size-480.jpg` (onderaan).

8. **Verkeerde chip actief in het editiepaneel.** Waar: Edition, klik op "Board size". De sectie springt in beeld, maar de chip "Make it together" wordt donker. Ernst: klein. Screenshot: `img/club-lukas/v02-size-480.jpg`.

9. **"1 changed" bij Opa Heinz Board.** Waar: My editions. Thema, munt en bordmaat zijn veranderd, toch staat er "1 changed". Edition-instellingen tellen niet mee. Ernst: klein. Screenshot: `img/club-lukas/y01-myeditions.jpg`.

## UX: wat kan beter

1. **Eén naam voor één onderdeel.** In de editor heet het "Pawns · 8 of 8", op de printpagina "Tokens", in de printgids en in de PDF weer "Pawns". De printpagina zegt "test sheet", de printgids "Proof sheet". Ik zocht in de gids naar "test sheet" en vond het niet. Voorstel: overal Pawns en Test sheet, of overal de andere.

2. **Plakken moet je ontdekken.** Behalve bug 1: de hint staat in het zoekveld, maar plakken werkt in een rij. Voorstel: laat plakken in het zoekveld de namen verdelen vanaf de eerste straat. Of maak de hint "Paste a list into the first name to fill them all".

3. **Munt vergeet ik elke keer.** Bij elke nieuwe Engelse editie staat de munt weer op £. Ik woon in Nederland en wil euro. Ook bij ronde 4 genoemd (Carlos, UX 6). Voorstel: de laatst gekozen munt onthouden.

4. **Hoeveel geld past niet bij het aantal pionnen.** Thuisprint zegt "Recommended: 2 to 4 players", terwijl mijn editie 8 pionnen heeft. Ook ronde 4 (Ria, UX 3). Voorstel: de aanbeveling uit het aantal pionnen halen, of een regel bij Nog even nakijken.

5. **Twee meldingen voor één foto.** De te kleine foto staat twee keer in Check before you print: bij het vak en bij "Title deed: The Coffee Corner". Ook ronde 4 (UX 2). De tekst zelf is nu wel duidelijk ("too small and will look grainy on paper"). Voorstel: één melding met "also on the title deed".

6. **Deksel thuis op A3.** In de Thuisprint-set staat het deksel nog als "1 sheet A3", ook bij mijn eigen bordmaat. Op kantoor hebben we geen A3. Ook ronde 4 (Fatima, UX 3). Voorstel: zeg "A3 needed" duidelijk in de rij, of bied twee A4's aan.

7. **Bij 1024 px is het voorbeeld klein.** Het canvas in het midden is daar zo'n 250 px breed. Het midden van het bord en het deksel worden een postzegel (`img/club-lukas/r03-centre.jpg`, `img/club-lukas/s03-lid.jpg`). De keuzeknoppen "Name / Name with photo / Photo over the whole centre / Logo" zijn ongelijk breed: "Name with photo" breekt over drie regels en "Logo" zit tegen de rand geplakt. Voorstel: op die breedte het canvas groter maken ten koste van de lijst links, en de vier keuzes in twee rijen.

8. **Bordmaat A, B, C zonder plaatje.** In het editiepaneel staan alleen de letters. De printgids legt het uit, maar daar moet je zelf naartoe. Voorstel: een kleine schets naast de drie velden.

9. **Logo niet op het deksel.** De uitleg zegt "With a logo there is no name in the centre. The name stays on the box lid." Het deksel toont alleen de naam en een piepkleine ondertitel. Voor een club wil ik daar het logo. Voorstel: bij Box lid een keuze "Use the logo from the board".

10. **Na Enter in een naamveld werken de sneltoetsen niet.** Enter springt naar de volgende rij, dus de focus blijft in een veld en 1 tot 4 of J doen niets. Esc werkt wel. In het sneltoetsenvenster staat "Enter in a one-line field, to go back to the board". Dat klopt niet voor de lijst. Voorstel: de tekst aanpassen ("Esc goes back to the board").

11. **Sneltoetsen zijn goed verstopt.** Ze staan in het namenmenu en onder ?, en als title op knoppen. Voor een eerste bezoek zie je ze niet. Een kleine "?"-knop bij Undo/Redo zou genoeg zijn.

12. **Standaard ingevinkt verschilt per editie.** Bij Vondelpark Runners stonden speelgeld, pionnen en deksel aan. Bij ACME Team Day en Opa Heinz Board stonden speelgeld en deksel uit. Ik weet niet waarom. Als dat van het sjabloon komt, zeg het dan.

## Ontwerp

- De printpagina is rustig en duidelijk: grote knop onderaan, per onderdeel een plaatje, status (NOT MADE YET, READY) en "How it works". Het gele blok "Check before you print" valt goed op en de knop Change werkt (`img/club-lukas/n01-print.jpg`, `img/club-lukas/o01-printshop.jpg`).
- Het editiepaneel met chips (General, Look, Words, Board size) is netjes. De thema-plaatjes tonen wel de standaardstraten (Mill Lane), niet mijn eigen namen.
- PDF's: bord, kaarten en eigendomsbewijzen zien er goed uit. Mijn woorden staan overal goed: "tram stop", "the physio", "Pace Card", "Club Treasury" op de biljetten (`img/club-lukas/pdf-e1-board.jpg`, `img/club-lukas/pdf-e1-deeds.jpg`, `img/club-lukas/pdf-e1-cards-lid.jpg`).
- Het spelregelboekje ziet er af uit. Kleine dingen: "Pick a banker. The banker looks after the money" volgt mijn banknaam niet, en het noemt "32 houses and 12 hotels, 2 dice" in de doos, ook al print ik die niet (`img/club-lukas/pdf-e1-booklet.jpg`).
- Het deksel is kaal: naam, een ondertitel van een paar millimeter en vier icoontjes. Naast de rest van de set voelt het goedkoop.
- De achterkant van de huisregelkaart (laatste pagina van de kaarten-PDF) is helemaal leeg.
- Speelgeld voor 2 drukkerij-sets: 5,2 MB. Dat is veel minder dan de 25 MB uit ronde 4 (bug 3), mooi.
- De uitnodiging is leuk: mijn eigen regels staan erop, vier per A4, plus een PNG voor de groepsapp (`img/club-lukas/pdf-e2-invitation-tokens.jpg`).

## Features die ik zou willen

1. **Plakken in het zoekveld verdeelt de namen** (must). Zie bug 1. Daar plak ik eerst.
2. **Laatst gekozen munt onthouden** (must). Ik maak edities voor een Nederlandse club in het Engels.
3. **Logo ook op het deksel en op de achterkant van de kaarten** (nice). Een clubeditie hoort er als clubspul uit te zien.
4. **Pionnen in één keer benoemen door een lijst te plakken** (nice). Bij straten kan het al, bij pionnen niet. Ik heb 22 leden en wil 8 namen in één keer erin.
5. **Een tabel met prijzen en huren per kleurgroep** (nice, ook al genoemd in ronde 4 door Lars). Ik heb dit keer geen bedragen aangepast, omdat 22 vakken openen te veel werk is.
6. **Een "?"-knop voor de sneltoetsen in de bovenbalk** (nice).

## Wat goed werkte

- Plakken in een naamrij: 22 namen in één keer. Andere vakken worden netjes overgeslagen, ook met Windows-regeleinden en een lege laatste regel.
- Sneltoetsen 1 tot 4, J/K, V, E, C, ⌘P. Het overzicht onder ? is compleet.
- Check before you print staat bovenaan de printpagina, en Change opent de editor met de focus in het juiste veld.
- Waarschuwingen bij kaarten zijn duidelijk ("The text says 40, but the bottom of the card says €100. This card's amount can be 80 to 120.").
- Een bedrag buiten de grens wordt rechtgezet met uitleg ("At most 60. The amount is now 60.").
- Eigen munt leeg laten geeft nu een melding bij het veld ("Until then the currency stays £ pound"). Bug 35 van Hans uit ronde 4 is opgelost.
- Het bestelblad in de ZIP, met kleur, afloop, hoekradius en de opmerking dat het speelgeld geen TrimBox heeft. Precies wat Willem in ronde 4 miste.
- Bestandsnamen met de editienaam (`vondelpark-runners-01-board.pdf`).
- De printpagina onthoudt per editie de gekozen set, en My editions toont "Print-shop set ready until 29 Nov".
- Printen was snel: ongeveer 20 seconden voor 2 drukkerij-sets.
