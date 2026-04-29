<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UnreadMessageCountUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $count;
    public $messages;

    public function __construct(int $userId, int $count, array $messages = [])
    {
        $this->userId = $userId;
        $this->count = $count;
        $this->messages = $messages;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId . '.messages'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'UnreadMessageCountUpdated';
    }
}
