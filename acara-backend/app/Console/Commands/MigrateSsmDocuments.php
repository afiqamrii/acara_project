<?php

namespace App\Console\Commands;

use App\Services\VendorSsmDocumentStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateSsmDocuments extends Command
{
    protected $signature = 'ssm-documents:migrate
        {--from=public : Source filesystem disk}
        {--to= : Destination filesystem disk; defaults to SSM_DOCUMENTS_DISK}
        {--delete-source : Delete each source object after a successful copy}';

    protected $description = 'Copy legacy SSM documents into the configured private document storage disk';

    public function handle(VendorSsmDocumentStorage $documents): int
    {
        $fromName = (string) $this->option('from');
        $toName = (string) ($this->option('to') ?: $documents->primaryDiskName());

        if ($fromName === $toName) {
            $this->error('The source and destination disks must be different.');

            return self::FAILURE;
        }

        $from = Storage::disk($fromName);
        $to = Storage::disk($toName);
        $paths = $from->allFiles('vendor_ssm_documents');

        if ($paths === []) {
            $this->warn("No SSM documents were found on the [{$fromName}] disk.");

            return self::SUCCESS;
        }

        $copied = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($paths as $path) {
            if ($to->exists($path)) {
                $skipped++;
                $this->line("Skipped existing object: {$path}");

                continue;
            }

            $stream = $from->readStream($path);

            if (! is_resource($stream)) {
                $failed++;
                $this->error("Could not read: {$path}");

                continue;
            }

            try {
                $stored = $to->put($path, $stream, ['visibility' => 'private']);
            } finally {
                fclose($stream);
            }

            if (! $stored) {
                $failed++;
                $this->error("Could not store: {$path}");

                continue;
            }

            if ($this->option('delete-source')) {
                $from->delete($path);
            }

            $copied++;
            $this->info("Copied: {$path}");
        }

        $this->newLine();
        $this->info("Copied: {$copied}; skipped: {$skipped}; failed: {$failed}");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
