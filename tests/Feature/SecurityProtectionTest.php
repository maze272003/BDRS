<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Municipality;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SecurityProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_sensitive_routes_emit_rate_limit_headers_and_throttle(): void
    {
        config([
            'security.rate_limits.sensitive_per_minute' => 2,
            'security.rate_limits.sensitive_per_hour' => 2,
        ]);

        $this->postJson('/validate-email', ['email' => 'first@example.com'])
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit')
            ->assertHeader('X-RateLimit-Remaining');

        $this->postJson('/validate-email', ['email' => 'second@example.com'])
            ->assertOk()
            ->assertHeader('X-RateLimit-Limit')
            ->assertHeader('X-RateLimit-Remaining');

        $this->postJson('/validate-email', ['email' => 'third@example.com'])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertHeader('X-RateLimit-Remaining', '0');
    }

    public function test_oversized_requests_are_rejected_before_controller_execution(): void
    {
        config(['security.max_body_size_bytes' => 10]);

        $this->withServerVariables(['CONTENT_LENGTH' => 11])
            ->post('/validate-phone', ['phone_number' => '09123456789'])
            ->assertStatus(413);
    }

    public function test_honeypot_routes_return_not_found(): void
    {
        $this->get('/wp-login.php')->assertNotFound();
        $this->get('/.env')->assertNotFound();
    }

    public function test_admin_security_traffic_endpoint_returns_metrics(): void
    {
        $barangay = $this->createBarangay();

        $admin = User::factory()->create([
            'role' => 'admin',
            'barangay_id' => $barangay->id,
            'email_verified_at' => now(),
        ]);

        Cache::put('security:traffic:minutes', [now()->format('YmdHi')], now()->addMinutes(5));
        Cache::put('security:traffic:'.now()->format('YmdHi').':total', 3, now()->addMinutes(5));

        $this->actingAs($admin)
            ->getJson('/admin/security/traffic')
            ->assertOk()
            ->assertJsonStructure([
                'generated_at',
                'window_minutes',
                'requests_in_window',
                'series',
                'thresholds' => [
                    'anomaly_requests_per_minute_per_ip',
                    'slow_request_ms',
                    'high_memory_bytes',
                ],
            ]);
    }

    private function createBarangay(): Barangay
    {
        $municipality = Municipality::create([
            'name' => 'Test Municipality',
            'province' => 'Test Province',
        ]);

        return Barangay::create([
            'municipality_id' => $municipality->id,
            'name' => 'Test Barangay',
        ]);
    }
}
