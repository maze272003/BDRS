<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule; // <-- Make sure to add this import
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->load('profile');

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'userProfile' => $user->profile,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request)
    {
        // ... your existing update logic ...
        $request->validate([
            'first_name'   => 'required|string|max:255',
            'middle_name'  => 'nullable|string|max:255',
            'last_name'    => 'required|string|max:255',
            'email'        => 'required|email|max:255|unique:users,email,' . auth()->id(),
            'phone_number' => 'nullable|string|max:20',
            'address'      => 'nullable|string|max:500',
            'birthday'     => 'nullable|date',
            'gender'       => 'nullable|string|in:Male,Female,Other',
            'civil_status' => 'nullable|string|in:Single,Married,Widowed,Separated',
        ]);

        $user = $request->user();
        $user->email = $request->email;

        if ($user->isDirty('email') && $user instanceof MustVerifyEmail) {
            $user->email_verified_at = null;
        }

        $user->save();

        $user->profile()->updateOrCreate(['user_id' => $user->id], [
            'first_name'   => $request->first_name,
            'middle_name'  => $request->middle_name,
            'last_name'    => $request->last_name,
            'phone_number' => $request->phone_number,
            'province'     => $user->profile?->province ?? 'Nueva Ecija',
            'city'         => $user->profile?->city ?? 'City of Gapan',
            'barangay'     => $user->profile?->barangay ?? $user->barangay?->name ?? 'San Lorenzo',
            'street_address' => $user->profile?->street_address ?? '',
            'birthday'     => $request->birthday,
            'gender'       => $request->gender,
            'civil_status' => $request->civil_status,
        ]);

        return Redirect::route('profile.edit')->with('success', 'Profile updated successfully.');
    }

    // --- ADD THIS NEW METHOD ---
    /**
     * Update the user's two-factor authentication settings.
     */
    public function updateTwoFactorSettings(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $request->validate([
            'two_factor_enabled' => ['required', 'boolean'],
            'two_factor_method' => ['required', 'string', Rule::in(['email', 'sms'])],
        ]);

        // If SMS is chosen, we must verify a phone number exists on their profile.
        if ($request->two_factor_method === 'sms' && empty($user->profile?->phone_number)) {
            return back()->withErrors(['two_factor_method' => 'You do not have a phone number on your profile to use SMS authentication.']);
        }

        // Save the settings to the User model
        $user->forceFill([
            'two_factor_enabled' => $request->two_factor_enabled,
            'two_factor_method' => $request->two_factor_method,
        ])->save();

        return back()->with('status', 'Two-factor settings updated.');
    }
    // --- END OF NEW METHOD ---


    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        Auth::logout();
        $user->status = 'inactive';
        $user->save();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
