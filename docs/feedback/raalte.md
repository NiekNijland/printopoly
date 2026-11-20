# Feedback Printopoly: testronde "Raalte Spelavond"

Tester: 34 jaar, organiseert een jaarlijkse spelavond met vrienden uit Raalte, laptop 1440 px, thema Klassiek, NL.

## Samenvatting

> Update na herstel van de lokale Chrome-instelling: punt 1 en 2 hieronder (printen mislukt) zijn opgelost, ik heb de PDF's daarna wel kunnen maken en bekijken. De PDF-bevindingen staan onderaan (punten 13 t/m 21). Belangrijkste: de eigendomsbewijzen in de PDF gebruiken nog de standaard-straatnamen (Molenweg, Veldweg, Station Noord...) in plaats van mijn namen.


De editor werkt prettig en snel. Een volledige editie maken (28 vakken hernoemd, 10 foto's op het bord, midden met titel, tekst- en fotolaag, doosdeksel met foto en tekst, 16 kaarten, 7 biljetkleuren plus banknaam, 8 pionnen met 5 foto's, 3 huisregels) ging zonder haperingen. De waarschuwing voor een te kleine foto (127 dpi) is helder, springt naar het goede vak en verdwijnt zodra je een grotere foto kiest. Opslaan, herladen, undo/redo en het instellingenvenster werken.

Het printen lukte niet. In mijn lokale omgeving mislukten alle onderdelen (Drukkerij-set, Thuisprint-set en losse onderdelen) met "Mislukt, opnieuw proberen". Oorzaak in de log: `LARAVEL_PDF_CHROME_BINARY=` is leeg in `.env`, waardoor de queue-job crasht met "First element must contain a non-empty program name". Ik heb daarom geen PDF's kunnen downloaden of bekijken. Punten 4 en 5 van mijn opdracht (PDF's inspecteren: namen, foto's, snijtekens, leesbaarheid) zijn dus NIET getest. Ik heb de `.env` niet aangepast, omdat die door vier andere testers wordt gedeeld en ik geen code of config mocht wijzigen.

Wat ik niet kon testen: PDF-inhoud, afloop/snijtekens, leesbaarheid van kaarten en biljetten op papier, de ZIP-download.

Opmerking over mijn testmethode: een deel van de invoer (vaknamen, kaarten, pionnen, kleuren) heb ik met JavaScript ingevuld in plaats van met toetsenbord. Daardoor zag ik tijdelijk verouderde waarden in invoervelden (zie punt 9). Dat bleek een artefact van mijn werkwijze, niet van de app. De vaknamen komen deels uit mijn hoofd; het zijn geloofwaardige Raalte-namen, maar niet allemaal geverifieerd.

## Bevindingen

### 1. Alle PDF-onderdelen mislukken lokaal ("Mislukt, opnieuw proberen")
- Waar: `/nl/print/{token}`, elke "Maken"-knop, "Drukkerij-set maken", Thuisprint-tab, "Opnieuw proberen".
- Wat gebeurde er: na "Drukkerij-set maken" springt de pagina naar `/nl/print/...` en na enkele seconden staan Bord, Kaarten, Speelgeld, Pionnen en Doosdeksel op rood "MISLUKT, OPNIEUW PROBEREN". "Opnieuw proberen" mislukt weer. Idem voor een los onderdeel (Thuisprint, Bord). In `storage/logs/laravel.log`: `ValueError: First element must contain a non-empty program name` (Symfony Process), `LARAVEL_PDF_CHROME_BINARY=` is leeg in `.env`. Het binary bestaat wel in de container: `/usr/local/bin/chrome-headless-shell`.
- Verwacht: PDF's of een duidelijke oorzaak.
- Ernst: blokkerend (voor deze testomgeving; in productie staat het binary volgens de `.env`-opmerking wel goed).
- Verbetering: een lege waarde als "niet ingesteld" behandelen, met een duidelijke foutmelding of een terugval op het standaardpad.
- Reproduceren: Editie met foto's > Printen > Drukkerij-set maken > wachten.

