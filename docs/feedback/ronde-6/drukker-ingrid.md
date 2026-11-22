# Feedback ronde 6: eigenaar kopieer- en drukwinkel (desktop 1440 × 900)

Persona: Ingrid, 52, heeft een kopieer- en drukwinkel. Klanten komen steeds vaker binnen met een Printopoly-ZIP. Ze maakt zelf drie edities en controleert de bestanden zoals ze dat met elk drukwerk doet: TrimBox en BleedBox, afloop, snijtekens, kleur, resolutie van foto's, het bestelblad, bestandsnamen, maten en het aantal sets.

Gemaakt:

- Westerveen. Sjabloon Dorp of wijk, thema Klassiek, Nederlands, euro. 22 straatnamen in één keer geplakt via het zoekveld. Foto's: kerk (3000 × 4000) op een straat, een piepkleine foto (320 × 240) op Bakker Jansen als Hele vak, een CMYK-JPEG, een kleine foto van 400 × 300, een grote foto (6000 × 8000) over het hele midden en een foto op het deksel. Geprint: proefvel en de volledige Drukkerij-set met alles aan (bord, kaarten, volledige bank, pionnen, deksel, uitnodiging, boekje).
- Anna & Pieter. Sjabloon Bruiloft, thema Riso, Nederlands, eigen munt Hartjes met teken ♥ en bank "Bank van Anna & Pieter". Naam met foto in het midden, taartfoto en kerkfoto op vakken, een te kleine foto op het deksel, een foto op een pion, uitnodiging met datum en plek. Geprint: proefvel en de Thuisprint-set voor 2 sets (bord, kaarten, pionnen, deksel, uitnodiging, boekje, geen geld).
- Kopie & Druk. Leeg, Klassiek, euro, andere bordmaat 510 / 75 / 5 mm. Logo als PNG met doorzichtige achtergrond, foto's op twee vakken, grote foto op het deksel. Geprint: Drukkerij-set voor 3 sets (bord, kaarten, deksel) en het proefvel.

## Samenvatting

De bestanden zijn beter dan wat ik meestal van klanten krijg. De Drukkerij-set heeft per pagina een TrimBox en een BleedBox die kloppen tot op een tiende millimeter, 3 mm afloop, snijtekens buiten de afloop, ingesloten lettertypen en foto's die netjes op 300 ppi zijn teruggerekend. Het bestelblad zegt wat ik als drukker wil weten: RGB of CMYK, eindmaat, maat met afloop, papier, hoeken en snijden. Het grootste probleem is het aantal sets: het bestelblad en de rijen op de printpagina tellen per set, dus wie 3 sets bestelt en het blad letterlijk volgt, krijgt er één. Verder zijn er kleine dingen die een vakman ziet: een lijn precies op de snijrand van het bord, een vellabel dat over een snijteken valt en een tegenstrijdige fotomelding in de editor.

## Werkt niet (bugs)

1. Fotomelding spreekt zichzelf tegen bij Hele vak. Editor, Bakker Jansen, foto van 320 × 240 op Hele vak. Bovenaan staat de gele waarschuwing "Deze foto is te klein en wordt korrelig op papier". Onderaan bij de foto staat tegelijk "Scherp genoeg" en "Op het bord is de foto ongeveer 37 bij 36 mm", terwijl Hele vak juist groter is. In de PDF staat de foto op 109 ppi, dus de gele melding heeft gelijk. Verwacht: één oordeel en de maat van Hele vak. Ernst: hinderlijk. Stappen: foto van 320 × 240 op een straat, kies Hele vak, scroll naar beneden. Screenshot: `img/drukker-ingrid/02-foto-tegenstrijdig.jpg`.

2. Aantallen op het bestelblad gelden voor één set. Bij 3 sets staat bovenaan "Aantal sets: 3. De aantallen hieronder zijn voor één set." Daaronder staat bij het bord "4 stuks", bij het deksel "1 stuk", bij de kaarten "60 kaarten". Een collega aan de balie neemt die regels over in het bestelsysteem en bestelt één set. De printpagina doet hetzelfde: de rij Bord zegt "4 stuks" en alleen de balk onderaan zegt "12 panelen". Verwacht: per regel "4 stuks per set, 12 in totaal". Ernst: hinderlijk, en duur als het misgaat. Screenshot: `img/drukker-ingrid/16-bestelblad.jpg`.

