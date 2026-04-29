<?php

namespace App\Http\Controllers\Resident;

use App\Events\UnreadMessageCountUpdated;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ContactUsController extends Controller
{
    /**
     * Store a newly created contact message in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        // Validate the incoming request data
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255', 'in:General Inquiry,Feedback,Support,Complaint'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        // Create a new ContactMessage record
        $contactMessage = ContactMessage::create([
            'user_id' => Auth::id(), // Get the ID of the currently authenticated user
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'barangay_id' => Auth::user()->barangay_id,
            'status' => 'unread', // Default status for new messages
        ]);

        // Notify admins about new message
        $this->broadcastUnreadCount();

        // Redirect back to the contact page with a success message
        return redirect()->route('residents.contact')->with('success', 'Your message has been sent successfully!');
    }

    private function broadcastUnreadCount()
    {
        $unreadCount = ContactMessage::where('barangay_id', Auth::user()->barangay_id)
            ->where('status', 'unread')
            ->count();

        $unreadMessages = ContactMessage::where('barangay_id', Auth::user()->barangay_id)
            ->where('status', 'unread')
            ->with('user')
            ->latest()
            ->limit(5)
            ->get()
            ->map(function ($message) {
                return [
                    'id' => 'contact-' . $message->id,
                    'subject' => $message->subject,
                    'message' => $message->message,
                    'created_at' => $message->created_at,
                ];
            });

        $admins = \App\Models\User::where('barangay_id', Auth::user()->barangay_id)
            ->where('role', 'admin')
            ->get();

        foreach ($admins as $admin) {
            broadcast(new UnreadMessageCountUpdated($admin->id, $unreadCount, $unreadMessages->toArray()))->toOthers();
        }
    }
}