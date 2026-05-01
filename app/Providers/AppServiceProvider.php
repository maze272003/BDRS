<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL; // Siguraduhing naka-import ito
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification; // <-- 1. Import Notification facade
use Illuminate\Support\Facades\RateLimiter;
use App\Notifications\Channels\SemaphoreChannel;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();

          // --- ADD THIS BLOCK ---
        // Register the custom notification channel for Semaphore.
        Notification::extend('semaphore', function ($app) {
            return new SemaphoreChannel();
        });
        Vite::prefetch(concurrency: 3);

        // Force HTTPS in production
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Allow super admins to bypass all checks automatically
        Gate::before(function (User $user, string $ability) {
            if ($user->role === 'super_admin') {
                return true;
            }
        });

        // Gate for Admin dashboard access (admins and super admins)
        Gate::define('be-admin', function (User $user) {
            return $user->role === 'admin';
        });

        // Gate for resident-level pages (residents and admins; superadmin handled by before)
        Gate::define('be-resident', function (User $user) {
            return in_array($user->role, ['resident', 'admin']);
        });

        // Gate for superadmin-only management
        Gate::define('be-super-admin', function (User $user) {
            return $user->role === 'super_admin';
        });

           Gate::define('manage-users', function (User $user) {
            return in_array($user->role, ['super_admin', 'admin']);
        });
    }

    private function configureRateLimiters(): void
    {
        RateLimiter::for('public', function (Request $request) {
            $ip = (string) $request->ip();

            return [
                Limit::perMinute((int) config('security.rate_limits.public_per_minute'))->by('public:minute:'.$ip),
                Limit::perHour((int) config('security.rate_limits.public_per_hour'))->by('public:hour:'.$ip),
            ];
        });

        RateLimiter::for('authenticated', function (Request $request) {
            $identity = $request->user()
                ? 'user:'.$request->user()->getAuthIdentifier()
                : 'ip:'.$request->ip();

            return [
                Limit::perMinute((int) config('security.rate_limits.authenticated_per_minute'))->by('auth:minute:'.$identity),
                Limit::perHour((int) config('security.rate_limits.authenticated_per_hour'))->by('auth:hour:'.$identity),
            ];
        });

        RateLimiter::for('sensitive', function (Request $request) {
            $identity = $request->user()
                ? 'user:'.$request->user()->getAuthIdentifier()
                : 'ip:'.$request->ip();

            return [
                Limit::perMinute((int) config('security.rate_limits.sensitive_per_minute'))->by('sensitive:minute:'.$identity),
                Limit::perHour((int) config('security.rate_limits.sensitive_per_hour'))->by('sensitive:hour:'.$identity),
            ];
        });

        RateLimiter::for('honeypot', function (Request $request) {
            return Limit::perMinute((int) config('security.rate_limits.honeypot_per_minute'))
                ->by('honeypot:'.$request->ip());
        });

        RateLimiter::for('traffic-dashboard', function (Request $request) {
            $identity = $request->user()
                ? 'user:'.$request->user()->getAuthIdentifier()
                : 'ip:'.$request->ip();

            return Limit::perMinute((int) config('security.rate_limits.dashboard_per_minute'))
                ->by('traffic-dashboard:'.$identity);
        });
    }
}
