# Feedback ronde 6: internationale student met een studentenhuis-editie (Android-telefoon, 412 × 915, ook liggend)

Persona: Aisha, 21, internationale student in Groningen. Ze werkt op een Android-telefoon in het Engels (/en). Ze plakt lijsten met namen, herschrijft veel kaarten met bedragen om te betalen of te ontvangen, en gebruikt veel de terugknop van Android.

Gemaakt:

- Herestraat 42. Sjabloon Vrienden, thema Riso (kwam met het sjabloon), Engels. Bij Nieuwe editie € gekozen, daarna in de editor een eigen munt: "Pizza slices" met teken 🍕. 22 straatnamen in één keer geplakt in het zoekveld, vier stations en een nutsbedrijf hernoemd (Bus 3 to Zernike, OV-fiets rack en zo). Twaalf kaarten herschreven: Betalen en Ontvangen omgezet, bedragen veranderd, een "For"-tekst toegevoegd, en een extra kaart met €50. Zes pionnen met de namen van huisgenoten (geplakt). Uitnodiging met datum en plek. Geprint als Thuisprint: bord, kaarten, speelgeld, pionnen, uitnodiging, spelregelboekje, plus het proefvel. ZIP ook gedownload.
- Ibn Battuta Game Night. Sjabloon Groep, thema Klassiek, Engels, € (onthouden van de vorige keer). 22 namen van de studievereniging geplakt, het logo van de vereniging als logo in het midden. Vijf kaarten herschreven. Geprint als Drukkerij-set: bord en kaarten.
- Blank for the Erasmus party. Leeg, Klassiek, Engels, €. Alle 22 straatnamen en alle 16 Kanskaarten leeg gemaakt, om met de hand in te vullen op het feest. Geprint als Thuisprint: bord en kaarten.

## Samenvatting

Het voelde snel en vrolijk. Namen plakken in het zoekveld werkt nu meteen, en mijn pizza-munt staat overal goed: op het bord, de kaarten, het geld, het proefvel en zelfs groot op de biljetten. Dat vond ik het leukste. Printen ging in 18 seconden en "Share all" is op de telefoon precies wat ik wil. Het grootste probleem: na elke kaart die ik sluit (met de terugknop of met de pijl) sta ik weer op het tabblad Board en moet ik opnieuw Cards kiezen. Met twaalf kaarten herschrijven is dat heel vervelend. Verder kreeg ik een lege editie alleen leeg via een truc (een spatie typen), en zijn op mijn telefoonbreedte de knoppen Fit en Close in Preview lege vakjes.

## Werkt niet (bugs)

1. Kaart sluiten brengt je terug naar Board in plaats van Cards. In de editor, tab Cards: open een kaart, druk op de terugknop van Android of op de pijl linksboven. Je komt op het tabblad Board, bovenaan, niet in de kaartenlijst waar je was. Ik verwachtte terug te komen bij de kaarten, op de plek waar ik was. Ernst: hinderlijk (voor wie veel kaarten aanpast bijna blokkerend). Stappen: Cards, kaart 12 openen, terug. De pijl heet ook "Back to the board", ook bij een kaart. Wie met Next door de kaarten loopt heeft er geen last van, maar dat ontdekte ik pas later. Screenshots: `img/student-aisha/04-kaart-open.jpg`, `img/student-aisha/05-na-sluiten-kaart-bord-tab.jpg`.

2. In Preview zijn Fit en Close lege vakjes op 412 px. Open Preview op een telefoon van 412 px breed. Rechtsboven staan twee knoppen met een rand en niets erin. Het zijn Fit en Close, maar het icoon is weg. Waarschijnlijk krijgt de knop tussen 400 en 640 px zowel 44 px breedte als 24 px opvulling aan elke kant (`max-sm:w-11` met `min-[400px]:px-6`), zodat er voor het icoon 0 px overblijft. Op 360 px (Gerda) speelt het niet. Ik verwachtte een kruisje om te sluiten. Ernst: hinderlijk, je ziet niet hoe je Preview dichtdoet (terug werkt wel). Screenshot: `img/student-aisha/06-voorbeeld-lege-knoppen.jpg`.

3. "Amounts · 1 changed" bij kaarten die ik niet aanraakte. Bij sjablonen Vrienden en Groep staat bij elke kaart met een bedrag "Amounts · 1 changed", ook als het bedrag gelijk is aan de standaard (Community Chest 8: Collect €20, "Standard €20"). Ik dacht eerst dat ik per ongeluk iets had veranderd. Ernst: klein. Screenshot: `img/student-aisha/03-bedrag-grenzen.jpg`.

