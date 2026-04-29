<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultBarangay = Barangay::where('name', 'Poblacion Central')->first()
            ?? Barangay::first();

        if (!$defaultBarangay) {
            $this->command->warn('No barangay found. Please run BarangaySeeder before SuperAdminSeeder.');
            return;
        }

        // List of Super Admin users
        $superAdmins = [
            [
                'email' => 'romark7bayan@gmail.com',
                'password' => 'R12345678!',
            ],
            [
                'email' => 'acepadillaace@gmail.com',
                'password' => 'Ace#12345',
            ],
            [
                'email' => 'jmjonatas4@gmail.com',
                'password' => '12345678',
            ],
        ];

        foreach ($superAdmins as $admin) {
            $user = User::firstOrNew(['email' => $admin['email']]);

            if (!$user->exists) {
                $user->password = Hash::make($admin['password']);
            }

            $user->role = 'super_admin';
            $user->status = 'active';
            $user->email_verified_at = Carbon::now();
            $user->barangay_id = $defaultBarangay->id;
            $user->two_factor_enabled = true;
            $user->two_factor_method = 'email';
            $user->save();

            // Create a corresponding user profile if it doesn't exist
            if (!$user->profile) {
                UserProfile::factory()->create([
                    'user_id' => $user->id,
                ]);
            }
        }
    }
}