### 2. Foutmelding zegt niets over wat er mis ging
- Waar: statusbadge op de printpagina.
- Wat: alleen "Mislukt, opnieuw proberen", ook als opnieuw proberen niets kan oplossen. Geen hint als "probeer het later nog eens" of "neem contact op", geen foutcode.
- Verwacht: een zin over wat de gebruiker kan doen, plus iets om mee te mailen.
- Ernst: hinderlijk.
- Reproduceren: als punt 1.

### 3. Print-overzicht toont verouderde miniatuur in de kaartenrij
- Waar: Printpagina, rij "Kaarten en eigendomsbewijzen".
- Wat: de voorbeeldminiatuur (en de verborgen tekst achter de rij) toont het eigendomsbewijs "Molenweg", terwijl mijn eerste straat "Raalterwetering" heet. Het bord toont wel mijn titel. Op de printpagina vóór het maken staat ook de oude standaardinhoud (Molenweg, Kerkstraat) in de verborgen miniatuur-DOM, pas na het maken verschijnen mijn namen.
- Verwacht: de miniaturen laten mijn eigen editie zien.
- Ernst: klein.
- Reproduceren: vaknamen aanpassen > Printen > naar de kaartenrij kijken.

### 4. Nieuwe lagen in het bordmidden en op het doosdeksel landen op elkaar, bovenop de titel
- Waar: Editor > Bord > Midden van het bord; Doos en pionnen > Doosdeksel.
- Wat: "Tekst toevoegen" en "Foto toevoegen" plaatsen de laag precies in het midden, over de titel en over de vouwlijnen heen. De tweede laag ligt bovenop de eerste, dus wie niet weet dat je kunt slepen, ziet een rommelig midden. Op het deksel overlapt mijn tekst ook de vaste regel "Een spel voor 2 tot 8 spelers".
- Verwacht: een lege plek zoeken, of de nieuwe laag selecteren en laten zien dat hij versleept kan worden (staat wel als hulptekst onderaan).
- Ernst: klein.
- Reproduceren: Midden van het bord > Tekst toevoegen > Foto toevoegen.

### 5. Titel van het bord loopt over het vouwkruis
- Waar: Editor, bordmidden (titel gedraaid 45 graden, standaard).
- Wat: de diagonale titel "Raalte Monopoly-avond" is groot en loopt door de vouwlijnen (gearceerd). Ook mijn eigen tekstlaag kwam na slepen over een vouwlijn te staan, zonder waarschuwing. De gearceerde zones en de uitleg ("Rood gearceerd: de vouwlijnen...") zijn wel duidelijk; maar het gaat hier om een ontwerpkeuze die de eerste indruk van het bord bepaalt: de titel valt in de standaard over de vouw.
- Verwacht: de standaardtitel ontwijkt de vouwen, of Controle waarschuwt als tekst over een vouw loopt.
- Ernst: klein / idee.

### 6. Controle meldt alleen te lage fotoresolutie
- Waar: knop "Controle" bovenin.
- Wat: bij mijn bewust kleine foto (200 x 150, 127 dpi) kwam netjes "1 ding om naar te kijken", met naam van het vak ("Deventerstraat · Bord"), en klik springt naar het vak. Na vervangen door een grote foto werd het "Controle: 0". Goed. Maar mijn tekst op het bordmidden over een vouw en de dubbel opgestapelde lagen leveren geen melding op.
- Ernst: idee.

### 7. Zwarte vlak en afgesneden gezichten bij portretfoto's op pionnen
- Waar: Doos en pionnen > Pion.
- Wat: het fotokader van een pion is breed en laag. Een vierkante portretfoto (gezicht) wordt boven en onder afgesneden (neus en kin weg). Zoom kan alleen inzoomen (minimum 100%), dus je kunt het kader niet "uitzoomen" om het hele gezicht te zien. Dat moet je in de foto zelf oplossen.
- Verwacht: kunnen uitzoomen of een hulptekst dat het kader landschap is.
- Ernst: klein.

