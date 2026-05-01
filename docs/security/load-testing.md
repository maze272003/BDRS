# Load Testing And DDoS Simulation

Run these tests only against a local or staging environment you control.

## Capacity Baseline

Install `k6`, then run:

```bash
k6 run docs/security/scripts/rate-limit-smoke.js
```

Expected result:

- Normal traffic returns mostly 200/302.
- Sensitive endpoints return 429 once the configured limit is exceeded.
- Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` when throttled.

## Manual Curl Smoke Test

```bash
for i in $(seq 1 25); do
  curl -i -X POST http://localhost:8000/validate-email \
    -H "Accept: application/json" \
    -d "email=test${i}@example.com" | grep -E "HTTP/|X-RateLimit|Retry-After"
done
```

## DDoS Simulation Checklist

- Raise traffic until 429 responses appear on sensitive routes.
- Send requests larger than `SECURITY_MAX_BODY_SIZE_BYTES` and confirm 413.
- Hit `/wp-login.php`, `/xmlrpc.php`, and `/.env`; confirm 404 plus security log entries.
- Open `/admin/security/traffic` as an admin and confirm request counts move during the test.
- Check `storage/logs/security-*.log` for anomaly, slow request, and high-memory entries.

## Backup Routing Procedure

If the primary host is saturated:

1. Put the CDN into challenge/under-attack mode.
2. Route DNS to a static maintenance page or a standby instance.
3. Keep database write access disabled until traffic normalizes.
4. Restore Laravel traffic after edge rules and rate limits are stable.
