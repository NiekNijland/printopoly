# Designcheck

Ronde 1, 20 november. Elke pagina van de lokale app (main, Sail op poort 8090) staat naast het ontwerpbestand in `docs/design/`. De ontwerpbestanden openen lokaal met `docs/design/support.js`: start `python3 -m http.server 8765` in `docs/design` en open bijvoorbeeld `http://127.0.0.1:8765/Main.dc.html`.

Niet te zien zonder Google-gegevens in de lokale `.env`: de knop "Inloggen met Google" en de inlogbanners. Die ontbreken lokaal dus terecht.

## Landing (`/nl`, Main.dc.html)

Komt goed overeen: hero, stappen, sets, bordsticker, vragen en footer.

- Midden van het bord: in het design staat de editienaam groot en diagonaal (B89). In de app is de naam klein en horizontaal, en de twee kaartvakken nemen de diagonaal in.
- De waaier kaarten valt rechts deels over het bord heen en het eigendomsbewijs dekt de Algemeen Fonds-kaart grotendeels af. In het design waaieren ze netjes uit.
- De links "Wat je bestelt" en "Hoe je het print" zijn in het design onderstreept, in de app niet.
- De contentkolom is iets smaller dan in het design (kleine afwijking).

## Printgids (`/nl/printgids`, Printgids.dc.html)

Wijkt flink af.

- In het design heeft elk onderdeel twee kolommen naast elkaar, "Bij de drukkerij" en "Thuis", elk met een korte tekst en een mono-regel met maten. In de app is het één lange tekstkolom.
- In het design staan bij Bord vier kleine illustraties van het plakken (stappen 1 tot 4). Die ontbreken.
- De inhoudsopgave links is in het design onderstreept.
- De tekst in de app is veel langer dan in het design. De inhoud komt uit `resources/content/nl/printgids.md` en dat mag zo blijven, maar de opmaak per onderdeel moet het design volgen.

## Nieuwe editie (`/nl/editions/new`, Nieuwe-editie.dc.html)

Komt goed overeen.

- De drie themaminiaturen zien er in de app hetzelfde uit (alle drie groen met dezelfde kaarten). In het design is Klassiek groen, Riso roze en Strak wit, en zie je het verschil meteen.
- Het gekozen thema heeft in het design een rode rand en een rood "gekozen". In de app is dat grijs.
- De selectievakjes zijn in het design rood (accent), in de app zwart.

## Editor, bord (`/nl/editor/{id}`, Editor.dc.html)

- Het gekozen element in de focusweergave is veel te groot. Het vult de hele hoogte en valt onderaan van het scherm. In het design staat het op een rustige maat met ruimte eromheen. Het moet passen in de beschikbare breedte en hoogte.
- De lay-outkeuze is in het design drie tegels met een miniatuur (Foto in kader, Foto over het hele vak, Alleen tekst). In de app zijn het platte tekstknoppen.
- De lijst per bordzijde heeft in het design per rij een kleurvakje (straatkleur), een stip bij aangepaste vakken en een waarschuwingsteken. In de app staan alleen namen.
- De kopjes per bordzijde ("Start tot Op bezoek") zijn in de app in hoofdletters met een ander woord ("Start tot gevangenis (op bezoek)"). Het design gebruikt gewone letters.

## Editor, kaarten (Editor-kaarten.dc.html)

- Zelfde probleem als bij het bord, maar erger: de kaart wordt zo groot dat de bovenkant ("Kans") buiten beeld valt.
- In het design staan boven de kaart de knoppen "Voorkant / Achterkant".
- De kaarttegels in de zijbalk zijn in het design lichtcyaan (Kans) en lichtmagenta (Algemeen Fonds), met een stip of waarschuwing. In de app zijn ze wit.
- In het veldpaneel toont het design de standaardtekst in een grijs blok met "Terugzetten" erbij.

## Telefoon: bord (Mobiel-bord.dc.html)

Komt redelijk overeen.

- In het midden van het bord staat "Midden". In het design staat daar de editienaam, diagonaal.
- De lijst mist dezelfde kleurvakjes en stippen als op desktop.
- De tabs zijn in het design één gesegmenteerde balk met Bord, Kaarten, Geld en Doos. In de app zijn het losse knoppen met tellers.

## Mijn edities (`/nl/editions`, Mijn-edities.dc.html)

Komt goed overeen. De inlogbanner ontbreekt lokaal omdat Google niet is ingesteld.

## Nog te doen in ronde 2

Editor-geld, Editor-doos, Staten, Download en de telefoonversies van landing, edities en printen. Die check doe ik zodra de printpipeline en de ontbrekende editoronderdelen op main staan, samen met de functionele test.
