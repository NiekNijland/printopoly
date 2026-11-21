# Feedback ronde 3: grafisch ontwerper die elke pixel nakijkt (desktop 2560 x 1440, schaal 2)

Persona: Noor, 36, grafisch ontwerper, Nederlands, perfectionist. Rendert elke PDF op 150 dpi (soms 300 dpi) en kijkt naar typografie, uitlijning, afloop, snijtekens, kleur, hoe dicht het bij het echte spel komt en hoe verzorgd de site zelf is.

Gemaakt (alle drie op printopoly.nl, release d8a5165, headless Chrome met vaste profielmap):

| # | Naam | Sjabloon | Thema | Taal | Munt | Wat ik aanpaste | Geprint |
|---|------|----------|-------|------|------|-----------------|---------|
| 1 | Handelsgilde Vanderbilt-Zürichstraße & Zonen ☕ Œuvre | leeg | Klassiek | NL | € | 8 straten met lange namen, ß, ë, Œ, emoji; foto in kader (Kerk, Bakker Jansen), foto op hele vak (Havenkade, portret), piepkleine foto (160 px), ander icoon geprobeerd, doosdeksel met foto op "Hele vak", pion met foto, biljet van 50 in roze | Drukkerij-set compleet (incl. geld, 9 onderdelen) en Thuisprint-set zonder geld |
| 2 | Risoplein Ünïcode Œuvre ß 🎲 | leeg | Riso | EN | eigen munt: Ducaten, teken ƒ | straatnamen met Pools, Deens, Frans, Duits (ŻÓŁĆ, ÆRØ, Ça va Où, Kurfürstendamm...), 4 foto's (2 hele vak, 2 in kader), tekstlaag op het doosdeksel | Drukkerij-set en Thuisprint-set, beide zonder geld |
| 3 | Studio Œ – Strakke Straße ✶ № 3 | Bedrijf of team | Strak | NL | € | 4 foto's (twee zwart-wit, twee hele vak), doosdeksel met foto in kader, 3 pionnen met foto (een piepklein), huisregels van 3 regels | Drukkerij-set en Thuisprint-set, beide zonder geld |

Het geld heb ik maar één keer als PDF laten maken (editie 1), zoals afgesproken. Van Riso en Strak heb ik de biljetten dus alleen in de editor gezien.

## Samenvatting

De editor voelt verzorgd. Het bord in de editor is mooi, de drie thema's verschillen echt van elkaar en Riso (met de blauwe misregistratie onder het lint) is het mooist. De tekstdekking is goed: ß, Ł, Ø, Œ, ë en emoji komen allemaal goed in de PDF terecht, en de PDF-lettertypen zijn ingebed. Het grootste probleem zit in de randgevallen waar ik als ontwerper juist op zoek naar ben. Een lange editienaam loopt uit de bandjes: op het regelboekje loopt de titel over de rand (thuisset: afgesneden), op de biljetten loopt de banknaam over de strook en van het biljet af. Daarnaast breken bedragen als "€ 200" op de regel in twee stukken en zijn de PDF's alleen RGB zonder TrimBox of BleedBox. Voor een drukkerij die met een preflight werkt is dat een reden om af te haken. Het printen zelf was snel (30 tot 50 seconden per set).

## Werkt niet (bugs)

1. **Titel in het regelboekje loopt over de pagina-rand**
   - Waar: PDF Spelregelboekje, hoofdstuk 1 "Welkom bij {editienaam}". Drukkerij-set: "Œuvre" steekt over het kader. Thuisprint-set (A4 liggend): de titel wordt afgesneden bij "Œuv".
   - Verwacht: de titel breekt af op twee regels of krimpt.
   - Ernst: hinderlijk (blokkerend als je zo gaat bestellen). Een lange naam is geen vreemd geval, mensen zetten "Familie Van der Meulen-Jansen Kerstspel 2026" in dit veld.
   - Stappen: editie met lange naam maken, Printen, Spelregelboekje maken, pagina 2 openen.
   - Screenshots: `img/ontwerper-noor/20-pdf-regelboekje-titel-over-rand.jpg`, `img/ontwerper-noor/21-pdf-thuis-regelboekje-titel-afgesneden.jpg`.

