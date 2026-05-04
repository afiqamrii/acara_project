<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MarketplaceThumbnail
{
    private const WIDTH = 600;
    private const HEIGHT = 400;
    private const QUALITY = 82;
    private const DIRECTORY = 'service_portfolio_thumbnails';

    public static function createFromPath(string $sourcePath, string $baseName): ?string
    {
        if (!is_file($sourcePath)) {
            return null;
        }

        $imageInfo = @getimagesize($sourcePath);
        if ($imageInfo === false) {
            return null;
        }

        [$sourceWidth, $sourceHeight] = $imageInfo;
        if ($sourceWidth <= 0 || $sourceHeight <= 0) {
            return null;
        }

        $sourceImage = self::openImage($sourcePath, $imageInfo['mime'] ?? '');
        if (!$sourceImage) {
            return null;
        }

        $thumbnail = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        $background = imagecolorallocate($thumbnail, 255, 255, 255);
        imagefill($thumbnail, 0, 0, $background);

        $scale = max(self::WIDTH / $sourceWidth, self::HEIGHT / $sourceHeight);
        $resizedWidth = (int) ceil($sourceWidth * $scale);
        $resizedHeight = (int) ceil($sourceHeight * $scale);
        $targetX = (int) floor((self::WIDTH - $resizedWidth) / 2);
        $targetY = (int) floor((self::HEIGHT - $resizedHeight) / 2);

        imagecopyresampled(
            $thumbnail,
            $sourceImage,
            $targetX,
            $targetY,
            0,
            0,
            $resizedWidth,
            $resizedHeight,
            $sourceWidth,
            $sourceHeight
        );

        imagedestroy($sourceImage);

        $safeBaseName = Str::slug(pathinfo($baseName, PATHINFO_FILENAME)) ?: 'portfolio';
        $relativePath = self::DIRECTORY . '/' . $safeBaseName . '_thumb.jpg';
        $targetPath = storage_path('app/public/' . $relativePath);

        Storage::disk('public')->makeDirectory(self::DIRECTORY);
        imageinterlace($thumbnail, true);

        $saved = imagejpeg($thumbnail, $targetPath, self::QUALITY);
        imagedestroy($thumbnail);

        return $saved ? $relativePath : null;
    }

    private static function openImage(string $sourcePath, string $mime)
    {
        return match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($sourcePath),
            'image/png' => @imagecreatefrompng($sourcePath),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : false,
            default => false,
        };
    }
}
