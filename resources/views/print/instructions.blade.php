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
        </style>
    </head>
    <body>
        {!! $body !!}
    </body>
</html>
