<?php

namespace Tests\Unit;

use App\Support\AcaraEmailBranding;
use Illuminate\Notifications\Messages\MailMessage;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class AcaraEmailBrandingTest extends TestCase
{
    public function test_it_embeds_the_acara_logo_using_a_content_id(): void
    {
        $message = AcaraEmailBranding::addLogo(new MailMessage);

        $this->assertCount(1, $message->introLines);
        $this->assertStringContainsString(
            'src="cid:acara-logo@acara"',
            (string) $message->introLines[0],
        );
        $this->assertStringContainsString(
            'src="cid:acara-logo@acara"',
            (string) $message->render(),
        );
        $this->assertCount(1, $message->callbacks);

        $email = new Email;
        ($message->callbacks[0])($email);

        $this->assertCount(1, $email->getAttachments());

        $logo = $email->getAttachments()[0];

        $this->assertSame('acara-logo.png', $logo->getFilename());
        $this->assertSame('image/png', $logo->getContentType());
        $this->assertSame('inline', $logo->getDisposition());
        $this->assertSame('acara-logo@acara', $logo->getContentId());
    }
}
