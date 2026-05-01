<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\WelcomeContent;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    public function show(): Response
    {
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

        $settings = WelcomeContent::firstOrNew([]);

        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'announcements' => $announcements,
            'footerData'    => $settings,
            'officials'     => $settings->officials ?? [],
        ]);
    }
}
