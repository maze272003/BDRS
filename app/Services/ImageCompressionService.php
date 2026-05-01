<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ImageCompressionService
{
    public function compress(UploadedFile $file, string $directory, int $quality = 75, int $maxWidth = 1920): string
    {
        $imageData = $this->processImage($file, $maxWidth, $quality);
        
        $extension = 'jpg';
        $filename = $this->generateFilename($extension);
        $path = "{$directory}/{$filename}";

        Storage::disk('s3')->put($path, $imageData);

        Log::info('Image compressed and uploaded', [
            'original_size' => $file->getSize(),
            'compressed_size' => strlen($imageData),
            'directory' => $directory,
            'filename' => $filename,
        ]);

        return $path;
    }

    private function processImage(UploadedFile $file, int $maxWidth, int $quality): string
    {
        $mimeType = $file->getMimeType();
        
        $source = match ($mimeType) {
            'image/jpeg', 'image/jpg' => imagecreatefromjpeg($file->path()),
            'image/png' => imagecreatefrompng($file->path()),
            'image/webp' => imagecreatefromwebp($file->path()),
            default => imagecreatefromjpeg($file->path()),
        };

        if (!$source) {
            $source = imagecreatefromstring(file_get_contents($file->path()));
        }

        $originalWidth = imagesx($source);
        $originalHeight = imagesy($source);

        if ($originalWidth > $maxWidth) {
            $newWidth = $maxWidth;
            $newHeight = (int) ($originalHeight * ($maxWidth / $originalWidth));
            
            $dest = imagecreatetruecolor($newWidth, $newHeight);
            
            if ($mimeType === 'image/png') {
                imagealphablending($dest, false);
                imagesavealpha($dest, true);
                $transparent = imagecolorallocatealpha($dest, 0, 0, 0, 127);
                imagefill($dest, 0, 0, $transparent);
            }
            
            imagecopyresampled($dest, $source, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);
            imagedestroy($source);
            $source = $dest;
        }

        ob_start();
        
        if ($mimeType === 'image/png') {
            imagepng($source, null, 6);
        } else {
            imagejpeg($source, null, $quality);
        }
        
        $encoded = ob_get_clean();
        imagedestroy($source);

        return $encoded ?: file_get_contents($file->path());
    }

    public function compressWithCallback(UploadedFile $file, int $quality = 75, int $maxWidth = 1920): string
    {
        $imageData = $this->processImage($file, $maxWidth, $quality);
        
        return 'data:image/jpeg;base64,' . base64_encode($imageData);
    }

    private function generateFilename(string $extension): string
    {
        return sprintf(
            '%s_%s.%s',
            uniqid('img_', true),
            bin2hex(random_bytes(4)),
            $extension
        );
    }
}