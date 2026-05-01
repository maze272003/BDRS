<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnforceRequestSecurityLimits
{
    public function handle(Request $request, Closure $next): Response
    {
        $this->configureExecutionTimeout();

        $maxBodySize = (int) config('security.max_body_size_bytes');
        $contentLength = (int) $request->server('CONTENT_LENGTH', 0);

        if ($maxBodySize > 0 && $contentLength > $maxBodySize) {
            Log::channel('security')->warning('Request rejected because body size exceeded limit.', [
                'ip' => $request->ip(),
                'method' => $request->method(),
                'path' => $request->path(),
                'content_length' => $contentLength,
                'max_body_size' => $maxBodySize,
                'user_id' => $request->user()?->getAuthIdentifier(),
            ]);

            return response('Payload Too Large', 413);
        }

        return $next($request);
    }

    private function configureExecutionTimeout(): void
    {
        $timeout = (int) config('security.request_timeout_seconds');

        if ($timeout <= 0) {
            return;
        }

        if (function_exists('set_time_limit')) {
            @set_time_limit($timeout);
        }

        @ini_set('max_execution_time', (string) $timeout);
        @ini_set('default_socket_timeout', (string) $timeout);
    }
}
