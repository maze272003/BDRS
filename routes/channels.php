<?php

use App\Models\ContactMessage;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate; // 👈 THE FIX: Add this line

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('admin-requests', function ($user) {
    return $user && ($user->can('be-admin') || $user->can('be-super-admin'));
});

Broadcast::channel('user-requests.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

/**
 * Authorize that a user can listen to a specific conversation channel.
 */
Broadcast::channel('conversation.{contactMessageId}', function ($user, $contactMessageId) {
    // Check if the user is an admin or super_admin. They can access any conversation.
    if (Gate::forUser($user)->allows('be-admin')) {
        return true;
    }

    // If not an admin, check if they are the original owner of the conversation thread.
    $contactMessage = ContactMessage::find($contactMessageId);

    // Ensure the message exists and the user is the owner.
    return $contactMessage && (int) $user->id === (int) $contactMessage->user_id;
});