3. Lijn op de snijrand van het bord. Op de bordpanelen loopt een donkere omtreklijn precies op de TrimBox, met de lichte afloop erbuiten. Een sticker wordt nooit op 0,0 mm gesneden. Wijkt het mes een halve millimeter af, dan zie je aan de ene kant een halve lijn en aan de andere kant niets. Verwacht: de lijn minstens 2 mm binnen de snijrand, of weg. Ernst: klein, maar elke drukker valt erover. Screenshot: `img/drukker-ingrid/07-bord-lijn-op-snijrand.jpg`.

4. Vellabel van het speelgeld valt over een snijteken. Bovenaan elk SRA3-vel staat "Speelgeld: € 1, € 5, € 10, € 20 …". Het label staat precies op het middelste snijteken, zodat "€ 20" doorgestreept lijkt. Een velnummer ("vel 3 van 22") ontbreekt. Ernst: klein. Screenshot: `img/drukker-ingrid/09-geld-label-op-snijteken.jpg`.

5. Boekje is 148,5 mm breed, het bestelblad zegt 148. De TrimBox van het spelregelboekje is 148,5 × 210 mm en de paginamaat 166,5 × 228 mm. A5 is 148 × 210 mm, en het bestelblad zegt ook 148 × 210. Een halve millimeter merkt niemand, maar een preflight wel. Ernst: klein.

6. Proefvel laat de foto van het vak niet zien. Bij Anna & Pieter heeft "Waar het allemaal begon" een foto. Op het proefvel staat dat vak zonder foto. Het proefvel gebruik ik ook om kleur en scherpte te beoordelen voor een klant duizend vellen laat maken. Ernst: klein. Screenshot: `img/drukker-ingrid/13-proefvel-zonder-foto.jpg`.

7. Bij een hele-vakfoto valt de titel van het eigendomsbewijs over het gezicht. Op het eigendomsbewijs van Bakker Jansen loopt de foto door tot in de afloop en ligt de lichtblauwe titelbalk half doorzichtig over het gezicht. R5-05 is daarmee voor Hele vak nog niet helemaal opgelost. Bij In kader is het eigendomsbewijs wel netjes. Ernst: klein. Screenshot: `img/drukker-ingrid/08-eigendomsbewijs-hele-vak.jpg`.

8. Kleine tekstfouten in de instructies. De instructie bij het bord zegt "Upload elke PDF zoals hij is", maar het bord is één PDF van 4 pagina's. Het boekje van de bruiloft zegt "het speelgeld neem je uit je eigen spel", terwijl alle bedragen in ♥ staan en het eigen geld in euro is. Ernst: klein.

## UX: wat kan beter

- Bestelblad als bestellijst. Ik wil bovenaan één tabel met per onderdeel het bestand, het product, de eindmaat, het aantal per set en het totaal. Nu zijn het drie A4's met per onderdeel een losse tabel, en pagina 1 is half leeg omdat er een pagina-einde na het bord komt.
- Proefvel hoort in de ZIP. De Drukkerij-set zegt "print dit thuis en bestel dan", maar het proefvel zit niet in de ZIP. Een klant die alleen de ZIP mailt, heeft het niet. Zet het erbij als `00-proefvel.pdf`.
- Andere bordmaat zonder plaatje. Bij A buitenmaat, B hoekvak en C rand staat geen tekening. Wat "rand" is, moest ik raden. Een klein schema met de drie maten erin scheelt telefoontjes. Screenshot: `img/drukker-ingrid/14-andere-bordmaat.jpg`.
- De uitnodiging telt mee in de sets. Bij 2 sets telt de balk ook 2 uitnodigingsvellen. Uitnodigingen gaan per gast, niet per set. Het bestelblad zegt "zoveel stuks als je wilt"; liever vraag je het aantal en zet je dat op het blad.
- "Sleep om te verschuiven, knijp om te zoomen" staat ook op een desktop. Knijpen kan daar niet.
- Bij Hele vak hoort de maat erbij. Dezelfde regel als bij In kader, maar dan met de maat van het hele vak, zodat een klant zelf kan rekenen.

## Ontwerp

Mooi:

- De printpagina is helder. Per onderdeel zie je eindmaat, afloop en aantal, met een status (nog niet gemaakt, wordt gemaakt, klaar). De set van Westerveen met 22 SRA3-vellen geld was in 25 seconden klaar. Screenshot: `img/drukker-ingrid/04-printpagina-drukkerij.jpg`.
- Het speelgeld ziet er echt uit: guillochepatroon, eigen kleur per coupure, naam van de editie op de zijkant. Coupures staan nu gemengd per vel. R5-29 (vellen met alleen € 1) is opgelost.
- Het bord in vier panelen met "Paneel A" tot "D" in de rand, en één middenfoto die over vier pagina's wordt hergebruikt. Screenshot: `img/drukker-ingrid/06-bord-panelen.jpg`.
- De bruiloft in Riso met ♥ als munt is echt leuk. De ♥ staat overal goed: kaarten, boekje, proefvel. Screenshot: `img/drukker-ingrid/12-bruiloft-kaarten-deksel-uitnodiging.jpg`.
- Mijn edities met de status "Drukkerij-set klaar tot 29 nov" per editie. Screenshot: `img/drukker-ingrid/17-mijn-edities.jpg`.

