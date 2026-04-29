<?php

namespace App\Http\Controllers\Admin;

use App\Events\AdminMessageSent;
use App\Events\UnreadMessageCountUpdated;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Reply;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
    /**
     * Display the main messages inbox page.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Messages', [
            'messages' => ContactMessage::with(['user', 'replies.user'])->latest()->get(),
        ]);
    }

    /**
     * Store a new reply from the admin.
     */
    public function storeReply(Request $request, ContactMessage $message): JsonResponse
    {
        $validated = $request->validate([
            'reply_message' => 'required|string',
        ]);

        $newReply = $message->replies()->create([
            'user_id' => Auth::id(),
            'message' => $validated['reply_message'],
        ]);

        $message->update(['status' => 'replied']);

        $newReply->load('user');
        broadcast(new AdminMessageSent($newReply))->toOthers();

        // Notify resident about new reply
        if ($message->user_id) {
            $unreadReplies = Reply::whereHas('contactMessage', function ($query) use ($message) {
                    $query->where('user_id', $message->user_id);
                })
                ->where('user_id', '!=', $message->user_id)
                ->where('status', 'unread')
                ->with('contactMessage:id,subject')
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($reply) {
                    return [
                        'id' => $reply->id,
                        'subject' => $reply->contactMessage->subject ?? 'Reply to your message',
                        'message' => $reply->message,
                    ];
                });

            $unreadCount = $unreadReplies->count();
            
            broadcast(new UnreadMessageCountUpdated($message->user_id, $unreadCount, $unreadReplies->toArray()))->toOthers();
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Get the unread messages count and list for the notification bubble.
     * (Moved from MessagesCounterController)
     */
    public function getUnreadMessages(): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['messages' => [], 'count' => 0]);
        }

        $unreadConversations = ContactMessage::where(function ($query) {
            $query->where('status', 'unread')
                  ->orWhereHas('replies', function ($subQuery) {
                      $subQuery->where('status', 'unread')
                               ->whereHas('user', function ($userQuery) {
                                   $userQuery->where('role', 'resident');
                               });
                  });
        })->with('user')->get();

        $totalUnreadCount = $unreadConversations->count();
        
        $formattedMessages = $unreadConversations->map(function ($message) {
            return [
                'id' => 'contact-' . $message->id,
                'subject' => $message->subject,
                'message' => $message->message,
                'created_at' => $message->created_at,
            ];
        })->sortByDesc('created_at')->take(5)->values();

        return response()->json([
            'messages' => $formattedMessages,
            'count' => $totalUnreadCount,
        ]);
    }

    /**
     * Mark a conversation thread as read by the admin.
     * (Moved from MessageReaderController)
     */
    public function markAsRead(ContactMessage $contactMessage): RedirectResponse
    {
        $user = Auth::user();

        if (!$user || !in_array($user->role, ['admin', 'super_admin'])) {
            return back();
        }

        if ($contactMessage->status === 'unread') {
            $contactMessage->update(['status' => 'read']);
        }

        Reply::where('contact_message_id', $contactMessage->id)
             ->where('user_id', '!=', $user->id) 
             ->where('status', 'unread')
             ->update(['status' => 'read']);

        // Broadcast updated unread count to admins
        $this->broadcastUnreadCountToAdmins();

        return redirect()->route('admin.messages');
    }

    private function broadcastUnreadCountToAdmins()
    {
        $barangayId = Auth::user()->barangay_id;
        
        $unreadCount = ContactMessage::where('barangay_id', $barangayId)
            ->where('status', 'unread')
            ->count();

        $admins = User::where('barangay_id', $barangayId)
            ->where('role', 'admin')
            ->get();

        foreach ($admins as $admin) {
            broadcast(new UnreadMessageCountUpdated($admin->id, $unreadCount))->toOthers();
        }
    }
}