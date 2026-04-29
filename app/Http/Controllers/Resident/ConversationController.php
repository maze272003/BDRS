<?php

namespace App\Http\Controllers\Resident;

use App\Events\ResidentMessageSent; // 👈 PALITAN ITO
use App\Events\UnreadMessageCountUpdated;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Reply;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;

class ConversationController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        
        // Find the latest thread to get its ID
        $latestThread = ContactMessage::where('user_id', $user->id)->latest()->first();
        $threadId = $latestThread ? $latestThread->id : null;
        
        $contactMessageIds = $latestThread ? [$threadId] : [];
        
        if (!empty($contactMessageIds)) {
            Reply::whereIn('contact_message_id', $contactMessageIds)
                 ->where('user_id', '!=', $user->id)
                 ->where('status', 'unread')
                 ->update(['status' => 'read']);
        }

        $contactMessages = !empty($contactMessageIds) ? ContactMessage::whereIn('id', $contactMessageIds)->with(['replies.user'])->get() : collect();

        $formattedMessages = collect();
        foreach ($contactMessages as $contactMessage) {
            $formattedMessages->push([
                'id' => 'contact-'.$contactMessage->id,
                'text' => "Subject: {$contactMessage->subject}\n\n{$contactMessage->message}",
                'sender' => 'user',
                'created_at' => $contactMessage->created_at->toIso8601String(),
            ]);

            foreach ($contactMessage->replies as $reply) {
                $formattedMessages->push([
                    'id' => 'reply-'.$reply->id,
                    'text' => $reply->message,
                    'sender' => $reply->user->role === 'resident' ? 'user' : 'admin',
                    'created_at' => $reply->created_at->toIso8601String(),
                ]);
            }
        }

        $sortedMessages = $formattedMessages->sortBy('created_at')->values();

        return response()->json([
            'messages' => $sortedMessages,
            'thread_id' => $threadId,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $user = Auth::user();
        $latestContactMessage = ContactMessage::where('user_id', $user->id)->latest()->first();

        if (!$latestContactMessage) {
            return response()->json(['error' => 'No conversation thread found.'], 404);
        }

        $newReply = Reply::create([
            'contact_message_id' => $latestContactMessage->id,
            'user_id' => $user->id,
            'message' => $validated['message'],
        ]);
        
        $latestContactMessage->update(['status' => 'unread']);

        $newReply->load('user'); 
        // 👇 GAMITIN ANG BAGONG EVENT
        broadcast(new ResidentMessageSent($newReply))->toOthers();

        // Notify admins about new unread message
        $this->broadcastUnreadCountToAdmins();

        return response()->json(['status' => 'success'], 201);
    }

    private function broadcastUnreadCountToAdmins()
    {
        $barangayId = Auth::user()->barangay_id;
        
        $unreadCount = ContactMessage::where('barangay_id', $barangayId)
            ->where('status', 'unread')
            ->count();

        $unreadMessages = ContactMessage::where('barangay_id', $barangayId)
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

        $admins = User::where('barangay_id', $barangayId)
            ->where('role', 'admin')
            ->get();

        foreach ($admins as $admin) {
            broadcast(new UnreadMessageCountUpdated($admin->id, $unreadCount, $unreadMessages->toArray()))->toOthers();
        }
    }
}