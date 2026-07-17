<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\PasswordChangedEmail;
use App\Notifications\PasswordResetEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_MESSAGE = 'If an account exists for this email, a password reset link has been sent.';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('app.frontend_url', 'http://localhost:5173');
        config()->set('acara.security_email.mailer', 'resend');
        config()->set('acara.security_email.queue_connection', 'database');
        config()->set('acara.security_email.queue', 'emails');
    }

    public function test_known_and_unknown_emails_receive_the_same_forgot_password_response(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'member@example.test']);

        $knownResponse = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);
        $unknownResponse = $this->postJson('/api/forgot-password', [
            'email' => 'unknown@example.test',
        ]);

        $knownResponse->assertOk()->assertJsonPath('message', self::GENERIC_MESSAGE);
        $unknownResponse->assertOk()->assertJsonPath('message', self::GENERIC_MESSAGE);

        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'unknown@example.test']);

        Notification::assertSentTo(
            $user,
            PasswordResetEmail::class,
            function (PasswordResetEmail $notification) use ($user): bool {
                $mail = $notification->toMail($user);

                return $mail->subject === 'Reset your ACARA password'
                    && str_starts_with($mail->actionUrl, 'http://localhost:5173/reset-password?')
                    && str_contains($mail->actionUrl, 'email=member%40example.test');
            },
        );
        Notification::assertCount(1);
    }

    public function test_valid_single_use_token_resets_password_revokes_sessions_and_preserves_account_state(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create([
            'email' => 'suspended@example.test',
            'status' => 'suspended',
            'profile_completed' => false,
            'password' => Hash::make('OldPassword!2'),
        ]);
        $user->createToken('browser-session');
        $user->createToken('mobile-session');
        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewSecure!42',
            'password_confirmation' => 'NewSecure!42',
        ]);

        $response->assertOk()->assertJsonPath(
            'message',
            'Password reset successfully. You can now sign in with your new password.',
        );

        $user->refresh();
        $this->assertTrue(Hash::check('NewSecure!42', $user->password));
        $this->assertFalse(Hash::check('OldPassword!2', $user->password));
        $this->assertNull($user->email_verified_at);
        $this->assertSame('suspended', $user->status);
        $this->assertFalse($user->profile_completed);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        Notification::assertSentTo($user, PasswordChangedEmail::class);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'AnotherSecure!42',
            'password_confirmation' => 'AnotherSecure!42',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');
    }

    public function test_invalid_token_does_not_change_the_password(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'password' => Hash::make('OldPassword!2'),
        ]);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => 'not-a-valid-token',
            'password' => 'NewSecure!42',
            'password_confirmation' => 'NewSecure!42',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('token');

        $this->assertTrue(Hash::check('OldPassword!2', $user->fresh()->password));
        Notification::assertNothingSent();
    }

    public function test_reset_requires_a_strong_confirmed_password(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'weakpass',
            'password_confirmation' => 'different',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
    }
}