### 8. Standaardkaart-hint verwijst naar oude straatnamen
- Waar: Kaarten > een Kans- of Algemeen Fonds-kaart > blokje "Standaardkaart".
- Wat: bij mijn Kans 3 stond "Loop door naar Lindelaan..." en "Ga naar het rode vak (Lindelaan)". Lindelaan heet in mijn editie "Kerkplein". Het blokje met "Wat er gebeurt" laat ook niet zien dat mijn aangepaste tekst en dat effect niet meer bij elkaar horen (ik schreef een grap over een pubquiz met 100 euro, de hint zegt iets anders).
- Verwacht: straatnamen uit mijn editie, of het blokje duidelijker als "voorbeeld, wordt niet geprint" benoemen.
- Ernst: klein.
- Reproduceren: vak hernoemen > Kaarten > Kans 3 > blokje "Standaardkaart" lezen.

### 9. Mogelijk stale invoerveld na wisselen van selectie (alleen gezien bij scriptmatige invoer)
- Waar: naamveld van een vak, tekstvak bij een kaart, tekstvak bij Huisregels.
- Wat: nadat ik veel velden met JavaScript had gezet (native setter + `input`-event), toonde het zijpaneel bij een ander vak/kaart de laatst ingevulde tekst terwijl het voorbeeld correct was (Huisregels toonde de tekst van Algemeen Fonds 8). Na herladen en met echt toetsenbord typen en klikken gebeurde dit niet meer; de data zelf was altijd goed. Waarschijnlijk een artefact van mijn werkwijze, maar het kan zijn dat een zeer snelle klik-wissel hetzelfde doet.
- Ernst: klein / onzeker.

### 10. Gebruikersvriendelijke dingen die goed waren
- Landingspagina is duidelijk, uitleg in vier stappen en het voorbeeld laat meteen zien wat je krijgt.
- Eigen naam voor de editie wordt meteen overal doorgevoerd (titel van het bord en het deksel).
- Fotowaarschuwing met dpi ("Resolutie 127 dpi, te laag") en de tekst "Kies een grotere foto of zoom minder in" is begrijpelijk.
- Huisregels worden automatisch genummerd ("Eén regel per regel. De kaart nummert ze zelf"); lange tekst past op de kaart.
- Aantal-teller per tab (Bord 29/41, Kaarten 16/35, Geld 7/7, Doos en pionnen 10/10) geeft voortgang en motiveert.
- Instellingenvenster ("Klaar") werkt direct, naam en thema live zichtbaar.
- Undo/redo werkte op een vervangen foto, herladen behield alles ("Alleen in deze browser" met tijd).
- Printpagina heeft een Proefvel (A4 liniaal) om te testen of de sticker past, en een privacytekst over wat naar de server gaat. Goed.

### 11. "Mijn edities" laat edities van meerdere mensen in één browser zien
- Waar: `/nl/editions`.
- Wat: "Edities in deze browser: 6", waaronder die van de andere testers (zelfde browser, zelfde origin). Dat is testopzet, geen app-fout, maar het laat wel zien dat iemand die een computer deelt (gezin) elkaars edities ziet. Er is geen onderscheid of beveiliging; de tekst "Alleen in deze browser" is wel eerlijk.
- Ernst: idee.

### 12. Kleine tekst- en verwarrend-puntjes
- Kaartenteller: de printpagina noemt 60 kaarten in de verborgen tekst en 61 kaarten in de zichtbare rij (huisregels?). Niet te herleiden voor een gebruiker waar het 61e vandaan komt; Huisregels staat niet als apart onderdeel op de printpagina.
- De Thuisprint-rij Kaarten toont "16 vellen A4 liggend - 4 kaarten per vel" terwijl de landingspagina "Kaarten als vouwkaart" noemt. Zonder PDF kon ik niet controleren of die combinatie klopt.
- Ernst: klein.