2. **Banknaam loopt uit de strook op het biljet**
   - Waar: PDF Speelgeld, donkere strook rechts. Met mijn lange naam gaat de witte tekst over de rand van de strook heen en wordt onleesbaar ("Œuvre" in wit op crème, half buiten het biljet). In de editor (tab Geld) zie je het ook.
   - Verwacht: tekst past of wordt afgekort, of de Controle waarschuwt.
   - Ernst: hinderlijk.
   - Screenshots: `img/ontwerper-noor/18-pdf-banknaam-afgesneden.jpg`, `img/ontwerper-noor/09-biljet-banknaam.jpg`, `img/ontwerper-noor/17-pdf-speelgeld.jpg`.

3. **"€ 200" breekt midden in het bedrag**
   - Waar: Kans-kaart 1 in de editor ("Je krijgt € / 200 van de bank") en in het regelboekje ("dan krijg je € / 200 van de bank").
   - Verwacht: een harde spatie tussen teken en getal. Dit is typografie 101.
   - Ernst: klein, maar het staat op elke kaart waar een bedrag in de lopende tekst staat.
   - Screenshot: `img/ontwerper-noor/08-kaart-euro-regelbreuk.jpg`, regelboekje in `img/ontwerper-noor/20-pdf-regelboekje-titel-over-rand.jpg` (pagina 4 in de PDF).

4. **Een eigen tekstlaag op het doosdeksel botst met de vaste tekst, zonder waarschuwing**
   - Waar: Doos, Doosdeksel, "Tekst toevoegen". Mijn tekst ("Nº 1/250 · gedrukt op 120 g") breekt in twee regels en overlapt de ondertitel "A game for 2 to 8 players". De Controle zegt niets.
   - Ernst: klein tot hinderlijk. Je ziet het in de editor wel, maar je kunt de vaste tekst niet verplaatsen of weghalen.
   - Screenshot: `img/ontwerper-noor/24-pdf-riso-deksel-tekstlaag-botst.jpg`.

5. **Piepkleine namen op het bord zonder waarschuwing**
   - Waar: bord, Voorbeeld en PDF. "Burgemeester Johannes van den Bosch-Nieuwenhuizen Laan" staat in vijf regels van ongeveer 4 pt in een vak. In Strak zijn "De vrijdagmiddagborrel" en "De dagelijkse stand-up" ook piepklein. De Controle waarschuwt wel voor lage foto-resolutie, niet voor onleesbare tekst.
   - Ernst: hinderlijk. Een minimale puntgrootte (bijvoorbeeld 5 pt) als Controle-regel lost het op.
   - Screenshots: `img/ontwerper-noor/12-voorbeeld-bord.jpg`, `img/ontwerper-noor/04-lange-straatnaam.jpg`.

6. **Miniatuur van het bord kort de naam af met "…", het grote bord niet**
   - Waar: linkerkolom van de editor (miniatuur) toont "Handelsgilde Vanderbi…", het grote bord en de PDF tonen de volle naam. Klein, maar het ziet er verkeerd uit als je de naam ziet veranderen.
   - Ernst: klein.
   - Screenshot: `img/ontwerper-noor/03-editor-klassiek-lange-naam.jpg`.

7. **Print: "Te veel aanvragen" bij het starten van een set (429)**
   - Waar: Printen, "Thuisprint-set maken" kort na een eerdere run. Twee keer kreeg ik: "Te veel aanvragen. Wacht een minuut en probeer het opnieuw." De tweede keer kreeg ik hem ook na 80 seconden. Er stonden op dat moment meer testers te printen vanaf hetzelfde netwerk, dus dit kan een gedeelde limiet zijn. Het is wel iets om te weten als een gezin of klas via één wifi tegelijk print.
   - Ernst: klein tot hinderlijk. De melding is wel duidelijk.
   - Screenshot: `img/ontwerper-noor/14-te-veel-aanvragen.jpg`.

## UX: wat kan beter

