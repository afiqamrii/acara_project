<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_name',
        'vendor_category',
        'services_offered',
        'pricing_starting_from',
        'pricing_unit',
        'pricing_description',
        'service_area',
        'portfolio_path',
        'bank_name',
        'bank_account_number',
        'bank_holder_name',
        'verification_documents_path',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}