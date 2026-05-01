<?php

namespace Database\Factories;

use App\Models\Barangay;
use App\Models\Municipality;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),

            // ADDED: Default values for required fields
            'role' => 'resident', // Default role for a factory-created user
            'status' => 'active',
            'verification_status' => 'verified',
            'barangay_id' => Barangay::query()->inRandomOrder()->value('id') ?? $this->defaultBarangayId(),
            'two_factor_enabled' => false,
            'two_factor_method' => 'email',
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    private function defaultBarangayId(): int
    {
        $municipality = Municipality::query()->firstOrCreate(
            ['name' => 'Test Municipality'],
            ['province' => 'Test Province'],
        );

        return Barangay::query()->firstOrCreate(
            [
                'municipality_id' => $municipality->id,
                'name' => 'Test Barangay',
            ],
        )->id;
    }
}
