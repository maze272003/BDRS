<?php

namespace App\Events;

use App\Models\DocumentRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DocumentRequestStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The document request instance.
     *
     * @var \App\Models\DocumentRequest
     */
    public $documentRequest;

    /**
     * Create a new event instance.
     */
    public function __construct(DocumentRequest $documentRequest)
    {
        Log::info('DocumentRequestStatusUpdated event constructed for request ID: ' . $documentRequest->id);
        // Eager load relationships to ensure they are included in the broadcast payload
        $this->documentRequest = $documentRequest->load(['user.profile', 'documentType']);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin-requests'),
            new PrivateChannel('user-requests.' . $this->documentRequest->user_id),
        ];
    }

    /**
     * The event's broadcast name.
     *
     * This provides a clean, specific name for our frontend listener.
     */
    public function broadcastAs(): string
    {
        return 'StatusUpdated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'request' => $this->documentRequest,
        ];
    }
}