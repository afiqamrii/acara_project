<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceProfile extends Model
{
    use HasFactory;

    protected $table = 'service_profiles';

    protected $fillable = [
        'user_id',
        'service_name',
        'service_category',
        'service_details',
        'pricing_starting_from',
        'pricing_unit',
        'pricing_description',
        'portfolio_path',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
