<?php
// app/Http/Controllers/Resident/HomeController.php

namespace App\Http\Controllers\Resident;

use App\Http\Controllers\Controller;
use App\Models\DocumentType;
use App\Models\Announcement; // <-- 1. Import the Announcement model
use Inertia\Inertia;

class HomeController extends Controller
{
    public function __invoke()
    {
        // Fetch only the document types that are NOT archived
        $documentTypes = DocumentType::where('is_archived', false)->get();

        // 2. Fetch the 5 latest announcements with image URLs
        $announcements = Announcement::latest()
            ->take(5)
            ->get()
            ->map(fn ($announcement) => [
                'id' => $announcement->id,
                'tag' => $announcement->tag,
                'title' => $announcement->title,
                'description' => $announcement->description,
                'link' => $announcement->link,
                'image_url' => $announcement->image_url,
                'created_at' => $announcement->created_at,
                'user' => $announcement->user,
            ]);

        // 3. Pass BOTH props to your Inertia component
        return Inertia::render('Residents/Home', [
            'documentTypes' => $documentTypes,
            'announcements' => $announcements,
        ]);
    }
}