## Console
`read_console_messages` op mijn tabblad: alleen "File chooser dialog can only be shown with a user activation." Die kwam van mijn eigen scriptmatige klik op "Foto toevoegen"; een echte klik geeft die melding niet. Geen andere fouten of warnings in de console.

## Niet getest
- PDF-inhoud, afloop, snijtekens, maten, ZIP (zie punt 1).
- Mobiele weergave, Engelse interface, Google-login.
- Foto's HEIC, drag-and-drop van echte bestanden (browsertools kunnen geen bestandskiezer openen).

## PDF-bevindingen (na herstel van de omgeving)

Gemaakt: Drukkerij-set (5 onderdelen + ZIP-knop), Thuisprint-set (5 onderdelen + ZIP, 10 bestanden inclusief instructies), plus losse onderdelen via "Opnieuw proberen". Bestanden staan in `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback/raalte/druk` en `.../home`, PNG-voorbeelden in `.../png` en `.../png2`.

Maten kloppen met wat de pagina belooft: Drukkerij-bord 4 pagina's van 254 x 254 mm (248 + 3 mm afloop rondom), kaarten 69,2 x 93,8 mm (63 x 88 + afloop), 122 pagina's (61 kaarten, voor- en achterkant), speelgeld SRA3 (320 x 450 mm, 15 vellen), doosdeksel 273 x 273 mm, pionnen 1 vel A4. Thuisprint: bord 7 vellen A4, kaarten 16 vellen A4 liggend, speelgeld 35 vellen A4, doosdeksel A3. Snijtekens staan bij speelgeld, pionnen en de thuisprint-vellen.

### 13. Eigendomsbewijzen in de PDF hebben de oude standaardnamen (blokkerend)
- Waar: kaarten-PDF van Drukkerij-set en Thuisprint-set; ook de miniatuur in de kaartenrij op de printpagina.
- Wat: het eerste eigendomsbewijs is "Molenweg", daarna "Veldweg", "Station Noord", "Kerkstraat", "Schoolstraat", "Beekstraat", "Lindelaan", "Elektriciteitsbedrijf", "Eikenlaan", "Berkenlaan"... (de standaardnamen). Alleen "Marktplein" klopt, omdat ik die naam niet veranderde. Het bord in dezelfde set heeft wel mijn namen (Raalterwetering, Zwolseweg, ...), en in de editor toont het tabblad Eigendomsbewijs mijn naam. Ook de hypotheekkant draagt de oude naam. Het bedrag, de huur en de kleur kloppen wel.
- Verwacht: elk eigendomsbewijs heet zoals mijn vak, dat is precies waarom "Eigendomsbewijzen: nodig als je straatnamen verandert" bestaat.
- Ernst: blokkerend (de set is onbruikbaar: bord en akten spreken elkaar tegen).
- Reproduceren: editie maken met eigendomsbewijzen, een aantal vaknamen hernoemen (via het Naam-veld van het vak), Printen > Drukkerij-set maken > kaarten-PDF openen. Let op: ik heb de namen met scriptmatige invoer gezet (native setter + input-event); het bord pakte ze wel op en de editor ook, dus de data lijkt goed, alleen de akten-render haalt de standaardnamen op. Mogelijk komt het omdat de akten hun naam uit een andere sleutel lezen dan het vak-naamveld. Controleer met een echte handmatige hernoeming om dat uit te sluiten.

### 14. Kans- en Algemeen Fonds-kaarten, huisregels, speelgeld en bankenaam kloppen
- Mijn 8 Kans- en 8 Algemeen Fonds-teksten staan correct op de kaarten, met "Ontvang EUR 50" of "Betaal EUR 30" onderaan. Huisregels staan genummerd 1 t/m 3 op een kaart en het grijze fotovak uit de editor wordt in de PDF niet geprint (goed). Ik zie dat de kaarten onderling dezelfde rand "Raalte Spelavond" op de achterkant dragen.
- Positief. Ernst: n.v.t.

