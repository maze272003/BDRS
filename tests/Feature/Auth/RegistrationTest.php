<?php

namespace Tests\Feature\Auth;

use App\Models\Barangay;
use App\Models\Municipality;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        Storage::fake('public');

        $barangay = $this->createBarangay();

        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'middle_name' => null,
            'suffix' => null,
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'province' => 'Nueva Ecija',
            'city' => 'City of Gapan',
            'barangay' => $barangay->name,
            'street_address' => '123 Test Street',
            'phone_number' => '09123456789',
            'birthday' => '2000-01-01',
            'gender' => 'Male',
            'place_of_birth' => 'Gapan City',
            'civil_status' => 'Single',
            'valid_id_type' => 'National ID',
            'valid_id_front_image' => UploadedFile::fake()->image('front.jpg'),
            'valid_id_back_image' => UploadedFile::fake()->image('back.jpg'),
            'face_image' => UploadedFile::fake()->image('face.jpg'),
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('verification.notice', absolute: false));
        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
        $this->assertDatabaseHas('user_profiles', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'barangay' => $barangay->name,
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
