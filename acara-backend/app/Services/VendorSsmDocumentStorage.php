<?php

namespace App\Services;

use App\Models\VendorProfile;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VendorSsmDocumentStorage
{
    private const DIRECTORY = 'vendor_ssm_documents';

    public function store(UploadedFile $document): string
    {
        $extension = strtolower($document->getClientOriginalExtension());
        $filename = Str::uuid().'.'.$extension;
        $path = $document->storeAs(
            self::DIRECTORY,
            $filename,
            [
                'disk' => $this->primaryDiskName(),
                'visibility' => 'private',
            ],
        );

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('The SSM document could not be stored.');
        }

        return $path;
    }

    public function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        foreach ($this->candidateDiskNames() as $diskName) {
            $disk = Storage::disk($diskName);

            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        }
    }

    public function exists(?string $path): bool
    {
        return $this->resolveDisk($path) !== null;
    }

    public function response(VendorProfile $vendor): StreamedResponse
    {
        $path = $vendor->ssm_document_path;
        $disk = $this->resolveDisk($path);

        abort_if(! $path || ! $disk, 404, 'The SSM document is not available in storage.');

        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $downloadName = Str::slug($vendor->business_name ?: 'vendor').'-ssm-document';

        if ($extension !== '') {
            $downloadName .= '.'.strtolower($extension);
        }

        return $disk->response($path, $downloadName, [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function primaryDiskName(): string
    {
        return (string) config('filesystems.ssm_documents_disk', 'private');
    }

    /**
     * Resolve documents from the configured private disk first, with a
     * temporary fallback for files uploaded by older releases.
     */
    private function resolveDisk(?string $path): ?FilesystemAdapter
    {
        if (! $path) {
            return null;
        }

        foreach ($this->candidateDiskNames() as $diskName) {
            $disk = Storage::disk($diskName);

            if ($disk->exists($path)) {
                return $disk;
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function candidateDiskNames(): array
    {
        return array_values(array_unique([
            $this->primaryDiskName(),
            'public',
        ]));
    }
}
