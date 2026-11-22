---
title: Order sheet
description: Everything the print shop needs to know about the print-shop set of your Printopoly edition.
---

# Order sheet: {edition_name}

Hand this sheet to the print shop, or copy the lines into their order form. For each part it says what to order, at what size and how to cut it.

{if:copies_many}Number of sets: {copies}. The quantities below are for one set.

| For every part |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| Colour         | RGB (sRGB). Converting to CMYK is fine.                                  |
| Scaling        | Do not scale, everything is at actual size.                              |
| Bleed          | 3 mm on every side, where a part has bleed.                              |
| Crop marks     | Outside the bleed, in the margin of the page.                            |
| Trim           | Every page with bleed has a TrimBox (final size) and a BleedBox (bleed). |

{part:board}

## Board ({file})

|               |                                                                       |
| ------------- | --------------------------------------------------------------------- |
| Product       | Custom vinyl sticker, white, matte laminated, repositionable adhesive |
| Quantity      | {panels} pieces, each on its own page                                 |
| Final size    | {panel_w} × {panel_h} mm                                              |
| With bleed    | {bleed_w} × {bleed_h} mm                                              |
| PDF page size | {pdf_w} × {pdf_h} mm, with crop marks                                 |
| Printing      | One side                                                              |
| Corners       | Square                                                                |
| Cutting       | Straight on the crop marks (TrimBox), no contour cut                  |

{part:cards}

## Cards and deeds ({file})

|               |                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Product       | Playing cards with a custom design per card                                                                                         |
| Quantity      | {cards} cards, {pdf_pages} pages                                                                                                    |
| Final size    | 63 × 88 mm                                                                                                                          |
| With bleed    | 69 × 94 mm                                                                                                                          |
| PDF page size | {pdf_w} × {pdf_h} mm, with crop marks                                                                                               |
| Paper         | 350 gsm, matte                                                                                                                      |
| Printing      | Both sides. Fronts and backs alternate: page 1 is the front of card 1, page 2 its back. Both are upright, so flip on the long edge. |
| Corners       | Rounded, 3 mm radius                                                                                                                |
| Cutting       | On the crop marks (TrimBox). Do not change the page order.                                                                          |

{part:money}

## Play money ({file})

|                      |                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product              | Loose sheets, cut                                                                                              |
| Quantity             | {sheets} sheets of SRA3 (320 × 450 mm), {notes} notes                                                          |
| Final size of a note | 130 × 60 mm                                                                                                    |
| Paper                | 90 to 120 gsm, uncoated or lightly coated                                                                      |
| Printing             | One side                                                                                                       |
| Corners              | Square                                                                                                         |
| Cutting              | On the crop marks                                                                                              |
| Bleed                | None. Every note has its own border, so the PDF has no TrimBox. A preflight warning about that can be ignored. |

{part:tokens}

## Tokens ({file})

|          |                                                                           |
| -------- | ------------------------------------------------------------------------- |
| Product  | Loose sheet, cut and scored                                               |
| Quantity | {pdf_pages} sheet of A4                                                   |
| Paper    | 350 gsm card                                                              |
| Printing | One side                                                                  |
| Cutting  | On the crop marks. Scoring the fold lines is welcome; the customer folds. |
| Bleed    | None, so no TrimBox in the PDF.                                           |

{part:box_lid}

## Box lid ({file})

|               |                                       |
| ------------- | ------------------------------------- |
| Product       | Custom vinyl sticker, matte           |
| Quantity      | 1 piece                               |
| Final size    | {lid_w} × {lid_h} mm                  |
| With bleed    | {lid_bleed_w} × {lid_bleed_h} mm      |
| PDF page size | {pdf_w} × {pdf_h} mm, with crop marks |
| Printing      | One side                              |
| Corners       | Square                                |
| Cutting       | Straight on the crop marks (TrimBox)  |

{part:rules_booklet}

## Rules booklet ({file})

|               |                                                               |
| ------------- | ------------------------------------------------------------- |
| Product       | Saddle-stitched booklet                                       |
| Quantity      | 16 pages, single pages in reading order                       |
| Final size    | A5 (148 × 210 mm)                                             |
| With bleed    | 154 × 216 mm                                                  |
| PDF page size | {pdf_w} × {pdf_h} mm, with crop marks                         |
| Paper         | 120 to 170 gsm                                                |
| Printing      | Both sides                                                    |
| Finishing     | Two staples in the spine. The print shop does the imposition. |

{part:fold_models}

## Houses and hotels ({file})

|          |                                    |
| -------- | ---------------------------------- |
| Product  | Loose sheets, no cutting           |
| Quantity | {pdf_pages} sheets of A4           |
| Paper    | 160 to 200 gsm                     |
| Printing | One side                           |
| Bleed    | None. The customer cuts and folds. |

{part:dice}

## Dice ({file})

|          |                                    |
| -------- | ---------------------------------- |
| Product  | Loose sheet, no cutting            |
| Quantity | 1 sheet of A4                      |
| Paper    | 160 to 200 gsm                     |
| Printing | One side                           |
| Bleed    | None. The customer cuts and folds. |

{part:invitation}

## Invitation ({file})

|               |                                       |
| ------------- | ------------------------------------- |
| Product       | Card                                  |
| Quantity      | 1 design, as many as you like         |
| Final size    | A6 (105 × 148 mm)                     |
| With bleed    | 111 × 154 mm                          |
| PDF page size | {pdf_w} × {pdf_h} mm, with crop marks |
| Paper         | 300 gsm                               |
| Printing      | One side                              |
| Cutting       | On the crop marks (TrimBox)           |
