<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ProgressiveThrottleRequests
{
    public function handle(Request $request, Closure $next, string $profile = 'web'): Response
    {
        $identity = $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();

        $baseKey = 'security:progressive:'.sha1($profile.'|'.$identity);
        $hourKey = $baseKey.':hour';
        $strictKey = $baseKey.':strict';
        $threshold = (int) config('security.progressive.threshold_per_hour');
        $strictLimit = (int) config('security.progressive.strict_per_minute');

        RateLimiter::hit($hourKey, 3600);

        if ($threshold > 0 && RateLimiter::attempts($hourKey) > $threshold) {
            if (RateLimiter::tooManyAttempts($strictKey, $strictLimit)) {
                $retryAfter = RateLimiter::availableIn($strictKey);

                Log::channel('security')->warning('Progressive throttle rejected request.', [
                    'ip' => $request->ip(),
                    'method' => $request->method(),
                    'path' => $request->path(),
                    'profile' => $profile,
                    'user_id' => $request->user()?->getAuthIdentifier(),
                    'retry_after' => $retryAfter,
                ]);

                return response('Too Many Requests', 429)
                    ->header('Retry-After', (string) $retryAfter)
                    ->header('X-RateLimit-Limit', (string) $strictLimit)
                    ->header('X-RateLimit-Remaining', '0')
                    ->header('X-RateLimit-Policy', 'progressive');
            }

            RateLimiter::hit($strictKey, 60);
        }

        $response = $next($request);

        if (! $response->headers->has('X-RateLimit-Policy')) {
            $response->headers->set('X-RateLimit-Policy', 'standard');
        }

        return $response;
    }
}
