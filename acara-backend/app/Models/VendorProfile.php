<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ssm_number',
        'ssm_document_path',
        'business_name',
        'business_link',
        'business_started_at',
        'service_area_state',
        'service_area_town',
        'bank_name',
        'bank_account_number',
        'bank_holder_name',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
