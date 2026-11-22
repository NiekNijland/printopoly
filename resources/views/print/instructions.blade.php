<!DOCTYPE html>
<html lang="{{ $locale }}">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
        <title>{{ $title }}</title>
        <style>
            @page { size: 210mm 297mm; margin: 0; }
            html, body { margin: 0; padding: 0; }
            body {
                box-sizing: border-box;
                width: 210mm;
                padding: 18mm 20mm;
                font-family: 'Instrument Sans', 'Helvetica Neue', Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.45;
                color: #1b1f24;
            }
            h1 { font-size: 24pt; line-height: 1.1; margin: 0 0 8mm; }
            h2 { font-size: 15pt; margin: 8mm 0 3mm; }
            p, ol, ul { margin: 0 0 4mm; }
            li { margin-bottom: 1.5mm; }
            /* The order sheet (B185): one table per part, kept on one page. */
            table { width: 100%; border-collapse: collapse; margin: 0 0 5mm; font-size: 10pt; break-inside: avoid; }
            th, td { text-align: left; vertical-align: top; padding: 1.4mm 2mm; border-bottom: 0.25mm solid #c9c4b8; }
            th { font-weight: 700; border-bottom: 0.5mm solid #1b1f24; }
            td:first-child { width: 34%; font-weight: 600; }
            h2 { break-after: avoid; }
        </style>
    </head>
    <body>
        {!! $body !!}
    </body>
</html>