- **Pionnen en foto's**: de foto op een pion is een smalle liggende strook. Mijn portret (gezicht op 37% van de hoogte) werd met de standaarduitsnede precies door het gezicht gesneden, in de editor én in de PDF. Voorstel: bij staande foto's standaard bovenaan uitsnijden, of een vlakje "gezicht" kiezen. Zie `img/ontwerper-noor/19-pdf-pionnen.jpg` en `img/ontwerper-noor/27-pdf-strak-pionnen.jpg`.
- **"Hele vak" op een vak met foto**: de foto komt over het hele vak met een mat wit bandje voor de naam en een donkere verloop voor de prijs. Dat ziet er mooi uit, maar de prijs raakt onderin de foto en je kunt de plaats van de prijs niet kiezen. Zie `img/ontwerper-noor/06-hele-vak-foto.jpg`.
- **Resolutiemelding is goed**: "Resolutie 102 dpi, te laag" bij mijn piepkleine foto werkt en komt ook in de Controle. Zie `img/ontwerper-noor/07-lage-resolutie-waarschuwing.jpg`. Het getal bij een goede foto ("1693 dpi, scherp genoeg") is ook geruststellend, maar bij hele hoge waarden (2540 dpi) mag er een hint komen dat de foto veel te groot is en trager laadt.
- **Icoonkeuze is erg klein**: bij Elektriciteitsbedrijf zijn er maar vijf iconen (kraan, vlam, windmolen, wifi, zonnepaneel). Voor een ontwerper die zijn eigen set wil is "Eigen afbeelding" de enige uitweg. Ik heb die niet geprobeerd. Zie `img/ontwerper-noor/10-icoon-keuze.jpg`.
- **Tekstlaag**: alleen grootte en draaien. Geen lettertype, kleur, uitlijning of regelafstand. Voor een ontwerper is een tekstlaag zonder kleur onbruikbaar op een foto.
- **Hoofdletters en ß**: op de eigendomsbewijzen wordt "Zürichstraße" in hoofdletters "ZÜRICHSTRASSE". Dat is regelgevend correct, maar een ontwerper wil de keuze voor "ẞ" of een optie "geen hoofdletters".
- **Foto's alleen op het bord**: op het eigendomsbewijs van een straat met foto staat geen foto (`img/ontwerper-noor/16-pdf-eigendomsbewijzen.jpg`). Een wens, geen fout.
- **Engelse editie, Nederlandse interface**: de interface blijft Nederlands met Engelse namen in de lijst ("Op bezoek tot Free Parking"). Dat is logisch, maar de printpagina sprong na het kiezen van een Engelse editie wel naar `/en/…` en de bestandsnamen in de ZIP werden Engels. Vooraf had ik dat niet verwacht. Een korte uitleg bij "Taal van bord en kaarten" helpt.
- **Munt Engels**: bij Engels staat de standaardmunt op "M" (de speelgeldmunt) en niet op $. Wie een dollarspel wil, moet de munt zelf wijzigen. De keuze is er wel (€, M, $, £, eigen munt). Zie `img/ontwerper-noor/22-editor-riso.jpg`.
- **Printpagina**: "1 van 9 klaar" telt ook de onderdelen die ik had uitgevinkt. Beter: "1 van 1 klaar".
- **Logo**: in de DOM staat de wordmark als "Prı ntopoly" met een dotloze ı (waarschijnlijk voor de tekening). Een schermlezer of zoekfunctie leest dat gek. Niet getest met een lezer. Klein.

## Ontwerp

Wat mooi is:
- De drie thema's zijn echt verschillend. Riso (roze vlak, magenta lint met blauwe schaduw, roze kaders) is het sterkst: `img/ontwerper-noor/22-editor-riso.jpg`, `img/ontwerper-noor/23-pdf-riso-kaarten.jpg`. Strak (zwart lint, wit bord, grijze kaarten) is netjes en rustig: `img/ontwerper-noor/25-editor-strak.jpg`, `img/ontwerper-noor/26-pdf-strak-bord.jpg`.
- Biljetten: de guilloche, de hoekvakken met sleutel en huisje en de ovale cartouche lijken echt op een speelgeldbiljet. Kleur kiezen werkt goed, de inkt wordt automatisch donkerder: `img/ontwerper-noor/17-pdf-speelgeld.jpg`.
- Typografie: de koppen (League Spartan) en Instrument Sans lezen prettig. Het koppelen van "ÆRØ NÆSBY ØSTER" en "ŻÓŁĆ GĘŚLĄ JAŹŃ" in hoofdletters ging goed. De uitlijning van prijzen op de eigendomsbewijzen is netjes rechts.
- De thuisprint-set heeft een uitlijntest voor voor- en achterzijde, met haarkruisen en een schaaltje van 5 mm.: `img/ontwerper-noor/28-pdf-thuis-uitlijntest-en-achterkanten.jpg`.
- De landingspagina is levendig en past bij "keukentafel": `img/ontwerper-noor/01-landing.jpg`. De pagina "Nieuwe editie" met drie sjablonen en een live voorbeeld ook: `img/ontwerper-noor/02-nieuwe-editie.jpg`.