4. Het spelregelboekje telt de extra kaart niet mee. Ik voegde een eigen Algemeen Fonds-kaart toe (17 kaarten). De printpagina zegt in de tekst van het boekje "16 Chance cards and 17 Community Chest cards", maar de PDF die eruit kwam zegt "16 Chance cards and 16 Community Chest cards". De kaart zelf staat wel in de kaarten-PDF. Ernst: klein.

5. Het boekje spreekt zichzelf tegen over het aantal spelers. Mijn set heeft 6 pionnen en één set speelgeld. Op de voorkant staat "A game for 2 to 8 players", binnenin "You play with 2 to 4 players: that is how much play money is in the box". De printpagina waarschuwde er wel netjes voor bij het speelgeld ("Your set has 6 pawns and this money is enough for 4 players"). Ik had die zin gemist. Ernst: klein.

Wat ik controleerde uit ronde 5 en wat nu goed is:

- R5-10 plakken in het zoekveld: werkt. "22 names filled in. 11 spaces of another kind were skipped." Ook plakken van 6 namen in een pionrij werkt.
- R5-11 betalen of ontvangen: werkt. Ik kon Pay naar Collect zetten en terug.
- R5-12 "for for": opgelost. Ik typte zelf "for the house fund" en de kaart zegt "Pay 🍕15 for the house fund".
- R5-13 lege editie: de meldingen zijn gegroepeerd ("16 cards have no text yet", "22 spaces have no name yet"). Zie wel punt 2 bij UX.
- R5-14 Android-terug met een open vak: sluit nu het vak in plaats van de editor. Maar zie bug 1.
- R5-15 namen in het Engels: overal Pawns, test sheet, Check before you print en Collect.
- R5-17 Groep: neutraal, geen kantoorgrappen. Geen meldingen uit het sjabloon zelf ("Nothing to check").
- R5-18 geen tekst over toetsenbord of sneltoetsen op de telefoon gevonden.
- R5-21 Nieuwe editie op de telefoon: sjablonen staan in het eerste scherm en de balk zegt "Start: Friends · Riso".
- R5-22 munt onthouden: "€ euro, as last time". Mijn eigen munt uit de editor wordt niet onthouden, maar dat is ook niet beloofd.
- R5-23 Mijn edities: de knop heeft tekst, de uitleg over opslag is rustig.
- R5-24 Deel je bord: toont mijn echte bord met mijn namen en pizza's, met de banner "Our own edition".
- R5-26 proefvel: toont Start en "Aisha's room" met 🍕60. "If it fits, print the rest" in de Thuisprint-set.
- R5-27 een tik op de naam van een onderdeel zet het vinkje om.
- R5-28 lege uitnodiging: waarschuwing op de printpagina, "Change" brengt me naar het tekstveld.
- R5-29 speelgeld: het eerste vel heeft nu 1, 5, 10, 20, 50 en 100. Het geldadvies telt de pionnen. De kaartenregel zegt "16 A4 pages · on both sides that is 8 sheets".
- R5-30 "put two staples in the fold" is duidelijk. De ZIP hoef ik op Android niet meer te openen: "Share all" is de grote knop.

## UX: wat kan beter

1. Een lege editie maken is verstopt. Ik wilde een editie met lege vakken en lege kaarten om op het feest met pen in te vullen. "Blank" bij Nieuwe editie is de standaardeditie met Mill Lane en Field Road. Als ik een naam wis en wegtik, komt de standaardnaam terug (het veld toont hem als placeholder). Pas toen ik een spatie typte, werd het vak echt leeg ("Space 1, no name yet"). Dat vond ik bij toeval. Voorstel: bij Nieuwe editie een keuze "Empty, to fill in by hand", of in het menu van een vak of kaart "Leave empty". En noem het sjabloon "Standard" in plaats van "Blank", want blank betekent in het Engels leeg. Screenshot: `img/student-aisha/09-spatie-truc-leeg-vak.jpg`.

2. Een kaart zonder bedrag kan geen bedrag krijgen. Bij een gevangeniskaart of een "ga naar"-kaart is er geen blok Amounts. Ik wilde "The board forgets to send the invoice for the gala" laten opleveren, maar dat kan alleen door "Collect €50" zelf in de tekst te typen. Dan staat het bedrag in de lopende tekst, niet vet onderaan zoals bij de andere kaarten, en het volgt de munt niet als ik die later verander. Voorstel: bij elke kaart de keuze Geen bedrag, Betalen of Ontvangen tonen. Screenshots: `img/student-aisha/08-gevangeniskaart-geen-bedrag.jpg`, `img/student-aisha/18-pdf-groep-bedrag-in-tekst.jpg`.

