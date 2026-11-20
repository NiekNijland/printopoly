# Beslissingen

Append-only. Wijzig een besluit met een nieuwe rij en "Vervangt Bxx". Herkomst: Niek, Niek (gedelegeerd), Claude (afgeleid uit Niek-Decision-Preferences), Claude op verzoek.

| # | Besluit | Reden | Herkomst |
| --- | --- | --- | --- |
| B1 | Stack is gelijk aan murdoku-generator: Laravel 13, React starter kit met Inertia, TypeScript, Tailwind 4, shadcn/ui, spatie/laravel-data met TS-transformer. | Hergebruik wat er is; dezelfde tooling, CI en gewoontes als het andere hobbyproject. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B2 | Eén renderer: React-componenten tekenen in millimeters en worden zowel in de editor als op de print-route gebruikt. | Voorbeeld en print kunnen dan niet uit elkaar lopen; één patroon overal. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B3 | PDF's maakt headless Chromium via `spatie/laravel-pdf` (Browsershot-driver) in een queue-job. | Framework-pakket in plaats van eigen machinerie; Chromium kan CSS `@page`, mm-maten en echte fonts. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B4 | Maten komen uit een bordprofiel (buitenmaat, hoekvak, vouwlijnen, kaartmaten) met presets plus eigen opgemeten profielen. | Edities verschillen een paar millimeter; niets hardcoderen wat inhoud is. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B5 | Elk printonderdeel krijgt 3 mm afloop en snijtekens buiten het beeld; stickers voor bestaande kaarten zijn 1 mm kleiner dan de kaart. | Standaard bij drukkerijen; voorkomt witte randen en loslatende hoeken. | Claude (detail) |
| B6 | Drukkerij-panelen eindigen 1 mm vóór elke vouwlijn. | Een sticker over de vouw scheurt of kreukt. | Claude (detail) |
| B7 | Thuisprint van het bord gaat per vakje als losse sticker; het midden in stukken langs de vouwlijnen. | Naden vallen op bestaande lijnen in plaats van midden in een afbeelding; kleine stickers plakken makkelijker recht. | Claude (detail) |
| B8 | Losse kaarten zijn vouwkaarten (voor- en achterkant naast elkaar); daarnaast een dubbelzijdige drukkerijvariant. | Dubbelzijdig printen verschuift op bijna elke thuisprinter. | Claude (detail) |
| B9 | Fotokwaliteit: doel 300 dpi op printformaat, waarschuwing onder 150 dpi, met de naam van het vakje erbij. | Eerlijk tonen wat er is; namen in waarschuwingen. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B10 | Tekst krimpt automatisch tot een minimum lettergrootte; daaronder een waarschuwing in plaats van stil afkappen. | Geen stille fallback. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B11 | Elk downloadpakket bevat een kalibratiepagina met een liniaal van 100 mm en een instructie-PDF. | Schalen door de printer is de meest voorkomende fout. | Claude (detail) |
| B12 | Na het genereren leest een controle elke PDF terug (paginaformaat, aantal pagina's) en faalt hard bij afwijking. | Een verkeerde schaal merk je pas na het plakken; liever hard falen. | Claude (detail) |
| B13 | De vaste spelgegevens (posities, prijzen, huren, standaardkaarten) staan in een seeder als standaardeditie; een nieuwe editie is een kopie. | Database-driven inhoud, geen spelgegevens verspreid door de code. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B14 | Eén knop "Downloaden" geeft alles in één ZIP; geen keuzematrix per onderdeel. | Simpel in bediening: veel functionaliteit, weinig knoppen. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B15 | Een editie kun je dupliceren en wordt automatisch opgeslagen. | Het doel is "vaker doen"; een vorige editie is het beste startpunt. | Claude (detail) |
| B16 | Interface en plannen in het Nederlands, code en technische namen in het Engels. Geen andere talen. | Huisregel; de doelgroep is Nederlands. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B17 | Eigen vormgeving; geen artwork, logo of lettertype van Hasbro namaken. | Merkrecht, en het eigen ontwerp is het punt van een eigen editie. | Claude (afgeleid uit murdoku-generator README) |
| B18 | Drukkerij-PDF's zijn RGB met afloop; een kleurprofiel-conversie komt pas als een proefdruk laat zien dat het nodig is. | Meten vóór optimaliseren; de gangbare online drukkerijen accepteren RGB. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B19 | Testen: unit tests op geometrie, imposition en standaardgegevens; PDF-tests op paginaformaat; visuele regressie op een referentie-editie. | Een test die niet kan falen telt niet; de print is het product. | Claude (afgeleid uit Niek-Decision-Preferences) |
| B20 | Geen deadlines, schattingen of prioriteiten in de plannen. | "Dit is aan mij." | Claude (afgeleid uit Niek-Decision-Preferences) |
