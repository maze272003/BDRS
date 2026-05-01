<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class SecurityTrafficController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $windowMinutes = max((int) config('security.monitoring.traffic_window_minutes'), 1);
        $minutes = array_slice(Cache::get('security:traffic:minutes', []), -$windowMinutes);

        $series = collect($minutes)->map(function (string $minute) {
            return [
                'minute' => $minute,
                'requests' => (int) Cache::get("security:traffic:$minute:total", 0),
                'last_duration_ms' => (int) Cache::get("security:traffic:$minute:last_duration_ms", 0),
                'last_memory_bytes' => (int) Cache::get("security:traffic:$minute:last_memory_bytes", 0),
            ];
        })->values();

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'window_minutes' => $windowMinutes,
            'requests_in_window' => $series->sum('requests'),
            'series' => $series,
            'thresholds' => [
                'anomaly_requests_per_minute_per_ip' => (int) config('security.monitoring.anomaly_requests_per_minute_per_ip'),
                'slow_request_ms' => (int) config('security.monitoring.slow_request_ms'),
                'high_memory_bytes' => (int) config('security.monitoring.high_memory_bytes'),
            ],
        ]);
    }
}
