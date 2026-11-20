<x-mail::message>
# Je Printopoly-account wordt verwijderd

Hoi {{ $name }},

je bent al bijna twee jaar niet ingelogd op Printopoly. Daarom verwijderen we je account op {{ $date }}, met alles erin: je edities, geüploade foto's en gemaakte PDF's.

Wil je alles houden? Log voor die datum één keer in. Dan begint de termijn opnieuw en blijft alles staan.

<x-mail::button :url="$loginUrl">
Inloggen
</x-mail::button>

Heb je je account niet meer nodig? Dan hoef je niets te doen.

Groet,<br>
Printopoly
</x-mail::message>
