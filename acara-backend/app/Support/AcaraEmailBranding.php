<?php

namespace App\Support;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Part\DataPart;

final class AcaraEmailBranding
{
    private const LOGO_CONTENT_ID = 'acara-logo@acara';

    public static function addLogo(MailMessage $message): MailMessage
    {
        $logoPath = resource_path('images/acara-logo.png');

        if (! is_file($logoPath)) {
            return $message;
        }

        $message->line(new HtmlString(
            '<div style="text-align: center; margin-bottom: 20px;">'
            .'<img src="cid:'.self::LOGO_CONTENT_ID.'" alt="ACARA" style="display: inline-block; max-width: 150px; height: auto;">'
            .'</div>'
        ));

        return $message->withSymfonyMessage(static function (Email $email) use ($logoPath): void {
            $email->addPart(
                DataPart::fromPath($logoPath, 'acara-logo.png', 'image/png')
                    ->asInline()
                    ->setContentId(self::LOGO_CONTENT_ID)
            );
        });
    }
}
