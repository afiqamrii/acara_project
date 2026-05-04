<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceAvailability extends Model
{
    protected $table = 'service_availabilities';

    protected $fillable = ['service_profile_id', 'available_date'];

    protected $casts = ['available_date' => 'date'];

    public function serviceProfile()
    {
        return $this->belongsTo(ServiceProfile::class);
    }
}
