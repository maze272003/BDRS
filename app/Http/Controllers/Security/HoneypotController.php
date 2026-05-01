<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class HoneypotController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $key = 'security:honeypot:hits:'.now()->format('YmdHi');
        Cache::add($key, 0, now()->addMinutes(10));
        Cache::increment($key);

        Log::channel('security')->warning('Honeypot endpoint hit.', [
            'ip' => $request->ip(),
            'method' => $request->method(),
            'path' => $request->path(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->headers->get('referer'),
        ]);

        abort(404);
    }
}
