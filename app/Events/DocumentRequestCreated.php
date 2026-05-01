<?php
// app/Events/DocumentRequestCreated.php

namespace App\Events;

use App\Models\DocumentRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log; // <-- Add this

class DocumentRequestCreated implements ShouldBroadcastNow
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
        Log::info('DocumentRequestCreated event constructed for request ID: ' . $documentRequest->id);
        // Eager load relationships so they are included in the broadcast
        $this->documentRequest = $documentRequest->load(['user.profile', 'documentType']);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // We use a private channel because only authenticated admins should receive this.
        return [
            new PrivateChannel('admin-requests'),
        ];
    }

    /**
     * The event's broadcast name.
     *
     * This gives a clean name for the frontend listener.
     */
    public function broadcastAs(): string
    {
        return 'NewDocumentRequest';
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
