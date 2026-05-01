<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Request Protection
    |--------------------------------------------------------------------------
    |
    | These limits are enforced by application middleware. Web server limits
    | should still be configured to reject abusive traffic earlier.
    |
    */

    'request_timeout_seconds' => (int) env('SECURITY_REQUEST_TIMEOUT_SECONDS', 30),
    'max_body_size_bytes' => (int) env('SECURITY_MAX_BODY_SIZE_BYTES', 10 * 1024 * 1024),
    'max_concurrent_requests' => (int) env('SECURITY_MAX_CONCURRENT_REQUESTS', 50),

    'sanitization_excluded_keys' => [
        'password',
        'password_confirmation',
        'current_password',
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limits
    |--------------------------------------------------------------------------
    */

    'rate_limits' => [
        'public_per_minute' => (int) env('SECURITY_PUBLIC_RATE_LIMIT_PER_MINUTE', 120),
        'public_per_hour' => (int) env('SECURITY_PUBLIC_RATE_LIMIT_PER_HOUR', 1200),
        'authenticated_per_minute' => (int) env('SECURITY_AUTH_RATE_LIMIT_PER_MINUTE', 240),
        'authenticated_per_hour' => (int) env('SECURITY_AUTH_RATE_LIMIT_PER_HOUR', 2400),
        'sensitive_per_minute' => (int) env('SECURITY_SENSITIVE_RATE_LIMIT_PER_MINUTE', 20),
        'sensitive_per_hour' => (int) env('SECURITY_SENSITIVE_RATE_LIMIT_PER_HOUR', 100),
        'honeypot_per_minute' => (int) env('SECURITY_HONEYPOT_RATE_LIMIT_PER_MINUTE', 3),
        'dashboard_per_minute' => (int) env('SECURITY_DASHBOARD_RATE_LIMIT_PER_MINUTE', 30),
    ],

    'progressive' => [
        'threshold_per_hour' => (int) env('SECURITY_PROGRESSIVE_THRESHOLD_PER_HOUR', 600),
        'strict_per_minute' => (int) env('SECURITY_PROGRESSIVE_STRICT_PER_MINUTE', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring
    |--------------------------------------------------------------------------
    */

    'monitoring' => [
        'traffic_window_minutes' => (int) env('SECURITY_TRAFFIC_WINDOW_MINUTES', 5),
        'anomaly_requests_per_minute_per_ip' => (int) env('SECURITY_ANOMALY_REQUESTS_PER_MINUTE_PER_IP', 180),
        'slow_request_ms' => (int) env('SECURITY_SLOW_REQUEST_MS', 2000),
        'high_memory_bytes' => (int) env('SECURITY_HIGH_MEMORY_BYTES', 64 * 1024 * 1024),
    ],

    /*
    |--------------------------------------------------------------------------
    | Honeypot Routes
    |--------------------------------------------------------------------------
    |
    | Common automated scanner targets. These paths are logged and always
    | return a 404 so legitimate users are not exposed to fake endpoints.
    |
    */

    'honeypot_paths' => [
        '.env',
        'adminer.php',
        'phpmyadmin',
        'wp-login.php',
        'xmlrpc.php',
    ],
];