3. De grenzen van het bedrag zijn krap. "Pick 12 to 18" bij een kaart van 18, "Pick 40 to 60" bij 45. Voor "the washing machine breaks, pay 50" moest ik een extra kaart maken. Dat staat er wel duidelijk bij, maar dan heb ik 17 kaarten in plaats van een gewone kaart te vervangen. Voorstel: een ruimere marge, of een knop "maak hier een eigen kaart van".

4. Het kaartje in het bewerkpaneel is heel klein op een telefoon (ongeveer 70 px breed). Ik kan mijn eigen zin bijna niet lezen. Bij het typen klapt het voorbeeld ook in ("Show preview"). Voorstel: een tik op het kaartje vergroot het, of het voorbeeld toont de kaart op leesbare grootte boven het tekstveld. Screenshot: `img/student-aisha/07-kleine-kaartpreview.jpg`.

5. Na 6 namen plakken bij de pionnen blijft het aantal op 8 staan, met "Pawn 7" en "Pawn 8". Voorstel: na plakken vragen "Set the number of pawns to 6?".

6. Na de uitnodiging invullen (via "Change" op de printpagina) moet ik twee keer terug om weer op de printpagina te komen. De eerste keer sluit het paneel. Dat snap ik, maar een knop "Back to print" in het paneel zou fijn zijn als je van de printpagina komt.

7. De melding "22 names filled in" verschijnt over de lijst heen, precies over de rijen die ik wil controleren. Klein, verdwijnt vanzelf.

8. Op de printpagina zie je na "Make home print set" niet waar de PDF's staan. De pagina blijft bovenaan, en alleen de balk verandert in "Share all". Ik moest naar beneden scrollen om te zien dat alles READY was. Voorstel: na afloop kort een regel "Your set is ready" in de balk of bovenaan.

9. In liggende stand wordt de regel in de balk afgekapt ("Together 45 sheets o…"). Klein.

## Ontwerp

Mooi:

- De editor in liggende stand is goed: drie kolommen met lijst, groot kaartvoorbeeld en velden. Zo werk ik het liefst. Screenshot: `img/student-aisha/12-liggend-editor.jpg`.
- De emoji als munt komt overal goed uit, ook in de PDF's in kleur. De biljetten met een grote pizza zijn echt leuk om te printen. Screenshot: `img/student-aisha/17-pdf-pionnen-geld-uitnodiging-boekje.jpg`.
- De uitnodiging met het eigen bord erop ziet er af uit. Datum, plek en wat je meeneemt staan er netjes onder.
- De pionnen, de kaarten en het boekje zien er verzorgd uit. Lange namen als "The broken washing machine" passen op de eigendomsbewijzen.
- Het logo van de vereniging in het midden staat recht en scherp, in de PDF ook. Screenshot: `img/student-aisha/19-pdf-groep-bord-logo.jpg`.

Minder:

- De lege eigendomsbewijzen in de lege editie hebben een donkere gekleurde kop (bruin, donkerblauw). Daar schrijf je met een pen niet op. Een lichte strook om de naam op te schrijven zou beter werken. Screenshot: `img/student-aisha/20-pdf-leeg.jpg`.
- Het nachtbus-station heeft het treinicoon. Dat is de standaard, maar bij "Bus 3 to Zernike" ziet het raar uit. Een keuze uit een paar icoontjes (bus, fiets, trein) zou leuk zijn.
- In Preview de lege knoppen, zie bug 2.

## Features die ik zou willen

- Een echte lege editie om met de hand in te vullen, als keuze bij Nieuwe editie. Voor een feest waar iedereen zelf een vak bedenkt. Must.
- Bij elke kaart betalen of ontvangen kunnen kiezen, ook bij kaarten die nu geen bedrag hebben. Must.
- De eigen munt (naam en teken) onthouden voor een volgende editie, net als de gewone munt. Ons hele huis gebruikt de pizza. Nice.
- Een icoon per station of nutsbedrijf kiezen (bus, fiets, wifi). Nice.
- Na plakken van pionnamen het aantal pionnen aanpassen. Nice.
- Een knop "Back to print" in het paneel als je via de printpagina binnenkwam. Nice.

## Wat goed werkte

Namen plakken in het zoekveld en bij de pionnen. De eigen munt met emoji, overal goed doorgevoerd. Betalen en ontvangen omzetten, en de "For"-tekst zonder dubbel "for". De terugknop sluit een open vak in plaats van de editor te verlaten. Printen was in 18 seconden klaar, het proefvel toont mijn eigen vak en munt, de ZIP heeft een bestelblad en instructies, en "Share all" is de grote knop op de telefoon. De waarschuwing over de lege uitnodiging en de gegroepeerde meldingen bij de lege editie waren precies goed. Deel je bord toont nu mijn echte bord.
