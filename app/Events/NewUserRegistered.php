<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewUserRegistered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;

    public function __construct(User $user)
    {
        $this->user = $user->load(['profile', 'barangay']);
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin-registrations'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NewUserRegistered';
    }

    public function broadcastWith(): array
    {
        return [
            'user' => [
                'id' => $this->user->id,
                'email' => $this->user->email,
                'role' => $this->user->role,
                'verification_status' => $this->user->verification_status,
                'created_at' => $this->user->created_at->toIso8601String(),
                'profile' => [
                    'first_name' => $this->user->profile->first_name ?? null,
                    'last_name' => $this->user->profile->last_name ?? null,
                    'phone_number' => $this->user->profile->phone_number ?? null,
                ],
                'barangay' => [
                    'name' => $this->user->barangay->name ?? null,
                ],
            ],
        ];
    }
}