Minder:

- Pionnen zonder foto zijn witte kaartjes met "Pion 3" erop, zonder kleur. Naast het mooie geld voelt dat onaf. Een spelerskleur per pion zou al helpen. De foto op een pion is maar 17 × 16 mm. Screenshot: `img/drukker-ingrid/10-pionnen-kaal.jpg`.
- Bestelblad en instructie-PDF's zijn kaal: zwarte tekst in een standaardletter, zonder plaatje of huisstijl. Voor een drukker is dat prima. Een klant die het meeneemt naar de balie ziet een technisch formulier.
- Het proefvel is voor de onderste helft leeg. Er is plek voor een kaart op ware grootte en een kleurstrook.
- De ZIP-tijden staan een uur verkeerd (16:30 in plaats van 17:30). Klein, maar het viel me op toen ik bestanden van twee klanten sorteerde.

## Features die ik zou willen

- Totaalaantallen op het bestelblad bij meer sets. Elke regel "per set" en "totaal". Must.
- Maat van het doosdeksel zelf kiezen. Het deksel is altijd 267 × 267 mm, ook bij een andere bordmaat. Veel oudere dozen zijn rechthoekig, ongeveer 40 × 26,5 cm. Klanten met zo'n doos kan ik nu niet helpen. Must. Screenshot: `img/drukker-ingrid/15-deksel-geen-maat.jpg`.
- Resolutie in ppi bij elke foto. "Scherp genoeg" is voor een klant prima. Ik wil zien "ongeveer 210 ppi op het bord", net als in mijn eigen preflight. Nice.
- Een velnummer op het speelgeld ("vel 3 van 22"), zodat ik kan controleren of de stapel compleet is. Nice.
- Logo als SVG of PDF. Bedrijven en verenigingen hebben hun logo zelden als PNG met doorzichtige achtergrond. Nu staat er "SVG kan niet". Nice.
- Een CMYK-versie of in elk geval de keuze. "Omzetten naar CMYK mag" is eerlijk. Voor digitaal drukken is RGB prima, voor offset moet ik het zelf omzetten en dan verschuiven de felle Riso-kleuren. Nice.
- Het proefvel ook als kleurproef: één vak met foto en een strook met de themakleuren. Nice.

## Wat goed werkte

- TrimBox en BleedBox op elk onderdeel met afloop: bord 248 mm (eigen maat 253 mm), kaarten 63 × 88, deksel 267, uitnodiging 105 × 148. Geld en pionnen hebben geen afloop en het bestelblad zegt dat ook, inclusief "een preflight-melding daarover mag je negeren". Zo hoort het.
- Foto's worden op 300 ppi teruggerekend en een te kleine foto wordt overal gemeld: in de editor, in de lijst met een driehoekje en bovenaan de printpagina bij "Nog even nakijken". De CMYK-JPEG kwam met goede kleuren door.
- Bestandsnamen met editienaam en volgnummer (`westerveen-01-bord.pdf`), en de ZIP heet `westerveen-drukkerij-set.zip`.
- Getoetste punten uit ronde 5 die nu werken: R5-01 (geen onterechte melding bij een staande foto), R5-02 (foto over het hele midden verschijnt), R5-04 (Naam met foto is groot en recht), R5-08 ("Op het deksel is de foto …"), R5-09 (pionnen staan als één melding op de printpagina), R5-10 (22 namen geplakt in het zoekveld), R5-20 ("niet in je set" in de editor), R5-25 (bestelblad zat meteen in de ZIP), R5-26 (proefvel toont € en ♥), R5-28 (waarschuwing bij een lege uitnodiging) en R5-29 (boekje noemt geen geld als je het niet print, deksel thuis op 2 × A4, uitleg over 16 pagina's bij de kaarten, ondertitel op het deksel goed leesbaar).
- Het proefvel bij een eigen bordmaat toont het hoekvak van 75 × 75 mm en een vak van 38,89 × 75 mm. Zo kan een klant het echt tegen zijn bord houden.
