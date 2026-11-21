# Mobiel: bevindingen en fixes

Gecontroleerd op 21 november 2026 als telefoongebruiker op 375 en 390 px (en 414 en 768 px na de fixes), lokaal en op basis van de productiecode. Ernst: A = onbruikbaar, B = hinderlijk, C = klein.

De opzet volgt B73, B86 en B93: bordoverzicht, tik op een vak, dan het elementscherm met voorbeeld boven en velden eronder, met een vaste actiebalk onderin. Dat bestond al. Dit document beschrijft wat daar nog stuk of onhandig aan was. Per B138 staan acties niet als losse knoppen in de kop, maar in één Meer-menu.

| # | Wat | Waar | Ernst | Status |
| --- | --- | --- | --- | --- |
| 1 | "Voorbeeld" was op een telefoon niet te bereiken (alleen een knop in de brede kop) | Editorkop | A | Opgelost: Meer-menu |
| 2 | "Instellingen" alleen via de editienaam, "Woorden" alleen via een tekstlink, "Samen maken" alleen via de kaart in het overzicht | Editorkop | B | Opgelost: alles in het Meer-menu (Voorbeeld, Woorden, Instellingen, Samen maken, Printen) |
| 3 | Dialogen hadden geen sluitknop; sluiten kon alleen onderaan na 2200 px scrollen (Escape bestaat niet op een telefoon) | Alle dialogen, vooral Instellingen | A | Opgelost: vaste sluitknop van 44 px rechtsboven, minder padding, hoogte `100dvh - 32px` |
| 4 | Dialogen zetten direct het toetsenbord open (autofocus op eerste veld) en dekten de inhoud af | Instellingen en andere | B | Opgelost: geen autofocus bij aanraking |
| 5 | Mini-bord (27 px per vak) te klein om te tikken | Bordoverzicht | A | Opgelost: knop "Bord vergroten" (230 %, veegbaar); de lijst eronder blijft de snelle route; op 768 px is het bord groter |
| 6 | Voorbeeld van het element nam 48 % van het scherm, velden kregen 286 px | Elementscherm | A | Opgelost: 40 % met min en max; velden krijgen ca. 360 px |
| 7 | Toetsenbord dekte het veld af; schaal volgde `dvh` niet | Elementscherm | A | Opgelost: `useVisualViewport` zet de hoogte van de schil op het zichtbare deel, verbergt het voorbeeld zolang het toetsenbord open is en scrollt het veld in beeld |
| 8 | Foto-knoppen ("Foto toevoegen" en "Foto plakken") liepen over de rand | Veldenpaneel, midden-achtergrond | A | Opgelost: knoppen mogen omslaan, minder padding onder 400 px |
| 9 | Controle-paneel had geen maximale hoogte en geen scroll bij veel meldingen | Controle | A | Opgelost |
| 10 | Actiebalk onderin hield geen rekening met de veilige rand (home-balk iPhone) | Actiebalk | B | Opgelost: `env(safe-area-inset-*)` |
| 11 | "Opgeslagen"-melding viel over de actiebalk | Editor | C | Opgelost: hoger op telefoon |
| 12 | Kaartentegels vier per rij (80 px, tekst afgekapt) | Lijst Kaarten | C | Opgelost: drie per rij onder 480 px |
| 13 | Samenvattingen van veelgestelde vragen 32 px hoog | Landing, Vragen | C | Opgelost: 44 px |
| 14 | In het elementscherm is "Printen" niet zichtbaar in de balk | Actiebalk | C | Opgelost via het Meer-menu; de balk houdt vorige/volgende |

## Wat in orde is

Geen horizontale overflow op landing, menu, Mijn edities, Nieuwe editie (incl. sjablonen), voorbeeldeditie, printgids, vragen, contact, privacy en de printpagina op 375 en 390 px. Wisselen heeft de knop "Wisselen met…" naast slepen (lang indrukken). Het voorbeeldscherm heeft een zoomknop.

## Niet te testen in deze omgeving

Echt toetsenbord, knijpen op een foto en de fotokiezer van iOS. De logica (visualViewport, `touch-none` op het podium) is wel aangepast of bestond al; Niek moet dit op een echte telefoon bekijken.
