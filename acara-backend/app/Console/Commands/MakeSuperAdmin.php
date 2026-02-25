<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MakeSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Usage:
     * php artisan user:make-super-admin email@example.com --name="Owner Name"
     */
    protected $signature = 'user:make-super-admin
                            {email : Email for the super admin account}
                            {--name= : Display name for the account}
                            {--password= : Password to set (omit to auto-generate for new users)}
                            {--verify-email : Mark email as verified}';

    /**
     * The console command description.
     */
    protected $description = 'Create or promote a user to super_admin';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $nameOption = $this->option('name');
        $passwordOption = $this->option('password');
        $verifyEmail = (bool) $this->option('verify-email');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email format.');
            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();
        $isNew = $user === null;
        $generatedPassword = null;

        if ($isNew) {
            $name = is_string($nameOption) && trim($nameOption) !== ''
                ? trim($nameOption)
                : 'Super Admin';

            $password = is_string($passwordOption) && trim($passwordOption) !== ''
                ? trim($passwordOption)
                : Str::random(16) . '!A1';

            if (!is_string($passwordOption) || trim($passwordOption) === '') {
                $generatedPassword = $password;
            }

            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'role' => 'super_admin',
                'phone_number' => null,
                'status' => 'active',
                'profile_completed' => true,
                'email_verified_at' => $verifyEmail ? now() : null,
            ]);

            $this->info("Created new super admin: {$user->email}");
        } else {
            $updates = [
                'role' => 'super_admin',
                'status' => 'active',
                'profile_completed' => true,
            ];

            if (is_string($nameOption) && trim($nameOption) !== '') {
                $updates['name'] = trim($nameOption);
            }

            if (is_string($passwordOption) && trim($passwordOption) !== '') {
                $updates['password'] = Hash::make(trim($passwordOption));
            }

            if ($verifyEmail) {
                $updates['email_verified_at'] = now();
            }

            $user->update($updates);
            $this->info("Promoted existing user to super admin: {$user->email}");
        }

        $this->line('Role: super_admin');
        $this->line('Status: active');
        $this->line('Profile completed: true');
        $this->line('Email verified: ' . ($user->email_verified_at ? 'yes' : 'no'));

        if ($generatedPassword !== null) {
            $this->newLine();
            $this->warn('Temporary generated password (store this now):');
            $this->line($generatedPassword);
            $this->line('Use --password=... if you want to set a specific password.');
        }

        return self::SUCCESS;
    }
}
