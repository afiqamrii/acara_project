<?php

namespace App\Console\Commands;

use App\Services\BookingLifecycleService;
use Illuminate\Console\Command;

class ProcessBookingLifecycle extends Command
{
    protected $signature = 'bookings:process-lifecycle';

    protected $description = 'Process booking request and completion response deadlines';

    public function handle(BookingLifecycleService $lifecycle): int
    {
        $result = $lifecycle->process();

        $this->info("Expired booking requests: {$result['expired']}");
        $this->info("Response reminders sent: {$result['reminded']}");
        $this->info("Completions confirmed automatically: {$result['completions_auto_confirmed']}");
        $this->info("Completion reminders sent: {$result['completion_reminders']}");

        return self::SUCCESS;
    }
}
