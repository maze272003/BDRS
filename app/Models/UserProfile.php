<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;

class UserProfile extends Model
{
    use HasFactory;
    protected $appends = [
        'full_address',
        'valid_id_front_url',
        'valid_id_back_url',
        'face_image_url',
    ];
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'first_name',
        'middle_name',
        'last_name',
        'suffix', // ADDED: For suffixes like Jr., Sr., III
        'phone_number',
        // 'address', // REMOVED: Replaced by structured address fields
        'province',       // ADDED: For the user's province
        'city',           // ADDED: For the user's city/municipality
        'barangay',       // ADDED: For the user's barangay
        'street_address', // ADDED: For the specific street and house number
        'birthday',
        'gender',
        'civil_status',
        'place_of_birth',
        'profile_picture_url',
        'valid_id_type',
        'valid_id_front_path',
        'valid_id_back_path',
        'face_image_path',
        'signature_data'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'birthday' => 'date',
    ];

    /**
     * Get the user that owns the profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * UPDATED: Accessor to get the user's full name, including suffix.
     *
     * @return string
     */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name} {$this->suffix}");
    }

    /**
     * NEW: Accessor to get the user's full, formatted address.
     *
     * This combines the separate address fields into a single, readable string.
     *
     * @return string
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->street_address,
            $this->barangay,
            $this->city,
            $this->province,
        ], fn($value) => !empty($value));

        return implode(', ', $parts);
    }

    public function getValidIdFrontUrlAttribute(): ?string
    {
        return $this->publicUploadUrl($this->valid_id_front_path);
    }

    public function getValidIdBackUrlAttribute(): ?string
    {
        return $this->publicUploadUrl($this->valid_id_back_path);
    }

    public function getFaceImageUrlAttribute(): ?string
    {
        return $this->publicUploadUrl($this->face_image_path);
    }

    private function publicUploadUrl(?string $path): ?string
    {
        return $path ? Storage::disk('s3')->url($path) : null;
    }
    
}
