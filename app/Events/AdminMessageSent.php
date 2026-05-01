<?php

namespace App\Events;

use App\Models\Reply;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AdminMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $reply;

    public function __construct(Reply $reply)
    {
        $this->reply = $reply->loadMissing('user');
    }

    public function broadcastOn(): array
    {
        // Ang admin ay magbo-broadcast sa channel ng conversation
        return [
            new PrivateChannel('conversation.' . $this->reply->contact_message_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'AdminMessageSent';
    }

    public function broadcastWith(): array
    {
        return [
            'reply' => $this->reply,
        ];
    }
}
