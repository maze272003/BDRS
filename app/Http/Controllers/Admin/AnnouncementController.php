<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage; // Added for file deletion
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $announcements = Announcement::latest()
            ->with('user') // Siguraduhing may 'user' relationship ang Announcement model mo
            ->paginate(5) // Gumagamit tayo ng paginate
            ->through(fn ($announcement) => [
                'id' => $announcement->id,
                'tag' => $announcement->tag,
                'title' => $announcement->title,
                'description' => $announcement->description,
                'link' => $announcement->link,
                'image_url' => $announcement->image_url, // Siguraduhing may image_url accessor ka
                'created_at' => $announcement->created_at,
                'user' => $announcement->user,
            ]);

        return Inertia::render('Admin/Announcement', [
            // ANG PANGALAN NG PROP AY DAPAT 'announcements'
            'announcements' => $announcements
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'tag' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'link' => 'nullable|url',
            // 'barangay_id' => Auth::user()->barangay_id,
            // Changed max size to 10MB (10240 KB)
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:10240',
        ]);

        $imagePath = $request->file('image')->store('announcements', 's3');

        Announcement::create([
            'tag' => $request->tag,
            'title' => $request->title,
            'description' => $request->description,
            'link' => $request->link,
            'image' => $imagePath,
            'barangay_id' => Auth::user()->barangay_id,
            'user_id' => Auth::id(), // Get the currently logged-in user's ID
        ]);

        return Redirect::route('admin.announcements.index')->with('success', 'Announcement created successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */

     public function update(Request $request, Announcement $announcement)
    {
        $validated = $request->validate([
            'tag' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'link' => 'nullable|url',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        // 1. Prepare data for update, initially excluding the image.
        $updateData = [
            'tag' => $validated['tag'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'link' => $validated['link'],
        ];

        // 2. Check if a new image was uploaded.
        if ($request->hasFile('image')) {
            // Delete the old image from storage
            if ($announcement->image) {
                Storage::disk('s3')->delete($announcement->image);
            }
            // Store the new image and add it to our update data array.
            $updateData['image'] = $request->file('image')->store('announcements', 's3');
        }

        // 3. Update the announcement with the prepared data.
        // This now only includes the 'image' key if a new one was uploaded.
        $announcement->update($updateData);

        return Redirect::route('admin.announcements.index')->with('success', 'Announcement updated successfully.');
    }

    public function destroy(Announcement $announcement)
    {
        // Delete the image file from storage if it exists
        if ($announcement->image) {
            Storage::disk('s3')->delete($announcement->image);
        }

        $announcement->delete();
        return Redirect::route('admin.announcements.index')->with('success', 'Announcement deleted successfully.');
    }
}
