<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Barangay;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\RedirectResponse;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Storage; // Add Storage facade
use App\Models\WelcomeContent;
class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
     public function create(): Response
    {
   
        $footerData = WelcomeContent::first();

        return Inertia::render('Auth/Register', [
            'footerData' => $footerData, 
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
      public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:20',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'province' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'barangay' => 'required|string|max:255|exists:barangays,name', // Validate that the barangay name exists in your database
            'street_address' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20|unique:user_profiles,phone_number',
            'birthday' => 'required|date',
            'gender' => 'required|string|in:Male,Female',
            'place_of_birth' => 'required|string|max:255',
            'civil_status' => 'required|string|max:50',
            'valid_id_type' => 'required|string|max:255',
            'valid_id_front_image' => 'required|file|mimes:jpeg,png,jpg|max:2048',
            'valid_id_back_image' => 'required|file|mimes:jpeg,png,jpg|max:2048',
            'face_image' => 'required|file|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = DB::transaction(function () use ($request) {
            // STEP 1: Find the Barangay model from the name provided in the form.
            // We need this to get the foreign key ID.
            $barangay = Barangay::where('name', $request->barangay)->firstOrFail();

            // STEP 2: Create the User, assigning the barangay_id for system logic.
            // This is the "keycard" for data scoping.
            $user = User::create([
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'resident',
                'barangay_id' => $barangay->id, // <-- ASSIGN THE FOREIGN KEY
                'two_factor_enabled' => true,
                'two_factor_method' => 'email'
                
            ]);

            // Handle file uploads
            $idFrontPath = $request->file('valid_id_front_image')->store('id_images', 's3');
            $idBackPath = $request->file('valid_id_back_image')->store('id_images', 's3');
            $faceImagePath = $request->file('face_image')->store('face_images', 's3');

            // STEP 3: Create the User Profile with the full text address for display.
            // This is the "business card" with descriptive info.
            $user->profile()->create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'middle_name' => $request->middle_name,
                'suffix' => $request->suffix,
                'province' => $request->province,
                'city' => $request->city,
                'barangay' => $request->barangay, // <-- SAVE THE NAME
                'street_address' => $request->street_address,
                'phone_number' => $request->phone_number,
                'birthday' => $request->birthday,
                'gender' => $request->gender,
                'place_of_birth' => $request->place_of_birth, 
                'civil_status' => $request->civil_status,
                'valid_id_type' => $request->valid_id_type,
                'valid_id_front_path' => $idFrontPath,
                'valid_id_back_path' => $idBackPath,
                'face_image_path' => $faceImagePath,
            ]);

            return $user;
        });

        event(new Registered($user));

        return redirect(route('verification.notice'));
    }
}
