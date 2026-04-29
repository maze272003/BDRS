<?php

namespace App\Services;

use App\Events\UnreadMessageCountUpdated;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Support\Collection;

class AdminUnreadMessageNotifier
{
    /**
     * Build the unread-message payload shown in the admin notification badge.
     */
    public function payloadForBarangay(int $barangayId): array
    {
        $unreadConversations = $this->unreadConversationsQuery($barangayId)
            ->with('user')
            ->latest('updated_at')
            ->get();

        return [
            'messages' => $unreadConversations
                ->take(5)
                ->map(fn (ContactMessage $message): array => [
                    'id' => 'contact-' . $message->id,
                    'subject' => $message->subject,
                    'message' => $message->message,
                    'created_at' => $message->created_at,
                ])
                ->values()
                ->all(),
            'count' => $unreadConversations->count(),
        ];
    }

    /**
     * Broadcast the unread payload to every admin user in the barangay.
     */
    public function broadcastToBarangayAdmins(int $barangayId): void
    {
        $payload = $this->payloadForBarangay($barangayId);

        $this->adminRecipients($barangayId)->each(function (User $admin) use ($payload): void {
            broadcast(new UnreadMessageCountUpdated(
                $admin->id,
                $payload['count'],
                $payload['messages'],
            ));
        });
    }

    private function unreadConversationsQuery(int $barangayId)
    {
        return ContactMessage::withoutGlobalScopes()
            ->where('barangay_id', $barangayId)
            ->where(function ($query): void {
                $query->where('status', 'unread')
                    ->orWhereHas('replies', function ($replyQuery): void {
                        $replyQuery->where('status', 'unread')
                            ->whereHas('user', function ($userQuery): void {
                                $userQuery->where('role', 'resident');
                            });
                    });
            });
    }

    private function adminRecipients(int $barangayId): Collection
    {
        return User::query()
            ->where('barangay_id', $barangayId)
            ->whereIn('role', ['admin', 'super_admin'])
            ->get();
    }
}
