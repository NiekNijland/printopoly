<x-mail::message>
# Your Printopoly account will be deleted

Hi {{ $name }},

you have not logged in to Printopoly for almost two years. So we will delete your account on {{ $date }}, with everything in it: your editions, uploaded photos and generated PDFs.

Want to keep it all? Log in once before that date. The period starts again and everything stays.

<x-mail::button :url="$loginUrl">
Log in
</x-mail::button>

If you no longer need your account, you do not have to do anything.

Regards,<br>
Printopoly
</x-mail::message>