Wat minder goed is:
- Alle PDF's zijn RGB met ICC (Skia/Chromium als maker). Geen CMYK, geen TrimBox of BleedBox: elke box staat op de volle mediabox, ook bij de drukkerij-set met 3 mm afloop. De drukkerij moet dus op de paginagrootte vertrouwen. Dat is voor vinylstickers oké, voor een kaartenset niet.
- Het bord en de kaarten in de drukkerij-set hebben afloop maar geen snijtekens. Bij het speelgeld staan snijtekens, maar een daarvan overlapt de kop "Speelgeld: € 1" (`img/ontwerper-noor/18-pdf-banknaam-afgesneden.jpg`). Bij de pionnen lopen de snijtekens in het vlak van de volgende pion: `img/ontwerper-noor/19-pdf-pionnen.jpg`.
- Het buitenste randlijntje van het bord valt in de afloop (op 150 dpi zit hij ongeveer 2 mm van de rand), dus na het snijden ontbreekt de omlijsting.
- Doosdeksel met een foto: de naam komt op een vlak grijs bandje midden onderin. Dat voelt als een standaardfilter. Zie `img/ontwerper-noor/11-doosdeksel-foto-editor.jpg` en de PDF (`img/ontwerper-noor/24-pdf-riso-deksel-tekstlaag-botst.jpg` voor Riso, ongewijzigd voor Klassiek).
- Emoji in een naam (☕ 🎲 🌳) komen als kleine grijze plaatjes in het lint en in de straatnamen en passen niet bij het platte ontwerp. In de PDF zijn ze ingebed als kleur-emoji (Noto Color Emoji). Het werkt, maar ziet er in zwart-wit of Riso vreemd uit.
- Voor- en achterkant van de kaarten in Strak hebben verschillend kader: voorkant geen kader, achterkant wel. Waarschijnlijk bedoeld, maar het valt op.

## Features die ik zou willen

- **TrimBox, BleedBox en een PDF/X-3 of CMYK-optie** voor de drukkerij-set. Must voor mijn type gebruiker.
- **Preflight in de Controle**: tekst onder 5 pt, tekst die uit zijn vlak loopt (regelboekje, biljet), lange editienaam. Must.
- **Harde spatie tussen valuta en getal** overal, en geen regelbreuk binnen een bedrag. Must (klein werk, groot effect).
- **Tekstlaag met kleur, lettertype (3 tot 5 keuzes), uitlijning**. Must voor wie met foto's werkt.
- **Eigen kleurpalet per editie** (groepskleuren zijn er al, maar ik wil Pantone-achtige waarden of CMYK invullen). Nice.
- **Foto op het eigendomsbewijs** (zelfde foto als op het vak). Nice.
- **Meer iconen** voor stations en nutsbedrijven, of een zoekbare set. Nice.
- **Bleed-voorbeeld in de editor** (aan/uit): toon de afloop en de snijlijn over het ontwerp. Nice.
- **Optie "ẞ" in hoofdletters** en een schakelaar "geen hoofdletters" op de eigendomsbewijzen. Nice.
- **Pantone/spotkleur voor de Riso-druk** (aparte laag per kleur voor een echte risograaf, dus vooral in het Riso-thema). Nice, maar dan zou dit thema pas echt een USP zijn.
- **PDF per onderdeel op 300 dpi ook als losse PNG-proef** om te kunnen controleren zonder te printen. Nice.

## Wat goed werkte

- Snel: de volledige drukkerij-set (met geld) in 50 s, thuisprint-set in 30 tot 40 s.
- Alle bijzondere tekens kwamen goed door (ß, ë, Ł, Ø, Œ, №, ƒ, emoji). Eigen munt (Ducaten, ƒ) werkt overal, ook in de hypotheektekst ("ƒ 33").
- Foto's: In kader en Hele vak, zwart-wit, kwartslag draaien en de resolutiemelding werken. Lage resolutie wordt echt gesignaleerd.
- Bewaren in de browser: de drie edities bleven staan tussen de scripts door.
- Nederlandse en Engelse teksten in de PDF's lezen prettig; de regelboekjes zijn netjes opgemaakt.
