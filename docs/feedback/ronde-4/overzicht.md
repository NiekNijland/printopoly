# Testronde 4: overzicht

Stand: 22 november 2026, release 09ce9c0 (dat is ook main). Twaalf testers, elk met een eigen persona en drie edities (Sophie vier). Bronnen: de twaalf verslagen in deze map, het overzicht van ronde 3 en de code op main. Bij elk punt dat naar een bestaande functie wijst, staat erbij dat de functie er al is.

Alle testers stuurden de site met een script (headless Chrome of puppeteer). Punten die duidelijk door het script kwamen, staan niet in dit overzicht. Punten die alleen met een script gezien zijn en nog met de hand bevestigd moeten worden, hebben de aantekening "met de hand nakijken".

Niemand kon Samen maken testen. Elke "Maak een link" gaf een 429: de twaalf testers deelden één IP-adres, en zonder account mag een adres 10 links per dag maken (`printopoly.boxes.per_ip_per_day`). De echte bevinding is de melding (bug 6). Vriendenpagina, voorstellen en het plaatje voor de groepsapp zijn in deze ronde dus niet beoordeeld.

Er wordt al een hotfix gebouwd voor vijf bugs. Die staan in de tabel met "in hotfix".

## 1. Wat er getest is

| Tester | Persona | Apparaat | Taal (site / edities) | Edities | Sets gemaakt |
| --- | --- | --- | --- | --- | --- |
| Willem (`drukker-willem`) | drukker, 55, beoordeelt klantbestanden | desktop 1920 × 1200 | NL / NL, NL, EN | Dorp Klassiek (logo in het midden), Riso Bedrijfsspel (alle onderdelen), Harbour Town (Strak, pond) | 4: drie Drukkerij, één Thuisprint |
| Carlos (`expat-carlos`) | Spaanse expat, 35, Spaanse teksten | laptop 1366 × 768 | EN / EN, EN, NL | Utrecht para los amigos (Strak, euro, Spaanse woorden), Sevilla mi ciudad (Riso), Familie De Vries | 3: Drukkerij, Thuisprint, Drukkerij |
| Durk (`fries-durk`) | boer, 47, traag mobiel netwerk | Android 360 × 740, 400 kbit/s, trage CPU | NL / NL | Wergea en omkriten, Pleats Hiemstra (eigen munt fd), IJsklub De Swalkers (logo) | 3: Thuisprint |
| Kim (`kim-donker`) | developer, 29, migraine: donkere modus, minder beweging, hoog contrast, toetsenbord | desktop 1920 × 1080 | EN / EN | Raid Night Estate, Utrecht Rondje, Dev Team Tycoon (logo, alle onderdelen) | 5: vier Drukkerij, één Thuisprint |
| Mila (`mila-en-mama`) | meisje van 11 met haar moeder, eigen tekeningen | Android-tablet 800 × 1280, aanraken | NL / NL | Mila wordt 12! (alles aan), Dierenstad van Mila, Groep 7 de Beste (eigen munt kn) | 3: Thuisprint (de laatste alleen kaarten en pionnen) |
| Ria (`oma-ria-terug`) | oma, 71, terug uit ronde 3 | desktop 1440 × 900 | NL / NL | Kerst bij Oma Ria 2026 (5 pionnen met foto), Ons dorp Lutten, Buurvrouw Corry wordt 80 | 4: Thuisprint |
| Bert (`opa-bert`) | opa, 78, eerste keer online, tekst op 125% | iPad 820 × 1180 staand en liggend | NL / NL | Kralingen vroeger, Vissersclub De Snoek, Het spel van Overgrootvader Bert | 3: Thuisprint, Drukkerij, Thuisprint |
| Fatima (`scouting-fatima`) | scoutingleidster, 26, alleen telefoon | iPhone 393 × 852 | NL / NL | Scouting De Zonnestraal (logo, eigen woorden), Kampweek Ameland, Leiding in de Knoop (eigen munt) | 2: Thuisprint, Drukkerij |
| Hans (`secretaris-hans`) | secretaris, 64, legt alles naast elkaar | desktop 1600 × 900 | NL / NL | Dorpsfeest Sint-Joris (10 sets), Zangkoor Cantate (eigen munt ƒ, volledige bank), Jeugdhuis De Schuur | 3: Drukkerij, Drukkerij, Thuisprint |
| Lars (`spelontwerper-lars`) | hobby-spelontwerper, 39 | desktop 2560 × 1440 | NL / NL, EN, NL | Zeven Zeeën (bordmaat 520, 32 + 32 kaarten, alle bedragen aangepast), Dungeon Deals, Spoorbaron (bordmaat 400) | 2: Drukkerij, losse onderdelen |
| Joost (`vader-joost-terug`) | vader, 42, terug uit ronde 3 | Android 360 × 780 | NL / NL | SV Heusden Zaterdag 1 (Club of vereniging), Dorpsspel Maasdorp (8 foto's tegelijk), Lotte wordt 8 (logo) | 3: Thuisprint |
| Sophie (`weddingplanner-sophie`) | weddingplanner, 31, cadeau voor bruidsparen | iPhone 430 × 932 en MacBook 1512 × 982 | NL / NL | Basis Bruiloft Sophie en drie kopieën (Eva & Tim, Noor & Daan, Lotte & Sam) | 3: Drukkerij |

Totaal: 12 testers, 37 edities, 38 gemaakte sets (17 Drukkerij-sets, 20 Thuisprint-sets, één run met losse onderdelen). Zes testers op desktop of laptop, twee op een tablet, drie op een telefoon, en Sophie op telefoon en laptop. Twee testers gebruikten de Engelse site, vier maakten minstens één Engelse editie. Alle drie de thema's zijn gebruikt, en alle sjablonen behalve Vrijgezellen. Nieuw in deze ronde: een traag netwerk, hoog contrast, donkere modus en een vakdrukker. Niet getest: Samen maken, een echte schermlezer, een echte printer of drukkerij.

Printtijd: 8 seconden tot een paar minuten per set. Uitschieters: Hans met 10 sets en de volledige bank (ongeveer 7 minuten) en Durk, bij wie alleen het uploaden van de foto's al 142 seconden duurde.

## 2. Bugs

Gesorteerd op ernst en daarbinnen op het aantal testers. "R3-n" betekent: bug n uit ronde 3, nog (deels) open. Echte regressies, dingen die in ronde 3 werkten en nu stuk zijn, zijn niet gevonden.

Weggelaten als script-artefact: de naam "X" op Neude (Kim), "Het ClubhuisHet Clubhuis" (Joost), het vinkje dat niet reageerde (Fatima), de klik op munt M (Carlos), "Geen" bij een station (Ria) en de wijziging die verloren ging toen de hele browser na 0,4 seconde dichtging (Durk).

| Nr | Bug | Waar | Ernst | Testers | Oorzaak | Voorstel fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Twee aangepaste straten uit verschillende kleurgroepen wisselen: de bedragen reizen mee, Controle geeft 9 fouten en na herladen gaat de editie niet meer open | Bord, menu ⋯, Wisselen met… | blokkerend | Lars | | in hotfix (wisselen plus herstel bij openen) |
| 2 | Eigendomsbewijzen en spelregelboekje in de PDF tonen standaardhuren, -prijzen, salaris en belasting in plaats van de eigen bedragen | kaarten-PDF, boekje | blokkerend | Lars | | in hotfix |
| 3 | Speelgeld-PDF is zwaar: 25 MB bij de drukkerij (ZIP ook 25 MB), 12 MB thuis. Een webformulier met 20 MB-limiet loopt vast | speelgeld | hinderlijk | Willem, Mila, Ria | Volgens Willem 0 afbeeldingen en ruim 1 MB vectorpaden per vel: het guilloche-patroon staat per biljet als paden | Patroon één keer als afbeelding of herbruikbare vorm; doel onder 10 MB |
| 4 | Naam, foto of logo in het midden ligt op de vouwlijnen of op de kaartvakken; gezichten en lint worden doorgesneden, Controle zegt "0" | Midden van het bord, bord-PDF | hinderlijk | Sophie, Mila, Fatima | Geen Controle-regel voor de vouw; de standaardplek van "Naam met foto" raakt de stapel Algemeen Fonds | Zie UX 1 en vraag 6 |
| 5 | Kaarttekst met een chip (Start, €) blijft na alles selecteren en wissen half staan; het restant kwam in de PDF | Kaarten, tekst | hinderlijk (met de hand nakijken) | Mila, Bert | Niet nagekeken | Met de hand nadoen op tablet en desktop, test op selecteren en wissen over chips heen |
| 6 | Samen maken: bij een 429 staat alleen "Dat lukte niet. Probeer het nog eens.", onder de vouw. Opnieuw proberen helpt niet | Editie, Samen maken | hinderlijk | Fatima, Sophie | Server stuurt `boxes.too_many_boxes`, maar `together-section.tsx` toont altijd `collect.action_failed` | De servermelding tonen, bij de knop: "Vandaag zijn er vanaf dit netwerk te veel links gemaakt. Probeer het morgen, of log in." |
| 7 | Meerdere foto's tegelijk overschrijven foto's die al op een vak stonden, en vallen ook op hoeken (kerk op "Gevangenis (op bezoek)"). De lijst "foto → vak" staat buiten beeld | vak, Afbeelding | hinderlijk | Ria, Joost | `use-photo-upload.ts` kiest de volgende vakken die een foto kunnen hebben, ook als er al een foto op staat; de lijst staat bovenaan het paneel | Alleen lege vakken van dezelfde soort vullen, hoeken overslaan; de lijst in beeld zetten met per regel een keuzelijst (zie UX 4) |
| 8 | Printpagina na het maken is breder dan de telefoon: "Drukkerij-set downloaden (ZIP)" loopt over de rand, pagina 427 of 443 px breed | printpagina, 393 en 430 px | hinderlijk | Fatima, Sophie | Lange knoptekst in de vaste balk | Kortere tekst ("Alles als ZIP") of knoppen onder elkaar |
| 9 | Kaartbedrag spreekt de tekst tegen zonder getal: "Betaal een snoepje" boven "Ontvang € 40" | kaarten | hinderlijk | Mila | R3-8 half: `text.amount-differs` kijkt alleen naar getallen | Controle ook op betalen tegenover ontvangen in de tekst |
| 10 | Na printen van een Nederlandse editie springt de url naar `/nl`, de knop NL wordt actief, maar de pagina blijft Engels tot herladen | printpagina | hinderlijk | Carlos | De url na het maken komt uit `$job->locale`, de taal van de editie | De taal van de site in de url houden |
| 11 | Foto's uploaden bij printen: minuten op "0 van 2" zonder voortgang, en die regel staat 1400 px onder de knop "Bezig…" | printpagina, traag netwerk | hinderlijk | Durk | De browser stuurt de originele foto's in porties van 10; de teller telt per portie | Foto's vóór uploaden verkleinen tot de printmaat, voortgang per foto in de vaste balk |
| 12 | Verbinding weg: bij Maken een algemene fout zonder herstel, tijdens het maken 20 seconden stilte | printpagina | hinderlijk | Durk | | "Geen verbinding" met Opnieuw proberen, vanzelf opnieuw zodra het netwerk terug is, een regel in de balk tijdens wachten |
| 13 | Hoog contrast: de gekozen tab, schakelaar (Bord / Kaarten / Doos, Drukkerij / Thuisprint, NL / EN) is niet te zien | editor, printpagina, kop | hinderlijk | Kim | De keuze is alleen een vulkleur of rode rand; `forced-colors` haalt die weg | Gekozen stand ook met een dikke onderrand, en regels voor `forced-colors` |
| 14 | Hoog contrast: minibord en Voorbeeld verliezen de groepskleuren, iconen staan zwart op zwart | minibord, Voorbeeld | hinderlijk | Kim | Geen `forced-color-adjust: none` op het bord | Bord en kleurblokken uitzonderen |
| 15 | Enter in "Zoek een vak" opent niets; Enter in een naamveld bij een zoekopdracht zet de focus op `body` | lijst links | hinderlijk | Kim | B165 belooft dat Enter de eerste treffer opent | Zoals B165, en focus op de rij houden |
| 16 | Vergroot bord is groter dan het venster en schuift zonder enige aanwijzing; staand vallen de zijkanten weg, liggend de bovenste rij | Bord vergroten, iPad | hinderlijk | Bert | B166 laat het bord scrollen op de telefoon; op een tablet met 125% tekst gebeurt dat ook | Op tablet passend schalen; anders een schaduw of hint aan de rand |
| 17 | Extra kaart met `{amount}`: "Betaal 50" zonder munt en zonder bedragbalk | extra kaarten, editor en PDF | hinderlijk | Lars | | in hotfix |
| 18 | Thuisinstructies van pionnen en doosdeksel verwijzen naar "zoals hierboven", maar daarboven staat niets | instructie-PDF's thuis | hinderlijk | Hans | `instructies/pionnen.md` en `doosdeksel.md` delen stappen met het drukkerijdeel, dat thuis wegvalt | Stappen in elk deel uitschrijven |
| 19 | Prijslijst in het boekje kapt straatnamen af ("De burgemeesterswoni…") | spelregelboekje | hinderlijk | Hans | Geen tekstpassing in de prijslijst | Krimpen of twee regels |
| 20 | Instructie noemt het boekje "154 × 216 mm", dat is de maat met afloop. Eindmaat is A5 | instructie spelregelboekje | hinderlijk | Willem | Tekst in `instructies/spelregelboekje.md` | Zelfde zin als bij het bord: eindmaat, maat met afloop, paginamaat |
| 21 | "het dichtstbijzijnde kampvuurplek": lidwoord klopt niet bij een hernoemd woord | kaarten | klein | Fatima, Lars | | in hotfix |
| 22 | Knop "Standaard" loopt buiten het paneel (Eigen munt, Nutsbedrijven) | Editie, Algemeen en Woorden | klein | Hans, Lars | | in hotfix |
| 23 | Lange namen in de lijst afgekapt zonder puntjes | lijst links | klein | Mila, Bert | R3-24 deels: kop en minibord zijn opgelost, de lijst niet | Puntjes of twee regels |
| 24 | Kaarttegels breken woorden midden in ("voorzitte r"), de stip ligt over de tekst | tab Kaarten, 800 en 820 px | klein | Mila, Bert | Te smalle kolommen | Drie kolommen op tablet, `hyphens: auto` |
| 25 | Voorbeeld bij "Eigen regels" van het deksel zegt altijd "Kerst 2026, voor de hele familie", ook bij koor of bruiloft | Doosdeksel | klein | Hans, Sophie | `editor.lid_lines_placeholder` | Neutraal voorbeeld, of per sjabloon |
| 26 | "32 huisjes en 12 hotels" volgt de eigen woorden niet | Onderdelen, printpagina | klein | Hans, Lars | Vaste tekst `edition.part_note.foldModels` | Woorden uit `resolved.words` |
| 27 | Aantal pionnen op 4 terwijl Pion 8 open staat: de set wordt Pion 1, 2, 3 en 8, ook in de PDF | Doos, Aantal pionnen | klein | Ria | `pawnCountChanges` houdt de pion op het scherm (`keep`) | De laatste weghalen, of de pionnen in de PDF doornummeren |
| 28 | Rij "Midden van het bord" valt half onder het zoekveld | lijst links | klein | Ria | | Ruimte onder het vaste zoekveld |
| 29 | Knop Inklappen ligt over de hulptekst van het voorbeeld | editor, tablet | klein | Mila | | Knop naast de tekst |
| 30 | Esc in Voorbeeld zet de focus op `body` (menu ⋯ en Controle doen het wel goed) | editor | klein | Kim | R3-16 deels | Focus terug op de knop Voorbeeld |
| 31 | Contrast: rode stapnummers op de landing 4,18 : 1, uitgeschakelde ZIP-knop en "Pawn" op de pion 3,23 : 1 | landing, printpagina, pionnen | klein | Kim | Nog open uit ronde 3 (UX 8) | Donkerder rood, uitgeschakeld niet via 50% doorzichtig |
| 32 | Groepskleurveld toont #955436 (bruin van Klassiek) bij een paarse Riso-groep; in Strak passen de swatches niet bij het bord | straat, Stijl | klein | Lars | De naam volgt het thema (B171), het kleurveld niet | Kleur die het bord echt gebruikt |
| 33 | Huisregel van Je dorp of wijk: "dan krijg je 10" zonder munt | huisregels | klein | Hans | R3-26 deels | `{currency}` in de sjabloontekst |
| 34 | Boekje noemt speelgeld in de doos terwijl Speelgeld uit staat; aantekeningenblad heeft Speler 1 tot 10 bij 2 tot 8 spelers | spelregelboekje | klein | Hans | | Zin afhankelijk van het onderdeel; 8 rijen |
| 35 | Eigen munt kiezen en niets invullen valt stil terug op euro | Editie, Munt | klein | Hans | | Melding bij het veld |
| 36 | Kopie van een kopie heet "(kopie) (kopie) (kopie)" | Mijn edities | klein | Sophie | | "(kopie 2)" |
| 37 | Lint op het kleine bord breekt op twee regels, Voorbeeld en PDF op één | editor | klein | Sophie | | Zelfde tekstpassing |
| 38 | Engelse hint "Pay M50" bij elke munt; knop "Board green" ook bij Strak, waar het bord wit is | editor, Engels | klein | Carlos | Vaste teksten in `en.json` | Munt invullen; "Board colour" |
| 39 | Engelse printgids zegt "Go" waar het bord "Start" zegt, en belooft de gids in elke ZIP | printgids | klein | Carlos | | Tekst aanpassen |
| 40 | Kaart-TrimBox is 63,11 × 87,84 mm in plaats van 63 × 88 | kaarten-PDF | klein | Willem | Chrome rondt de paginamaat af op hele pixels | Pagina in pt opgeven, of de TrimBox exact zetten |
| 41 | Speelgeld, pionnen, huisjes en dobbelstenen hebben geen TrimBox; preflight van de drukker waarschuwt | drukkerij-PDF's | klein | Willem | Bewust (B163): geen afloop | Een zin in de instructie, of een TrimBox om het snijkader |
| 42 | Enter in het naamveld gaat naar het volgende vak; een foto daarna kwam op het verkeerde vak | lijst links | klein | Willem | Zo bedoeld (B165) | Paneelkop duidelijk laten verspringen; zie de vraag bij foto's in UX 4 |
| 43 | F2 op een vak zonder naam doet niets, daarna vuren letters als sneltoets | editor | klein | Kim | | Korte melding "Dit vak heeft geen naam" |
| 44 | Standaardkaart "Je trein vertrekt zo" blijft over een trein praten bij hernoemde stations | kaarten | klein | Lars | | Tekst met `{station}` zonder trein |
| 45 | Kaarten stond na terugkomen nog op "Nog niet gemaakt" | printpagina | klein (onzeker, mogelijk script) | Mila | | Met de hand nakijken |

Samen: 45 unieke bugs. 2 blokkerend, 18 hinderlijk, 25 klein. Vijf daarvan zitten in de hotfix (1, 2, 17, 21, 22).

## 3. UX

Per thema de testers, wat er misgaat en een voorstel met de plek volgens B143.

### UX 1. Het midden van het bord

Testers: Sophie, Mila, Fatima, Carlos, Willem, Durk, Kim, Joost (8).

- Foto, lint en logo liggen op het kruis van de vier panelen. Bij Eva & Tim staan de gezichten op de naad en is het lint in vieren geknipt. Je ziet dat pas in de PDF (Sophie, bug 4).
- Twee fotovelden: "Naam met foto" en "Foto over het hele midden" gebruiken elk een eigen foto, en de kleine blijft over de grote liggen (Sophie). Carlos voegde zo per ongeluk een extra laag toe, omdat "Foto toevoegen" bij Extra lagen bijna hetzelfde heet.
- Een logo komt 45 graden gedraaid als ruit, met letters die je slecht leest (Durk, Willem, Kim, Sophie). Er is geen keuze voor recht. Zoom in het kader is er, de grootte van het kader niet.
- Het lint ligt over de gezichten. Hoogte en grootte (B170) helpen, maar dan komt het lint op de kaartstapel (Sophie, Mila).

Voorstel, alles in het veldenpaneel van het midden (B143 punt 2):
- Afbeelding: één foto. Wisselen tussen "Naam met foto" en "Foto over het hele midden" houdt dezelfde foto. "Foto toevoegen" bij Extra lagen heet "Extra foto erop".
- Stijl: "Logo recht" of "Logo schuin", standaard recht bij een logo met tekst; een grootte voor het logo.
- Controle: "Ligt over een vouwlijn of een kaartvak", met een knop die het element verschuift. De standaardplekken liggen al buiten het kruis en de kaartvakken. Zie vraag 6.

### UX 2. Gewone taal

Testers: Ria, Mila, Bert, Joost, Carlos (5).

- "dpi" in Controle en bij de foto; twee getallen voor één foto (vak en bewijs) (Ria, Mila, Joost, Durk). "Resolutie 2540 dpi" bij een foto van 1,7 cm voelt ongeloofwaardig (Joost).
- "Variabelen" en grijze chips in de kaarttekst zijn voor een kind of een 78-jarige abstract (Ria, Mila, Bert). Het kaartveld heet "Verhaal", Bert zocht "Tekst". Het eigendomsbewijs heeft ook een Verhaal (B169), dus het woord betekent twee dingen.
- "Vinylsticker op maat, mat gelamineerd, herpositioneerbaar" en "SRA3" (Ria, Carlos, Bert).
- "Per set" bij Hoeveel geld? zegt Ria niets; op de printpagina heet dezelfde keuze "Volledige bank" (Sophie).
- De Safari-melding ("wist dit na 7 dagen") staat er al voor je iets deed (Bert).

Voorstel, alleen teksten, geen nieuwe velden:
- Controle en foto: "Deze foto is te klein en wordt korrelig op papier. Kies een grotere foto." Bij een goede foto alleen "Scherp genoeg". Eén melding per foto, met "ook op het eigendomsbewijs" erbij.
- Kaarten: het veld heet "Tekst van de kaart"; uitleg "Een woord in een grijs blokje verandert mee als je het vak een andere naam geeft."
- Hoeveel geld?: "Aanbevolen" in plaats van "Per set", en op de printpagina dezelfde woorden.
- Safari: één rustige regel in de opslagstatus, en pas een waarschuwing als er echt iets weg kan.
- Drukkerijtermen alleen in de Drukkerij-set, met een uitleg van SRA3 ("iets groter dan A3").

### UX 3. Printen: welke set, hoeveel en voor wie

Testers: Ria, Mila, Joost, Bert, Fatima, Hans, Willem, Carlos (8).

- De printpagina opent op Drukkerij-set (Ria, Mila, Joost, Bert). Hij onthoudt de set wel, maar per editie; een nieuwe editie begint altijd op Drukkerij.
- Wie naar de kopieerwinkel gaat, weet niet welke set (Bert). De Drukkerij-set geeft 122 losse kaartpagina's en SRA3-geld, dat kan een kopieerwinkel niet. Een drukker mist een bestelblad: kleurruimte, hoekradius, draairichting, snijwijze (Willem, Carlos).
- "7 vellen A4" bij kaarten is 16 pagina's (Ria).
- Na één wijziging maakt de setknop alles opnieuw, ook 12 MB speelgeld (Ria).
- Hoeveel geld? past niet bij het aantal pionnen (Ria: zes spelers, stand 2 tot 4) en noemt geen totaal voor 10 sets (Hans).
- Doosdeksel thuis op A3 (Fatima). Bord heeft geen vinkje en je weet niet of het eruit kan (Willem, Mila).
- ZIP en PDF's heten `Drukkerij-set.zip` en `01-bord-printer.pdf`, zonder editienaam (Willem). Instructies volgen de taal van de editie, niet die van de site (Carlos, Willem).
- "Aanzetten in de editor" opent de editor, niet de sectie Onderdelen (Hans).

Voorstel (B143 punt 5: rijen op de printpagina):
- Een nieuwe editie opent op de set die deze browser het laatst gebruikte, bij welke editie ook.
- Eén regel boven de schakelaar: "Eigen printer of kopieerwinkel: Thuisprint-set. Drukkerij of stickerprinter: Drukkerij-set."
- Een bestelblad als PDF in elke ZIP en als rij in Extra drukwerk, met maten, papier, dubbelzijdig (lange zijde), hoekradius en "RGB, omzetten mag" (zie vraag 8).
- Per rij "16 pagina's, dubbelzijdig 8 vellen".
- Na een wijziging alleen de onderdelen die echt veranderden als verouderd tonen; de setknop maakt alleen die.
- Bij Hoeveel geld?: Controle-melding als er meer pionnen zijn dan de stand, en het totaal aan biljetten voor alle sets in rij en instructie.
- Bord: uitgegrijsd vinkje "altijd in de set". Deksel thuis: "A3 nodig" in de rij, of op twee A4's.
- Bestandsnamen met de editienaam (`riso-bedrijfsspel-01-bord.pdf`).
- De link "Aanzetten" opent het editiepaneel bij Onderdelen.

### UX 4. Foto's

Testers: Ria, Joost, Mila, Bert, Fatima, Durk, Willem (7).

- Foto toevoegen kost nog twee stappen: "Foto", dan "Foto kiezen" (Ria, R3 UX 1 open). Voor Logo en Naam met foto is dit al één stap (B179).
- Meerdere foto's tegelijk (bug 7): je ziet de verdeling niet en kunt niets ruilen (Ria, Joost). Ria heeft een map van 30 foto's.
- Foto's op het bord zijn 12 tot 17 mm. Voor een familiespel is dat de kern (Ria, Mila, Hans, Joost).
- Een brede groepsfoto op het eigendomsbewijs begint Vullend en snijdt de hoofden af (Ria). Een staande tekening op de uitnodiging verliest het hoofd (Mila).
- Controle zegt wat er mis is, maar heeft geen knop "Andere foto" of "Aanpassen" (Fatima, Joost, Sophie).

Voorstel, in Afbeelding van het veldenpaneel (B143 punt 2):
- "Foto" opent meteen de bestandskiezer; slepen en plakken blijven.
- Meerdere foto's: de lijst "foto → vak" blijft in beeld en heeft per regel een keuzelijst met het vak. Alleen lege vakken van dezelfde soort.
- Brede foto op het bewijs en elke foto op de uitnodiging beginnen Passend.
- Bij een vak een regel over het formaat op papier ("Op het bord ongeveer zo groot als een postzegel: kies een gezicht van dichtbij").
- Controle-regels krijgen een knop die het veld opent (Andere foto, Uiterlijk).

### UX 5. Telefoon en tablet

Testers: Joost, Fatima, Bert, Sophie, Mila, Carlos (6).

- Het vaste voorbeeld neemt de helft van het scherm; het formulier zit in een raampje van 380 px (Joost, Fatima).
- Secties in het paneel blijven open, de pagina wordt lang (Fatima).
- De printbalk is op de telefoon twee rijen, 190 px (Joost); op een tablet een kwart van het scherm met de serveruitleg (Mila, Bert).
- Het minibord toont geen namen, foto's of de kleur van het midden (Joost, Sophie, Mila). Zo bedoeld (B144, B166): het grote bord heeft de namen. Mila ziet haar tekeningen alleen in Voorbeeld.
- Laptop 1366 × 768: de lijst begint onderaan, je ziet twee vakken (Carlos).
- Het voorbeeldvenster op 360 px zet het sluitkruisje op een eigen regel (Durk).

Voorstel: het voorbeeld klapt in tot één regel zodra je in het formulier scrolt, zoals B173 al op de tablet doet. Op de telefoon is één sectie tegelijk open. De serveruitleg in de printbalk alleen bij de eerste keer. Het minibord laat foto's als kleine vlakjes zien en het midden in de echte kleur. Bij een schermhoogte onder 800 px een kleiner minibord.

### UX 6. Woorden en taal

Testers: Carlos, Fatima, Lars, Hans (4).

- Spaanse woorden in Engelse zinnen: "Rent with 1 casa", "Collect €50" onder een Spaanse kaart, "Pay €200" op het belastingvak, "Place the deck here", "Mortgage value", "Pawn" (Carlos).
- Lidwoorden kloppen niet bij hernoemde woorden (bug 21). "In de cel" blijft op de hoek als de gevangenis "de strafbank" heet (Fatima).
- Het woord voor de gevangenis en de naam van het hoekvak pas je op twee plekken aan (Lars).
- Engels betekent pond (B154), ook voor iemand in Nederland. Carlos wil de laatst gekozen munt terug. Bedragen schrijven als "1.025 €" kan niet.

Voorstel: een uitklapblok "Vaste teksten" onder Woorden in het editiepaneel (B143 punt 1), met Betaal, Ontvang, Huur, Hypotheekwaarde, Leg de stapel hier, Eigendomsbewijs en Pion, en de/het bij elk woord. Bij het gevangeniswoord een regel "Ook het hoekvak hernoemen?". Nieuwe editie onthoudt de laatst gekozen munt. Zie vraag 3 voor een eigen taal.

### UX 7. Spelontwerp en bedragen

Testers: Lars, Joost, Fatima (3).

- Geen overzicht van prijzen en huren; 22 straten één voor één openen (Lars). Geen overzicht van kleurgroepen met plaatsnaam (Joost, R3-wens open).
- De hint zegt "De huur voor een hele kleurgroep en het aflossen van een hypotheek volgen daar vanzelf uit". Joost leest dat huur en hypotheek de prijs volgen. Dat doen ze niet (B140). R3 UX 7 stelde de regel "Huur en hypotheek pas je apart aan" voor; die is er niet.
- Basishuur 2 is niet te veranderen (20% is minder dan 1), zonder uitleg (Lars).
- Kaartbedragen 12 tot 18: Fatima tikte 20 en kreeg de grens pas na het typen (B132).
- Wisselen kan alleen met straten (Lars). Het menu ⋯ duwt het paneel omlaag; dat is bewust (B179).
- Geen `{salary}` voor kaarten die het salaris noemen (Lars).

Voorstel:
- Een sectie "Prijzen en huren" in het editiepaneel (B143 punt 1, geldt voor de hele editie): per kleurgroep een tabel met prijs, huren, hypotheek en plaatsnaam. Vervangt de wens "Kleurgroepen" van Joost.
- Hint aanpassen: "Huur en hypotheek pas je apart aan. De dubbele huur voor een hele kleurgroep volgt vanzelf."
- Grenzen vooraf in het veld ("kies 12 tot 18"); bij een vast bedrag "Te laag om aan te passen".
- `{salary}` en `{tax}` als variabelen in Invoegen.
- Balans in Controle: hotelhuur onder de huur met 4 huizen. Groter werk staat in de feature-tabel.

### UX 8. Sjablonen passen niet bij de groep

Testers: Hans, Fatima, Joost, Bert, Mila, Sophie (6).

- "Club of vereniging" is een voetbalclub: hoofdveld, tribune, bekerfinale. Een koor en een scoutinggroep moeten 30 vakken en 32 kaarten herschrijven (Hans, Fatima).
- "Verjaardag" gaat over rijbewijs en wereldreis; voor een kind van 8 klopt dat niet (Joost, Bert).
- Uitnodiging staat bij Verjaardag uit (`birthday.json` heeft geen uitnodiging), terwijl Mila die het eerst wilde.
- Bruiloft: de uitnodiging zegt "Spelavond" en de regel onder de kop is altijd de editienaam (Sophie).

Voorstel: Club neutraal maken (vereniging, geen sport). Verjaardag krijgt een versie voor kinderen (zie vraag 9). Uitnodiging standaard aan bij Verjaardag en Bruiloft, met een passende kop. De regel onder de kop wordt een veld in Tekst van de uitnodiging (B169 heeft de kop en de regel erboven al).

### UX 9. Wat er al is, maar niet gevonden werd

- Dupliceren staat in het naammenu (B144); Sophie zocht het in de editor en vond het alleen op Mijn edities. Na dupliceren blijf je op de lijst en lijkt de kopie op het origineel.
- De datum van een bruiloft kan in de Ondertitel (Algemeen, B145); Sophie zette hem in de naam, en nu leest het boekje "Welkom bij Eva & Tim 14 mei 2027".
- De tekst van de uitnodiging is aan te passen (B169); Hans vond hem niet.
- Pionnen met foto en naam bestaan (Ria en Mila gebruikten ze); Fatima vond pionnen "nummers".
- Namen plakken werkt en is volgens Kim het beste van de editor, maar nergens staat dat het kan. De melding zegt niet dat stations worden overgeslagen (Ria).
- De springlinks in het editiepaneel laten niet zien in welke sectie je staat (Bert); de vaste balk dekt de eerste regel (Hans).

Voorstel: na Dupliceren de kopie openen. Bij de naam in Algemeen een regel "Een datum of ondertitel zet je hieronder". In de lege rij van de lijst de placeholder "Typ of plak een lijst met namen". De plakmelding noemt wat werd overgeslagen. De springlink van de huidige sectie dik, en `scroll-padding` onder de balk.

### UX 10. Toetsenbord, rust en zekerheid

Testers: Kim, Bert, Durk (3).

- Nieuwe editie heeft autofocus op het naamveld, de eerste Tab slaat de skiplink over (Kim).
- Het menu ⋯ begint op "Terug naar standaard", de enige actie die iets weggooit (Kim).
- Meldingen als "22 namen ingevuld." staan niet in een `role="status"` (Kim, vermoeden).
- Geen duidelijk teken dat werk bewaard is (Durk); "Alleen in deze browser · 08:00" is klein (Kim).
- De eerste keer laden op een traag netwerk is een lege beige pagina met "Edities laden..." (Durk, 7 seconden).
- De Controle-lijst heeft alleen "Sluiten" rechtsonder (Bert).

Voorstel: geen autofocus. Menu ⋯ begint op Wisselen met…, Terug naar standaard onderaan. Meldingen in `role="status"`. De opslagstatus in de kop zegt kort "Bewaard op dit toestel" na een wijziging (B144, geen nieuw element). Bij laden het geraamte van de editor. Een kruisje rechtsboven in Controle.

## 4. Ontwerp

### Wat er goed uitziet

- Speelgeld met eigen munt, bank en de naam van het stel op elk biljet. Voor Sophie "het mooiste cadeaumoment" (Hans, Sophie, Durk, Lars, Carlos).
- Het Verhaal op de achterkant van het eigendomsbewijs, in schuine letters. Voor Ria het mooiste stuk van de site.
- Doosdeksel met een eigen foto en titel als cadeau (Ria, Mila). Uitnodiging met het echte bord, eigen foto en kleuren (Sophie, Mila).
- Strak met gedempte straatkleuren en goud (Sophie). Riso is vrolijk voor kinderen en kamp (Mila, Fatima). Strak is zuinig voor een goedkope printer (Durk).
- Het grote bord met namen in elk vak (Ria, Fatima, Joost). Mijn edities met de status per set (bijna iedereen).
- Liggende iPad: drie kolommen, prettig (Bert). Tablet staand in twee kolommen (Mila).

### Wat goedkoop of onaf oogt

- Het midden van het bord in print (UX 1): naden door gezichten, lint in stukken, logo als ruit in vieren.
- Foto's op het bord zijn kleine plaatjes zonder rand (Ria, Mila, Hans, Joost). Een foto op de hoek Gevangenis is een verloren vierkantje (Joost).
- Doosdeksel: titel raakt de rand, ondertitel en eigen regels rond 6 pt in veel lege ruimte (Sophie, Mila). Strak-deksel is wit met één regel (Bert, Kim).
- Pionnen zonder foto zijn kale tekstkaartjes "Pion 1" (Fatima); met foto staat de naam juist heel klein (Bert).
- Speelgeld is in elk thema beige met sepia, ook bij Strak (Kim, R3 open). De eerste vier thuisvellen zijn alleen biljetten van 1 (Ria).
- Thuisbord: grote effen middenvlakken in groen of roze, veel inkt (Ria, Hans, R3 open).
- Hoekvakken, Kans en Algemeen Fonds blijven fel bij een gedempt palet (Sophie). Een themawissel laat de oude straatkleuren staan (Sophie).
- Boekje: veel halflege pagina's (Hans).
- Foutscherm "De editie kon niet worden geopend" is kaal, zonder uitleg of herstel (Lars). Komt mee met de hotfix van bug 1, die bij openen herstelt.

### PDF's

Goed:
- TrimBox en BleedBox kloppen op bord, kaarten, deksel, boekje en uitnodiging; lettertypen ingesloten; foto's op 300 ppi; genummerde bestanden (Willem, R3 en B163 bevestigd).
- Bijzondere tekens kloppen: ñ, ¡, ¿, û, â, ô, ƒ (Carlos, Durk, Hans).
- Aantallen kloppen tot op het vel: 61 kaarten, 306 biljetten op 22 vellen SRA3, totalen voor 10 sets (Hans).
- Uitlijntest en snijtekens netjes (Mila, Joost, Fatima).

Minder:
- Speelgeld-PDF 25 MB (bug 3).
- Snijtekens beginnen precies op de afloop; gebruikelijk is 2 tot 3 mm afstand (Willem). B163 zet ze van de afloop tot 1 mm voor de rand. Voorstel: 2 mm ruimte na de afloop.
- Eindmaat en paginamaat worden in de instructies niet uitgelegd (bug 20); bij een bordmaat van 520 mm noemt de pagina "258 × 258 mm" zonder te zeggen dat de panelen 1 mm voor de vouw stoppen (Lars).
- Kaartmaat 0,1 mm te klein (bug 40); geld en pionnen zonder TrimBox (bug 41).
- Geen bestelblad (UX 3).

### Donkere modus en hoog contrast

- De site kent geen donkere modus. Er staat nergens `prefers-color-scheme` of `color-scheme` in de code, `theme-color` is vast `#F6F1E4`. Wie het systeem op donker heeft, krijgt een beige pagina, een witte kop en een donkere voet, en lichte formulieronderdelen van de browser (Kim). Zie vraag 1.
- Hoog contrast (`forced-colors`) heeft geen eigen regels: gekozen standen en bordkleuren verdwijnen (bug 13 en 14). De focusring en het vinkje bij "Klaar" blijven wel goed zichtbaar.
- Minder beweging: Kim mat geen animaties. Of er überhaupt animaties zijn, is niet vergeleken.

## 5. Feature-wensen

"Bestaat al deels" verwijst naar wat er op main al is. Plek volgens B143.

| Wens | Testers | Must / nice | Bestaat al deels? | Plek in het product | Grootte |
| --- | --- | --- | --- | --- | --- |
| Midden veilig voor de naden, één foto, logo recht | Sophie, Mila, Fatima, Carlos, Willem, Durk, Kim, Joost (8) | must (Sophie) | deels: rode arcering, titelhoogte en -grootte (B170), Passend (B180) | Afbeelding en Stijl van het midden, Controle | M |
| Printpagina: welke set, kopieerwinkel, onthouden | Ria, Mila, Joost, Bert, Fatima (5) | must (Ria, Bert) | deels: onthouden per editie | regel boven de schakelaar, onthouden per browser | S |
| Gewone taal zonder dpi, variabelen en vinyl | Ria, Mila, Bert, Joost (4) | must (Ria) | nee | teksten in Controle, Afbeelding en Kaarten | S |
| Grotere foto op het vak | Mila, Ria, Hans, Joost (4) | must (Mila, Ria) | deels: "Hele vak" | Afbeelding; bordontwerp | M |
| Sjablonen die passen: neutrale club, kinderfeest, uitnodiging aan | Hans, Fatima, Joost, Bert, Mila (5) | must (Fatima, Mila) | deels: negen sjablonen (B159) | Nieuwe editie, "Begin met…" | M |
| Bestelblad voor drukker of kopieerwinkel | Willem, Bert, Carlos (3) | must (Willem, Bert, Carlos) | deels: instructie per onderdeel | PDF in de ZIP en rij in Extra drukwerk | M |
| Foto's verdelen na meerdere tegelijk, fotolade | Ria, Joost, Bert (3) | must (Ria, Joost) | deels: lijst met Ongedaan maken (B168) | lijst in Afbeelding | M (lade L) |
| Lichter speelgeld: kleinere PDF, lichte variant, waarschuwing bij te veel spelers | Willem, Ria, Mila (3) | must (Willem, Ria) | deels: Hoeveel geld? (B156) | rij Speelgeld en Controle | M |
| Controle met knop naar de oplossing | Sophie, Fatima, Joost (3) | nice | nee | Controle | S |
| Vaste teksten aanpasbaar, eigen taal | Carlos (1), raakt Fatima en Lars | must (Carlos) | deels: Woorden (B145, B172) | Woorden in het editiepaneel | M |
| Instructies en bestandsnamen in de taal van de site, editienaam in de ZIP | Carlos, Willem (2) | must (Carlos, Willem) | nee | printjob, geen nieuw veld | S |
| Export en import als bestand | Lars, Bert (2) | must (Lars, Bert) | nee (alleen inloggen met Google) | naammenu (exporteren), Mijn edities (openen) | M |
| Prijzen en huren in één tabel, kleurgroepen | Lars, Joost (2) | must (Lars, Joost) | deels: per straat, plaats per groep | sectie in het editiepaneel | M |
| Voorbeeld inklapbaar op de telefoon | Joost, Fatima (2) | must (Joost) | ja op tablet (B173) | voorbeeld zelf | S |
| Opgeslagen-aanduiding | Durk, Kim (2) | nice | deels: tijd in de opslagstatus | opslagstatus in de kop | S |
| Grotere letters, rondleiding voor beginners | Bert, Ria (2) | must (Bert) | nee | instelling in de voet; rondleiding bij de eerste editie | M |
| Naam en datum apart | Sophie, Mila (2) | nice | ja: Ondertitel onder Algemeen | vindbaarheid; boekje gebruikt de naam | S |
| Regel onder de kop van de uitnodiging aanpasbaar | Sophie, Mila (2) | must (Mila) | deels: kop en regel erboven (B169) | Tekst van de uitnodiging | S |
| Donkere modus | Kim (1) | must (Kim) | nee | volgt het systeem; geen knop in de kop | M |
| Hoog contrast zonder verlies | Kim (1) | must voor wie het gebruikt | nee | bug 13 en 14 | S |
| Offline openen (service worker) | Durk (1) | nice, voor hem bijna must | nee (bewerken werkt offline als de pagina open is) | zie vraag 4 | M |
| Upload met voortgang, foto's verkleind | Durk (1) | must | nee | vaste printbalk | S |
| Kleuren voor Kans, Algemeen Fonds en hoeken | Sophie (1) | must | nee (alleen straatgroepen en accent) | Uiterlijk in het editiepaneel | S |
| Geld en pionnen in de kleuren van het thema | Kim (1) | nice | nee | thema | M |
| Balanscontrole | Lars (1) | must | nee | Controle | M |
| `{salary}` en `{tax}` | Lars (1) | nice | nee | Invoegen in de kaarttekst | S |
| Wisselen met elk vak, kaartvolgorde slepen | Lars (1) | nice | deels: wisselen tussen straten | menu ⋯ en de kaartenlijst | M |
| Eigen kaartbedragen buiten 20%, eigen biljetwaarden | Fatima, Lars (2) | nice | nee, B132 sluit het uit (extra kaarten zijn vrijer, B175) | zie vraag 2 | geen |
| Pion met foto of eigen naam | Fatima (1) | must | ja, helemaal | vindbaarheid | geen |
| Witte achtergrond van een tekening weghalen | Mila (1) | nice | nee | Afbeelding van de pion | M |
| Kleinere wensen: tijd voor knippen (Ria), foto van de telefoon via QR (Ria), cadeaukaartje (Ria), uitleg voor ouders (Mila), clipart (Mila), quizkaart (Fatima), dubbelzijdig per printermerk (Hans), zoeken en vervangen (Carlos), schrijfwijze bedragen (Carlos), kaarten dupliceren en naar de andere stapel (Lars), versiegeschiedenis (Lars), meerdere koppels tegelijk en wijzigingen doorvoeren naar kopieën (Sophie), proefvel met het midden (Sophie), stansmal als laag (Willem) | 1 elk | nice | per wens | per wens | S tot L |

## 6. Wat goed werkte

Bevestigd opgelost uit ronde 3:
- Opslaan vlak voor sluiten (R3-3): Ria sloot na 150 ms, de naam bleef staan; Durk zag het ook.
- Herladen en printen vanuit Mijn edities (R3-9) gaan naar de bestaande printlink (Ria, Hans, Joost, Mila).
- Teller met overgeslagen onderdelen (R3-6) en de paneelmaat 248 mm (R3-22) kloppen (Carlos, Hans).
- Munt en woorden in boekje, prijslijst en instructies (R3-7, R3-17): koorgulden ƒ, tenten, lessenaars (Hans, Carlos).
- Enter in de huisregels (R3-10) (Hans, Lars). Te weinig biljetten voor 8 spelers (R3-21) (Hans).
- Bord vergroten (R3-11): onder het minibord, met namen (Ria, Joost, Mila, Fatima).
- Bord buiten de editor (R3-5): de uitnodiging toont de foto en de eigen kleuren (Sophie).
- Aangepast-teller tegen het sjabloon (R3-25) (Carlos). Pionnenkop met het echte aantal (R3-32) en het menu met eigen achtergrond (R3-33) (Ria). Spookstreep weg (R3-41) (Joost).
- Foto ook op het eigendomsbewijs, aantal pionnen, namen typen en plakken, zoeken, Verhaal op het bewijs (Ria, Joost, Kim, Fatima, Lars).
- Een bedrag buiten de grens gaat naar de grens met een melding (Joost, Lars).

Verder:
- Van sjabloon naar editor in minder dan een halve seconde, ook op een iPad (Bert).
- Woorden lopen overal door, ook in Spaans, Fries en piratentaal (Carlos, Durk, Lars, Fatima).
- Foto's worden in de browser verwerkt: 6,9 MB in een seconde met trage CPU, HEIC van 4032 × 3024 in 5 seconden (Durk, Bert). Bewerken werkt zonder verbinding en niets raakt kwijt (Durk).
- Herstel na verbindingsverlies tijdens het maken: binnen 2 seconden weer op koers; een tweede klik hergebruikt de job (Durk).
- Ongedaan maken over 12 stappen, ook over namen en bedragen heen (Lars).
- Toetsenbord: J, K, F2, Enter, Esc, V, Ctrl+Z, Ctrl+S, Ctrl+P werken, de focusring is dik en duidelijk (Kim).
- Instructies rekenen alles uit voor 10 sets (Hans). De printlimiet van B164 liep bij een 429 vanzelf door (Hans).
- Dupliceren houdt alles (kleuren, thema, accent, deksel) (Sophie).
- Geen Nederlandse tekst in Engelse pagina's of PDF's, geen eigen fouten in de console.

## 7. Voorstel

### Bouwvolgorde

Batch 0, loopt al: de hotfix (bug 1, 2, 17, 21, 22), met herstel bij openen van een editie die een bedrag buiten de grens heeft.

Batch 1: de hinderlijke bugs.
- Speelgeld-PDF kleiner (3).
- Samen maken: servermelding bij de knop (6).
- Meerdere foto's: alleen lege vakken van dezelfde soort, lijst in beeld (7).
- Printpagina op de telefoon (8), taal na printen (10), upload met voortgang en verkleinde foto's (11), offline-meldingen (12).
- Hoog contrast (13, 14), zoekveld en focus (15, 30).
- Vergroot bord op tablet (16).
- Teksten: instructies "hierboven" (18), prijslijst (19), boekjesmaat (20).
- Controle: betalen tegenover ontvangen (9).
- Kaarttekst met chips met de hand nakijken (5).
- Bug 4 wacht op vraag 6.

Batch 2: de kleine bugs (23 tot 45) in één ronde, plus de integratieronde van B138 met schermafbeeldingen voor en na.

Batch 3: de UX-thema's.
1. Het midden van het bord (UX 1), na vraag 6.
2. Printen (UX 3): set onthouden per browser, kopieerwinkelregel, alleen veranderde onderdelen opnieuw, totalen.
3. Foto's (UX 4) en gewone taal (UX 2).
4. Telefoon en tablet (UX 5), vindbaarheid (UX 9), toetsenbord en rust (UX 10).
5. Sjablonen (UX 8), woorden (UX 6) en spelontwerp (UX 7), na vraag 2, 3 en 9.

Batch 4: features, in volgorde van testers en grootte. Bestelblad, lichter speelgeld, prijzen en huren in een tabel, export en import (na vraag 5), donkere modus (na vraag 1), kleuren voor Kans en hoeken, fotolade.

Daarna één deploy na lokaal testen, zoals afgesproken. Samen maken moet in de volgende ronde opnieuw getest worden, met testers op eigen netwerken of ingelogd.

### Vragen voor Niek

1. Donkere modus. Kim (migraine) krijgt een felle pagina als haar systeem op donker staat. Voorstel: ja, alleen voor de schil (kop, lijst, paneel, dialogen, printpagina, openbare pagina's), en het volgt het systeem. Bord, kaarten, voorbeelden en PDF's blijven licht, want dat is het drukwerk. Geen schakelaar in de kop (B143 punt 6); een keuze Licht / Donker / Systeem eventueel later in de voet.
2. Vrijere kaartbedragen. Fatima wil "Betaal 20" waar 18 het maximum is, Lars wil eigen biljetwaarden. Voorstel: B132 houden. Wel de grenzen vooraf in het veld tonen en bij de grensmelding noemen dat een extra kaart een vrij bedrag heeft. Geen eigen biljetwaarden.
3. Eigen taal voor bord en kaarten. Carlos maakt Spaanse edities en krijgt Spanglish. Voorstel: geen derde taal. Wel een uitklapblok "Vaste teksten" onder Woorden met de vaste woorden van bord, kaarten en eigendomsbewijs, en de/het per woord. Wie alles invult, heeft dan zijn eigen taal. Het spelregelboekje blijft Nederlands of Engels.
4. Offline en PWA. Durk wil de editor openen zonder bereik. Voorstel: nu niet. Eerst duidelijke meldingen en opnieuw proberen bij printen (bug 11 en 12) en een lichter eerste scherm. Opnieuw bekijken als meer testers op slecht netwerk werken.
5. Export en import. Lars verloor bijna een editie, Bert wil geen Google-account. Voorstel: ja. "Bewaar als bestand" in het naammenu (B143 punt 4), één bestand met foto's, en "Bestand openen" op Mijn edities. Geen synchronisatie of versiegeschiedenis.
6. Vouwlijnen in het midden. Keuzes: (a) Controle-melding met een knop om te verschuiven, en standaardplekken buiten het kruis en de kaartvakken; (b) bij het printen alles vanzelf verschuiven; (c) een bord uit één stuk als keuze. Voorstel: (a), plus een logo standaard recht. (b) verandert stil wat de maker zag, (c) past niet bij de doos van 267 mm.
7. Taal van instructies en bestandsnamen. Nu volgen ze de editie. Carlos leest Engels en print bij een Nederlandse kopieerwinkel. Voorstel: instructies, bestandsnamen en printgids volgen de taal van de site waarop je print; spelinhoud blijft in de taal van de editie. Geen extra keuze.
8. Kopieerwinkel. Voorstel: geen derde set. Eén regel boven de schakelaar ("Eigen printer of kopieerwinkel: Thuisprint-set") en een bestelblad in elke ZIP met maten, papier, dubbelzijdig, hoekradius en kleurruimte.
9. Sjablonen. Voorstel: "Club of vereniging" neutraal maken, zonder sport, en "Verjaardag" splitsen in Verjaardag en Kinderfeest. Uitnodiging standaard aan bij Verjaardag, Kinderfeest en Bruiloft. Geen losse sjablonen per sport of per scoutinggroep.
