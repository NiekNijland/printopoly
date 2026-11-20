# Feedback ronde 2: editie "Heeten" (Salland, Overijssel)

Persona: 30, laptop 1440 px, NL, thema Strak, veel sneltoetsen. Productie (printopoly.nl), twee printjobs gedraaid.

## Samenvatting

Alles aan: bord (modern vierkant, vragen bij aanmaken), eigendomsbewijzen, kaarten, geld, pionnen, doosdeksel, huisregels. Alle 22 straten, 4 stations en 2 nutsbedrijven hernoemd naar Heetense en Sallandse plaatsen. Foto's op 8 vakken (meerdere tegelijk), tekst- en fotolaag in het bord-midden, 12 kaarten met lokale grappen en bedragen, bankbiljet met bankwapen en bankenaam, doosdeksel met foto, 5 huisregels.

Goed: de fixes uit ronde 1 werken. De eigendomsbewijzen in de PDF dragen alle 28 de nieuwe namen (geen standaardnamen meer). Meer dan 20 foto's bij een keer kiezen kon ik niet apart testen, maar 8 tegelijk ging goed. De keuze voor bordformaat staat nu bij het aanmaken. Sneltoetsen (J/K, 1-4, F2, R, B, +, C, Cmd+P, Cmd/Ctrl+Z, Ctrl+Y) werken, en het sneltoetsenvenster is duidelijk.

Groot probleem: in de gedownloade PDF's staan geen foto's. Op bord, doosdeksel en speelgeld staan kapotte-afbeeldingsicoontjes. In de editor zien de foto's er prima uit, ook na herladen. Dat is blokkerend voor het hele doel van de site.

## Bevindingen

### 1. Foto's ontbreken in alle PDF's (kapotte afbeeldingen) [blokkerend]
- Waar: printpagina, Drukkerij-set, bord.pdf, doosdeksel.pdf, speelgeld.pdf (ook tweede job, ander token, zelfde resultaat).
- Wat: op de 8 vakken met foto (Dorpsstraat, Holterweg, Johannalaan, enz.) staat in de PDF een rechthoek met het "kapotte afbeelding"-icoontje van de browser. Hetzelfde voor de foto-laag in het bordmidden en de doosdeksel-foto (grote leeg kader met icoontje bovenin) en de ronde bank-foto op het biljet van 1 (klein icoontje). `pdfimages -list board.pdf` laat alleen de kleine 14x16 icoontjes zien, geen enkele foto. Bestand van het bord is maar 98 KB.
- Verwacht: de foto's uit de editor in de PDF.
- Aanwijzingen: in het netwerklog zag ik op de printpagina alleen `POST /api/print-jobs` (201) en `POST .../generate` (200), geen aparte foto-uploads. Dat suggereert dat de foto's wel (of niet) in die ene POST zitten en dat de renderer ze daarna niet kan laden, vergelijkbaar met de recente Reverb/loopback-fix. Let op: mijn foto's zijn in de browser gemaakt via een gesimuleerde bestandskeuze (canvas, DataTransfer). De editor behandelde ze als normale foto's (dpi-melding, blijft na herladen), maar volledig uitsluiten dat dit aan mijn route ligt kan ik niet.
- Stappen: nieuwe editie, foto op een vak, Printen, Drukkerij-set maken, bord-PDF downloaden en openen.

### 2. Printpagina laat geen foto's zien in de voorbeeldjes en maakt niets duidelijk over ontbrekende foto's [hinderlijk]
- Waar: printpagina, kaartjes per onderdeel.
- Wat: het onderdeel meldt "KLAAR" ook al is de PDF zonder foto's. De bord-miniatuur heeft geen foto's. Geen waarschuwing of controle achteraf.
- Verwacht: minstens een controle dat foto's in de PDF zitten, of een foutstatus.

### 3. Voorbeeld van de kaarten op de printpagina toont de standaardkaart, niet mijn eigen [klein]
- Waar: printpagina, kaartje "Kaarten en eigendomsbewijzen".
- Wat: het miniatuur toont "Kans: Draai om en loop recht naar Start. Je krijgt 200 van de bank." terwijl ik kaart 1 had aangepast naar een eigen tekst met bedrag. De echte PDF had mijn teksten wel goed (gecontroleerd: kroket, pomp bij het dorpshuis, Station Olst, Sinterklaas).
- Verwacht: een voorbeeld van mijn eigen editie, of duidelijk "voorbeeld".

