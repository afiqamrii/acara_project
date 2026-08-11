<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== service_profiles columns ===\n";
$cols = Schema::getColumnListing('service_profiles');
print_r($cols);

echo "\n=== vendor_profiles columns ===\n";
$cols2 = Schema::getColumnListing('vendor_profiles');
print_r($cols2);

echo "\n=== users columns ===\n";
$cols3 = Schema::getColumnListing('users');
print_r($cols3);

echo "\n=== User ID 21 ===\n";
$u = DB::table('users')->where('id', 21)->first();
print_r($u);
