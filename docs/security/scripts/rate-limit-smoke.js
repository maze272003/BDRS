import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.50'],
  },
};

export default function () {
  const res = http.post('http://localhost:8000/validate-email', {
    email: `load-${__VU}-${__ITER}@example.com`,
  }, {
    headers: { Accept: 'application/json' },
  });

  check(res, {
    'allowed or throttled': (r) => [200, 429].includes(r.status),
    'rate limit headers present': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
  });

  sleep(0.25);
}