### 4. Escape en Enter verlaten tekstveld niet; sneltoetsen blijven dan uit [hinderlijk, sneltoetsgebruiker]
- Waar: editor, naamveld (rechts), tekstvelden bij kaarten en huisregels.
- Wat: na F2 en typen drukte ik Enter (zoals de lijst "Naar het naamveld: F2 of Enter" lijkt te beloven) en daarna J voor het volgende vak. De J landde in het veld ("Dorpsstraatj"). Escape verlaat het veld ook niet; alleen Tab werkt. Escape sluit wel dialogen. Hetzelfde bij het tekstvak van een kaart: na het typen ging een toets "3" in de tekst in plaats van naar Geld.
- Verwacht: Enter (bij eenregelige velden) of Escape zet de focus terug naar het paneel zodat J/K/1-4 weer werken. Nu moet je Tab (of de muis) gebruiken. Een hint in het sneltoetsenvenster zou al helpen.
- Stappen: vak kiezen, F2, tekst typen, Enter, J.

### 5. Foto's gaan bij "meerdere tegelijk kiezen" ook naar Kans-/Algemeen Fonds-/Belastingvakken [klein]
- Waar: editor, Foto kiezen met 8 bestanden.
- Wat: de 8 foto's werden op de 8 opeenvolgende vakken vanaf het geselecteerde vak gezet, ook op Algemeen Fonds, Inkomstenbelasting, Station en Kans. Ik had gehoopt dat alleen straten (of de gekozen vakken) een foto zouden krijgen. Ik moest dit achteraf niet terugdraaien, maar in een echte editie moet je dat dan per vak weghalen.
- Verwacht: een vooraf getoonde verdeling ("8 foto's op deze vakken") of overslaan van niet-straatvakken, plus een manier om te kiezen.

### 6. Controle-melding blijft hangen en dekt de rechterbovenhoek af [klein]
- Waar: editor, na op Controle of C gedrukt.
- Wat: de melding "Controle: niets gevonden. Gecontroleerd: fotoscherpte, tekst en bordmaat." blijft lang staan en bedekt het begin van het rechterpaneel (het veld "Verhaal"/"Naam"). Verdween pas na navigatie.
- Verwacht: sluit na een paar seconden of bij Esc (sneltoetsenlijst zegt Esc sluit Controle).
- Opmerking: Controle zegt "niets gevonden" terwijl in mijn foto's tekst (rand van de afbeelding) afgesneden wordt op de vakken; dat is mijn eigen ontwerp, maar misschien geen taak van Controle.

### 7. Eigendomsbewijs toont een fotovak in de editor, in de PDF niet [klein]
- Waar: editor, tab Eigendomsbewijs, en cards.pdf.
- Wat: in de editor staat onder de titel een grijs fotovak, ook als het vak al een foto heeft (die werd daar niet getoond). In de PDF heeft het eigendomsbewijs geen foto of lege plek.
- Verwacht: editor en PDF komen overeen, of het fotovak vermeld dat de foto niet op het bewijs komt.

### 8. Ongelijke undo-stappen [klein]
- Waar: editor.
- Wat: Rotatie, zoom (+++) en zwart-wit achter elkaar. Twee keer Cmd+Z haalde alle drie weg (zichtbaar), drie keer Ctrl+Y/Ctrl+Shift+Z leek soms niets te doen en soms alles terug te zetten. Ctrl+Y werkte direct, Ctrl+Shift+Z niet betrouwbaar (kan aan mijn testmethode liggen).
- Verwacht: voorspelbare stappen; mogelijk de hoeveelheid foto-aanpassingen samenvoegen is bewust, dan prima.

### 9. Naam van de bank staat bij elk biljet apart [klein]
- Waar: Geld, per biljet.
- Wat: "Naam van de bank" invullen bij biljet 1 telt als 1/7. De tekst heeft kennelijk betrekking op alle biljetten ("De naam van de bank geldt voor alle biljetten"), maar de teller laat 1/7 zien.
- Verwacht: teller 7/7 of een klein hint.

