<?php

namespace App\Console\Commands;

use App\Models\ServiceProfile;
use App\Support\MarketplaceThumbnail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateMarketplaceThumbnails extends Command
{
    protected $signature = 'marketplace:generate-thumbnails {--force : Regenerate thumbnails that already exist}';

    protected $description = 'Generate marketplace card thumbnails for service portfolio images.';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $created = 0;
        $skipped = 0;
        $failed = 0;
        $force = (bool) $this->option('force');

        ServiceProfile::query()
            ->whereNotNull('portfolio_path')
            ->orderBy('id')
            ->chunkById(100, function ($services) use ($disk, $force, &$created, &$skipped, &$failed) {
                foreach ($services as $service) {
                    if (!$force && $service->portfolio_thumbnail_path && $disk->exists($service->portfolio_thumbnail_path)) {
                        $skipped++;
                        continue;
                    }

                    if (!$disk->exists($service->portfolio_path)) {
                        $failed++;
                        $this->warn("Missing portfolio file for service #{$service->id}: {$service->portfolio_path}");
                        continue;
                    }

                    $thumbnailPath = MarketplaceThumbnail::createFromPath(
                        storage_path('app/public/' . $service->portfolio_path),
                        pathinfo($service->portfolio_path, PATHINFO_FILENAME)
                    );

                    if (!$thumbnailPath) {
                        $skipped++;
                        continue;
                    }

                    $service->forceFill(['portfolio_thumbnail_path' => $thumbnailPath])->save();
                    $created++;
                }
            });

        $this->info("Marketplace thumbnails generated: {$created}");
        $this->info("Skipped: {$skipped}");
        $this->info("Failed: {$failed}");

        return self::SUCCESS;
    }
}
