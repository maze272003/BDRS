<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LimitConcurrentRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $limit = (int) config('security.max_concurrent_requests');

        if ($limit <= 0) {
            return $next($request);
        }

        $key = 'security:concurrent:global';
        $ttl = now()->addSeconds(max((int) config('security.request_timeout_seconds'), 30) + 10);
        Cache::add($key, 0, $ttl);
        $current = (int) Cache::increment($key);
        Cache::put($key, $current, $ttl);

        if ($current > $limit) {
            $this->decrement($key);

            Log::channel('security')->warning('Request rejected because concurrent request limit was exceeded.', [
                'ip' => $request->ip(),
                'method' => $request->method(),
                'path' => $request->path(),
                'current' => $current,
                'limit' => $limit,
                'user_id' => $request->user()?->getAuthIdentifier(),
            ]);

            return response('Service Unavailable', 503)->header('Retry-After', '5');
        }

        try {
            return $next($request);
        } finally {
            $this->decrement($key);
        }
    }

    private function decrement(string $key): void
    {
        $current = (int) Cache::get($key, 0);

        if ($current <= 1) {
            Cache::forget($key);
            return;
        }

        Cache::decrement($key);
    }
}