### 10. Terugknop op printpagina gaat naar de lijst, niet naar de editor [klein]
- Waar: printpagina van een gemaakt printjob (`/nl/print/...`).
- Wat: "‹ Heeten" bovenaan gaat naar "Mijn edities", niet terug naar de editor of het print-overzicht. Op de eerdere pagina staat wel "Terug naar de editor".
- Verwacht: terug naar de editor van die editie.

### 11. Eerste weergave na herladen: foto's pas na een korte flits [klein]
- Waar: editor na herladen.
- Wat: eerst een klein grijs vak, na ~2 s komt het vak op volledige grootte met de foto. Niets verloren, maar de voorvertoning springt.

### 12. Taal: site opent in het Engels bij eerste bezoek [klein]
- Waar: `https://printopoly.nl` leidt naar `/en` voor een NL-gebruiker (mijn browser).
- Wat: ik heb handmatig `/nl` gekozen. Mijn browser staat mogelijk op Engels; zo niet, mist de site taaldetectie.
- Verwacht: taal volgt de browser (en een duidelijke NL/EN-knop, die er is).

### 13. Huisregels niet als eigen onderdeel op de printpagina [idee]
- Waar: printpagina.
- Wat: de huisregels komen als 61e kaart in de kaarten-PDF (staat in de instructies: "61 als je de huisregelskaart aanzet"), maar er is geen aparte regel "Huisregels" op de printpagina. Je moet de instructie lezen om dat te weten. Wel handig: de tekst past netjes op de kaart.

### 14. Bord-midden: titel kruist de vouwlijn [idee]
- Waar: Bord, "Midden van het bord".
- Wat: de standaardtitel "Heeten" ligt schuin over de vouwlijnen en de rode kaartstapelvlakken; mijn extra tekstlaag verdween deels onder het Kans-vlak. De rode arcering helpt, maar een melding bij overlap zou fijn zijn.

## Wat prima ging
- Hernoemen met F2 en Tab/J: snel, geen verlies.
- Eigendomsbewijzen: alle 28 met de nieuwe naam, met Heetense plaatsen (ronde-1-bug is opgelost).
- Kaarten: bedragen "Betaal € 75" / "Ontvang € 80" duidelijk op de kaart; lange tekst past (16+16+28 = 60 kaarten + huisregelskaart).
- Genereren van de Drukkerij-set ging snel (< 20 s); PDF's volgen de maten uit de instructie (4 panelen 720x720 pt, kaarten 63x88 mm, 15 sheets geld).
- Cmd+P naar printpagina, de lijst met sneltoetsen en de focusring zijn netjes.

## Gebruikte Heetense namen (zelf gekozen; gecontroleerd via zoeken: Dorpsstraat, Holterweg, Johannalaan, Nieuw Heeten, Zwembad De Oase, Schoonheten, Landgoed Verwolde; de rest uit mijn eigen kennis van de omgeving en niet allemaal gecontroleerd)
Dorpsstraat, Holterweg, Johannalaan, Nieuw Heeten, Zwembad De Oase, Sportpark Heeten, Dorpshuis, Heetenseweg, Schoonheten, Dorpsplein, Landgoed Verwolde, Overijssels Kanaal, Oude Kerkpad, Gemeentehuis Raalte, Zwolseweg, Kanaalbrug, Kerkplein, Sallandse Heuvelrug, Holterberg, Molen De Hoop, Kasteel Het Nijenhuis, Marktplein Raalte; stations Raalte, Olst, Heino, Wijhe; nutsbedrijven Zonnepark Heeten, Waterput Heeten.

## Bestanden
PDF's van deze run staan in `/private/tmp/claude-501/-Users-nieknijland-git-hobby-printopoly/08bf87c2-2f81-4fd8-88d6-54bc7cbea685/scratchpad/feedback2/heeten/` (board.pdf, cards.pdf, money.pdf, tokens.pdf, box_lid.pdf, instr_*.pdf).
Printjobs: `k8QNJPrPUtOeLBjb9SG2t3DPV7nqFiRmZ5XykGkf` en `8m2Eg0H0Vw9lW0lXb3jev5VhT4HVwH4gvS4Qcy24` (verloopt na 7 dagen).
Editie-id: `bc07ceb8-0404-48a6-b4a9-25fb5a86721f`.
