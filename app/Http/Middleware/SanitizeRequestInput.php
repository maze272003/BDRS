<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

class SanitizeRequestInput
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->query->replace($this->sanitizeArray($request->query->all()));
        $request->request->replace($this->sanitizeArray($request->request->all()));

        return $next($request);
    }

    private function sanitizeArray(array $data): array
    {
        foreach ($data as $key => $value) {
            $data[$key] = $this->sanitizeValue((string) $key, $value);
        }

        return $data;
    }

    private function sanitizeValue(string $key, mixed $value): mixed
    {
        if ($value instanceof UploadedFile) {
            return $value;
        }

        if (is_array($value)) {
            foreach ($value as $nestedKey => $nestedValue) {
                $value[$nestedKey] = $this->sanitizeValue((string) $nestedKey, $nestedValue);
            }

            return $value;
        }

        if (! is_string($value) || $this->shouldSkipKey($key)) {
            return $value;
        }

        $sanitized = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);

        return trim($sanitized ?? str_replace("\0", '', $value));
    }

    private function shouldSkipKey(string $key): bool
    {
        return in_array($key, config('security.sanitization_excluded_keys', []), true);
    }
}
