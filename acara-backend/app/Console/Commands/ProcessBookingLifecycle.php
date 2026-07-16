<?php

namespace App\Console\Commands;

use App\Services\BookingLifecycleService;
use Illuminate\Console\Command;

class ProcessBookingLifecycle extends Command
{
    protected $signature = 'bookings:process-lifecycle';

    protected $description = 'Send pending booking reminders and expire requests past their response deadline';

    public function handle(BookingLifecycleService $lifecycle): int
    {
        $result = $lifecycle->process();

        $this->info("Expired booking requests: {$result['expired']}");
        $this->info("Response reminders sent: {$result['reminded']}");

        return self::SUCCESS;
    }
}
