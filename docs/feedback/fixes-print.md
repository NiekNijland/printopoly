# Printfixes na testronde 1 (eerste ronde, onder tijdsdruk)

Gedaan, elk met een test:
- Eigendomsbewijzen in de kaarten-PDF gebruiken de naam van het vak uit de editie. De kaarten-job kreeg alleen `deed.*`-elementen mee; nu krijgt hij ook de naam van elk `space.*`-element (`PrintEditionData::elementsFor`). De miniatuur op de printpagina toont de eigen naam.
- Meer dan 20 foto's: de browser stuurt foto's in groepen van 10. De eerste groep gaat mee met de job (`partial=1`), de rest naar `POST /api/print/{token}/photos`, voordat de run start. Daardoor hangt het niet meer af van `max_file_uploads` in PHP. Productie hoeft niet te veranderen.
- Printpagina: na "Thuisprint-set maken" opent de tab van die set (`?set=`). Foutteksten onderscheiden 429 (wacht een minuut), 422 (foto ontbreekt of onleesbaar), bezet en serverfout.
- Standaard Kans- en Algemeen Fonds-teksten die een vak noemen gebruiken de hernoemde naam (gedeelde `resolveEdition`, dus editor en print kloppen).

Niet gedaan (volgende ronde):
- ZIP-knop alleen "klaar" als de ZIP er echt is; API-foutmeldingen in de sitetaal; "Alles opnieuw proberen" en twee onderdelen tegelijk opnieuw proberen.
- Plaatsingsoverzicht en paneelletters A/B/C/D voor het bord, titel in het midden, thuisinstructies in de thuis-ZIP.
- Instructie-PDF's in huisstijl en juiste kaartaantallen.
- Riso (en andere thema's) op eigendomsbewijzen, biljetten en kaarten in print.
- Pionnen zonder foto (initiaal) en de veilige zone van de doosdekselfoto.
- PDF's niet visueel gerenderd in deze ronde.
