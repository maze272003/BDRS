# DDoS Protection And Rate Limiting

This application enforces the first layer of DDoS protection in Laravel and documents the server controls that must be applied before traffic reaches PHP.

## Application Controls

- `config/security.php` defines request size, timeout, concurrency, throttling, progressive limits, and monitoring thresholds.
- `EnforceRequestSecurityLimits` rejects oversized requests and applies PHP execution/socket timeout settings.
- `LimitConcurrentRequests` rejects requests when the app-level concurrent request ceiling is exceeded.
- `SanitizeRequestInput` removes null/control characters from incoming query and form input while leaving password fields unchanged.
- `TrackTrafficMetrics` records per-minute traffic counters, slow requests, high-memory requests, and per-IP anomalies.
- `ProgressiveThrottleRequests` applies stricter throttling after a user/IP crosses the configured hourly threshold.
- `HoneypotController` logs common scanner endpoints such as `.env`, `wp-login.php`, and `xmlrpc.php`.
- `/admin/security/traffic` exposes recent traffic metrics for an authenticated admin dashboard or polling widget.

## Nginx Baseline

```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    multi_accept on;
}

http {
    limit_conn_zone $binary_remote_addr zone=perip:10m;
    limit_req_zone $binary_remote_addr zone=req_per_ip:10m rate=10r/s;

    client_body_timeout 15s;
    client_header_timeout 15s;
    client_max_body_size 10m;
    keepalive_timeout 10s;
    send_timeout 15s;

    server {
        limit_conn perip 20;
        limit_req zone=req_per_ip burst=30 nodelay;

        location ~ \.php$ {
            fastcgi_read_timeout 30s;
            fastcgi_send_timeout 30s;
        }
    }
}
```

## PHP-FPM Baseline

```ini
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 8
pm.max_requests = 500
request_terminate_timeout = 30s
```

Tune `pm.max_children` from measured memory per worker:

```text
pm.max_children = available_php_memory_mb / average_worker_memory_mb
```

## Queue And Backlog Controls

For Linux hosts, keep the kernel and web server backlog finite so overload fails predictably:

```bash
sysctl -w net.core.somaxconn=1024
sysctl -w net.ipv4.tcp_max_syn_backlog=2048
```

Persist these in `/etc/sysctl.d/99-bdrs-ddos.conf` after capacity testing.

## Monitoring And Alerts

- Security events are written to `storage/logs/security-*.log` through the `security` log channel.
- Configure a log shipper such as Filebeat, Vector, or CloudWatch Agent to forward `security-*.log`.
- Alert on repeated 429/413/503 responses, honeypot hits, `Traffic anomaly detected for IP address`, and `Progressive throttle rejected request`.
- Security log retention is controlled by `SECURITY_LOG_RETENTION_DAYS`.

## Automated Response

- Standard Laravel throttles return 429 with `Retry-After` and `X-RateLimit-*` headers.
- Progressive throttling tightens limits after `SECURITY_PROGRESSIVE_THRESHOLD_PER_HOUR`.
- Oversized requests return 413 before controller execution.
- Excess concurrent requests return 503 with `Retry-After`.
- Honeypot routes return 404 and log the source.

## Third-Party DDoS Protection Review

Use an edge provider in production when public traffic is expected:

- Cloudflare: managed WAF, bot rules, rate limiting, cache, and “Under Attack” mode.
- AWS Shield plus AWS WAF: strong fit if hosted on AWS.
- Fastly or Akamai: strong fit for high traffic and advanced edge rules.

The application-level limits in this repo should remain enabled even when an edge provider is used.

## Incident Response

1. Confirm impact: check `storage/logs/security-*.log`, `laravel.log`, PHP-FPM status, database connections, and CPU/memory.
2. Escalate: notify application owner, hosting provider, DNS/CDN owner, and database owner.
3. Contain: enable CDN challenge mode, lower `SECURITY_*_RATE_LIMIT_*`, block abusive IP ranges at the edge, and temporarily raise server capacity only after confirming database headroom.
4. Preserve evidence: retain security logs, web server logs, and traffic dashboards for the incident window.
5. Recover: restore normal limits gradually and document the source, duration, controls used, and follow-up actions.

## Emergency Contacts Template

```text
Application owner:
Hosting provider support:
DNS/CDN administrator:
Database administrator:
SMS/email provider support:
Barangay operations lead:
```