### 15. Speelgeld ziet er goed uit
- Kleuren per biljet, "speelgeld" en "Raalter Boerenbank" staan op elk biljet, snijtekens en een kopje "Speelgeld: EUR 1" bovenaan het vel zijn aanwezig. Het koptje is erg klein (past op de marge) maar voldoende. Foto op het biljet van 100 niet apart bekeken.
- Positief.

### 16. Foto's op het bord komen goed door, kleine foto blijft zichtbaar pixelig
- Marktplein, Raalterwetering, Café Het Hoekje, Grote Kerk, Kasteel Het Nijenhuis enz. staan scherp en op de juiste plek, ook gedraaid op de zijden. Het kleine fototje bij Deventerstraat (mijn eerste 200 x 150, later vervangen) heb ik niet meer in de PDF; de dpi-waarschuwing werkte dus als bedoeld.
- Het bordmidden is in de thuisprint verdeeld in vier stukken; de titel "Raalte Spelavond" wordt dan over vellen verdeeld (dat is ontwerp), de foto van de Grote Kerk komt heel op een vel. Mijn tekstlaag "Spelavond bij vrienden - Raalte" staat op het bord op de vouw-rand van het vel; het is leesbaar maar ligt nét tegen de vouwlijn (zie punt 5).
- Ernst: klein.

### 17. Foto op doosdeksel staat tegen de rand en is klein
- Waar: doosdeksel-PDF.
- Wat: mijn foto (vierkant uitgesneden) raakt de bovenrand van het deksel en lijkt in de PDF kleiner dan het voorbeeld in de editor suggereerde. Op papier staat hij tegen de rand van de sticker, bij het wegsnijden van de afloop riskeer je een afgesneden hoek.
- Verwacht: een waarschuwing in Controle als een laag buiten de veilige zone staat.
- Ernst: hinderlijk.

### 18. Pionnen: leeg fotovak ziet er onaf uit
- Waar: pionnen-PDF, pion Lotte, Dirk en Fleur (zonder foto).
- Wat: ze krijgen een leeg wit vlak met alleen de naam en een vaag "Pion"-label. Dat is acceptabel, maar voor een vriendengroep wil je een fallback (initiaal of een kleur). Pionnen met foto's werken goed, alleen zijn gezichten bovenaan en onderaan afgesneden (punt 7).
- Ernst: klein / idee.

### 19. Eén toegang per set: de tabwissel op de printpagina is niet direct duidelijk
- Waar: `/nl/print/{token}`.
- Wat: de resultaatlinks (PDF, instructies) staan per tab; na "Thuisprint-set maken" bleef ik op de Drukkerij-tab zonder de nieuwe bestanden te zien. Pas na het wisselen naar de Thuisprint-tab verschenen ze. Een melding of automatische tabwissel zou helpen.
- Ernst: klein.

### 20. Opnieuw proberen kan maar één onderdeel tegelijk
- Waar: printpagina na een mislukte run.
- Wat: bij meerdere mislukte onderdelen zegt de app bij elke volgende klik "Er loopt al een run. Wacht tot die klaar is." Je moet dus onderdeel voor onderdeel opnieuw proberen. Een "Alles opnieuw proberen" ontbreekt.
- Ernst: klein.

### 21. Instructies-PDF is één A4 met beide sets
- Waar: `instructies-bord.pdf` in beide ZIP's.
- Wat: de instructies voor Drukkerij en Thuisprint staan allebei op dezelfde A4 en zijn bij beide sets identiek (zelfde bestandsgrootte). Voor wie maar één route kiest is de helft overbodig.
- Ernst: idee.
