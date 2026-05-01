<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a list of all users.
     */
    public function index(Request $request)
    {
        // MODIFIED: Allow both super_admin and admin to view this page.
        // We will create this 'manage-users' Gate in the AuthServiceProvider.
        if (Gate::denies('manage-users')) {
            abort(403, 'Unauthorized action.');
        }

        $query = User::with(['profile', 'barangay'])
            ->orderBy($request->input('sortBy', 'created_at'), $request->input('sortOrder', 'desc'));

        // --- NEW: SCOPE QUERY FOR ADMINS ---
        // If the logged-in user is an admin, only show users from their barangay.
        // Super admins can still see everyone.
        if (auth()->user()->role === 'admin') {
            $query->where('barangay_id', auth()->user()->barangay_id);
        }
        // --- END OF NEW LOGIC ---

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhereHas('profile', function ($profileQuery) use ($search) {
                      $profileQuery->where('first_name', 'like', "%{$search}%")
                                   ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // Role Filter
        if ($request->filled('role') && $request->input('role') !== 'all') {
            $query->where('role', $request->input('role'));
        }

        // Verification Status Filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            $query->where('verification_status', $status === 'unverified' ? '!=' : '=', $status === 'unverified' ? 'verified' : $status);
        }

        return Inertia::render('SuperAdmin/Users/Usermanagement', [
            'users' => $query->paginate(10)->withQueryString(),
            'filters' => $request->only(['search', 'role', 'sortBy', 'sortOrder', 'status']),
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        // ADDED: Only super admins can change roles.
        Gate::authorize('be-super-admin');

        if ($user->id === auth()->id()) {
            return Redirect::back()->with('error', 'You cannot change your own role.');
        }

        $request->validate([
            'role' => ['required', 'string', Rule::in(['resident', 'admin'])],
        ]);

        if ($user->role === 'super_admin') {
             return Redirect::back()->with('error', 'Cannot change the role of another Super Admin.');
        }

        $user->role = $request->role;
        $user->save();

        return Redirect::back()->with('success', "{$user->profile->first_name}'s role updated successfully.");
    }

    public function updateVerificationStatus(Request $request, User $user)
    {
        // ADDED: Only admins can verify users.
        Gate::authorize('be-admin');

        // ADDED: Security check to ensure admin can only verify users in their own barangay.
        if (auth()->user()->barangay_id !== $user->barangay_id) {
            abort(403, 'You can only verify users within your own barangay.');
        }

        $validated = $request->validate([
            'verification_status' => ['required', Rule::in(['verified', 'rejected', 'unverified', 'pending_verification'])],
        ]);
        $user->update($validated);
        return Redirect::back()->with('success', "User verification status has been updated.");
    }

    public function update(Request $request, User $user)
    {
        // ADDED: Only allow super admins to edit user profile details from this panel.
        Gate::authorize('be-super-admin');

        $validatedData = $request->validate([
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'profile.first_name' => 'required|string|max:255',
            'profile.middle_name' => 'nullable|string|max:255',
            'profile.last_name' => 'required|string|max:255',
            'profile.suffix' => 'nullable|string|max:20',
            'profile.phone_number' => 'nullable|string|max:20',
            'profile.province' => 'required|string|max:255',
            'profile.city' => 'required|string|max:255',
            'profile.barangay' => 'required|string|max:255',
            'profile.street_address' => 'required|string|max:255',
            'profile.civil_status' => ['nullable', 'string', Rule::in(['Single', 'Married', 'Widowed', 'Separated'])],
        ]);

        $user->update(['email' => $validatedData['email']]);

        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            $validatedData['profile']
        );

        return Redirect::back()->with('success', 'User details updated successfully.');
    }
}
