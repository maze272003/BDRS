<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class TrackTrafficMetrics
{
    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = microtime(true);

        $response = $next($request);

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $memoryBytes = memory_get_peak_usage(true);

        $this->recordTraffic($request, $response, $durationMs, $memoryBytes);
        $this->detectAnomalies($request, $durationMs, $memoryBytes);

        return $response;
    }

    private function recordTraffic(Request $request, Response $response, int $durationMs, int $memoryBytes): void
    {
        $minute = now()->format('YmdHi');
        $ttl = now()->addMinutes(max((int) config('security.monitoring.traffic_window_minutes'), 5) + 2);

        $this->increment("security:traffic:$minute:total", $ttl);
        $this->increment("security:traffic:$minute:status:".$response->getStatusCode(), $ttl);
        $this->increment("security:traffic:$minute:ip:".sha1((string) $request->ip()), $ttl);

        Cache::put("security:traffic:$minute:last_duration_ms", $durationMs, $ttl);
        Cache::put("security:traffic:$minute:last_memory_bytes", $memoryBytes, $ttl);

        $minutes = Cache::get('security:traffic:minutes', []);
        $minutes[] = $minute;
        $minutes = array_values(array_unique(array_slice($minutes, -10)));
        Cache::put('security:traffic:minutes', $minutes, $ttl);
    }

    private function detectAnomalies(Request $request, int $durationMs, int $memoryBytes): void
    {
        $minute = now()->format('YmdHi');
        $ipKey = "security:traffic:$minute:ip:".sha1((string) $request->ip());
        $ipCount = (int) Cache::get($ipKey, 0);
        $threshold = (int) config('security.monitoring.anomaly_requests_per_minute_per_ip');
        $alertKey = "security:alerted:$ipKey";

        if ($threshold > 0 && $ipCount > $threshold && Cache::add($alertKey, true, now()->addMinute())) {
            Log::channel('security')->alert('Traffic anomaly detected for IP address.', [
                'ip' => $request->ip(),
                'requests_this_minute' => $ipCount,
                'threshold' => $threshold,
            ]);
        }

        if ($durationMs > (int) config('security.monitoring.slow_request_ms')) {
            Log::channel('security')->warning('Slow request detected.', [
                'ip' => $request->ip(),
                'method' => $request->method(),
                'path' => $request->path(),
                'duration_ms' => $durationMs,
            ]);
        }

        if ($memoryBytes > (int) config('security.monitoring.high_memory_bytes')) {
            Log::channel('security')->warning('High memory request detected.', [
                'ip' => $request->ip(),
                'method' => $request->method(),
                'path' => $request->path(),
                'memory_bytes' => $memoryBytes,
            ]);
        }
    }

    private function increment(string $key, mixed $ttl): void
    {
        Cache::add($key, 0, $ttl);
        $value = (int) Cache::increment($key);
        Cache::put($key, $value, $ttl);
    }
}
