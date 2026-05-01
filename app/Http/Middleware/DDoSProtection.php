<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DDoSProtection
{
    private const KEY_PREFIX = 'ddos:';
    private const BANNED_KEY_PREFIX = 'ddos:banned:';
    private const COUNT_KEY_PREFIX = 'ddos:count:';

    public function handle(Request $request, Closure $next): Response
    {
        if (! config('security.ddos.enabled', true)) {
            return $next($request);
        }

        $ip = $request->ip();

        if ($this->isWhitelisted($ip)) {
            return $next($request);
        }

        if ($this->isBanned($ip)) {
            return $this->respondBanned($request);
        }

        $this->trackRequest($ip);

        $requestCount = $this->getRequestCount($ip);
        $threshold = (int) config('security.ddos.requests_per_minute', 500);

        if ($requestCount > $threshold) {
            $this->banIP($ip, $requestCount);

            return $this->respondBanned($request);
        }

        return $next($request);
    }

    private function isWhitelisted(string $ip): bool
    {
        $whitelist = config('security.ddos.whitelist', []);

        return in_array($ip, $whitelist, true);
    }

    private function isBanned(string $ip): bool
    {
        $key = self::BANNED_KEY_PREFIX . sha1($ip);
        $bannedUntil = Cache::get($key);

        if ($bannedUntil === null) {
            return false;
        }

        if (now()->gte(now()->create($bannedUntil))) {
            Cache::forget($key);

            $countKey = self::COUNT_KEY_PREFIX . sha1($ip);
            Cache::forget($countKey);

            Log::channel('security')->info('DDoS ban automatically expired.', [
                'ip' => $ip,
            ]);

            return false;
        }

        return true;
    }

    private function trackRequest(string $ip): void
    {
        $key = self::COUNT_KEY_PREFIX . sha1($ip);
        $ttl = 60;

        Cache::put($key, $this->getRequestCount($ip) + 1, now()->addSeconds($ttl));
    }

    private function getRequestCount(string $ip): int
    {
        $key = self::COUNT_KEY_PREFIX . sha1($ip);

        return (int) Cache::get($key, 0);
    }

    private function banIP(string $ip, int $requestCount): void
    {
        $banDuration = (int) config('security.ddos.ban_duration_minutes', 60);
        $bannedUntil = now()->addMinutes($banDuration);

        $banKey = self::BANNED_KEY_PREFIX . sha1($ip);
        Cache::put($banKey, $bannedUntil->toIso8601String(), now()->addMinutes($banDuration + 5));

        Log::channel('security')->warning('DDoS attack detected - IP automatically blocked.', [
            'ip' => $ip,
            'requests_per_minute' => $requestCount,
            'threshold' => config('security.ddos.requests_per_minute', 500),
            'ban_duration_minutes' => $banDuration,
            'banned_until' => $bannedUntil->toIso8601String(),
        ]);

        $this->alertAdmin($ip, $requestCount, $banDuration);
    }

    private function respondBanned(Request $request): Response
    {
        Log::channel('security')->warning('Blocked request from banned DDoS IP.', [
            'ip' => $request->ip(),
            'method' => $request->method(),
            'path' => $request->path(),
        ]);

        $banDuration = (int) config('security.ddos.ban_duration_minutes', 60);

        return response()->json([
            'message' => 'Too Many Requests - IP temporarily blocked due to potential DDoS attack',
            'retry_after_minutes' => $banDuration,
        ], 429)
            ->header('Retry-After', (string) ($banDuration * 60))
            ->header('X-RateLimit-Limit', (string) config('security.ddos.requests_per_minute', 500))
            ->header('X-RateLimit-Remaining', '0')
            ->header('X-RateLimit-Policy', 'ddos-protection')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    private function alertAdmin(string $ip, int $requestCount, int $banDuration): void
    {
        $alertKey = 'ddos:alert:sent';
        $alertWindow = 300;
        $alertThreshold = 3;

        if (Cache::add($alertKey, 1, now()->addSeconds($alertWindow))) {
            return;
        }

        $recentBanCount = (int) Cache::increment($alertKey);
        Cache::put($alertKey, $recentBanCount, now()->addSeconds($alertWindow));

        if ($recentBanCount >= $alertThreshold) {
            Log::channel('security')->alert('Multiple DDoS attacks detected - multiple IPs blocked in short window.', [
                'ip' => $ip,
                'requests_per_minute' => $requestCount,
                'blocked_ips_count' => $recentBanCount,
                'ban_duration_minutes' => $banDuration,
            ]);
        }
    }
}