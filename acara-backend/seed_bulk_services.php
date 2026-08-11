<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

$categories = ['Catering', 'Photography', 'Decor', 'Entertainment', 'Venues', 'Transportation', 'Planning'];
$states = ['Selangor', 'Kuala Lumpur', 'Johor', 'Pulau Pinang', 'Melaka', 'Perak', 'Pahang', 'Kedah'];
$townsByState = [
    'Selangor' => ['Petaling Jaya', 'Subang Jaya', 'Shah Alam', 'Klang', 'Cyberjaya'],
    'Kuala Lumpur' => ['Bangsar', 'Cheras', 'Mont Kiara', 'Wangsa Maju', 'Setapak'],
    'Johor' => ['Johor Bahru', 'Batu Pahat', 'Muar', 'Kluang'],
    'Pulau Pinang' => ['George Town', 'Bayan Lepas', 'Butterworth', 'Bukit Mertajam'],
    'Melaka' => ['Melaka City', 'Ayer Keroh', 'Alor Gajah'],
    'Perak' => ['Ipoh', 'Taiping', 'Teluk Intan'],
    'Pahang' => ['Kuantan', 'Temerloh', 'Bentong'],
    'Kedah' => ['Alor Setar', 'Sungai Petani', 'Langkawi']
];

$businessPrefixes = ['Grand', 'Elite', 'Premier', 'Creative', 'Majestic', 'Royal', 'Platinum', 'Golden', 'Silver', 'Crystal', 'Diamond', 'Perfect', 'Dream', 'Elegant', 'Classic', 'Modern', 'Vintage', 'Rustic', 'Luxury', 'Premium'];
$businessSuffixes = ['Events', 'Services', 'Studio', 'Group', 'Solutions', 'Co.', 'Enterprise', 'Sdn Bhd', 'Resources', 'Management', 'Partners', 'Agency'];

$adjectives = ['Beautiful', 'Stunning', 'Elegant', 'Premium', 'Exclusive', 'Luxury', 'Professional', 'Creative', 'Unique', 'Custom', 'Personalized', 'Bespoke', 'High-end', 'Top-tier', 'Exceptional', 'Incredible', 'Amazing', 'Fantastic', 'Fabulous', 'Gorgeous', 'Breathtaking', 'Spectacular', 'Magnificent', 'Outstanding', 'Superb', 'Flawless', 'Impeccable', 'Perfect', 'Ultimate', 'Unforgettable'];
$nounsByCategory = [
    'Catering' => ['Buffet', 'Banquet', 'Feast', 'Menu', 'Dining Experience', 'Culinary Journey', 'Food Station', 'Canapes', 'Dessert Bar', 'Beverage Service'],
    'Photography' => ['Coverage', 'Session', 'Package', 'Album', 'Gallery', 'Portraits', 'Highlights', 'Cinematography', 'Videography', 'Drone Footage'],
    'Decor' => ['Setup', 'Arrangement', 'Design', 'Styling', 'Backdrop', 'Centerpieces', 'Lighting', 'Drapery', 'Floral Arch', 'Mandap'],
    'Entertainment' => ['Performance', 'Show', 'Live Band', 'DJ Set', 'Emcee Service', 'Dancers', 'Magician', 'Photo Booth', 'Acoustic Duo', 'String Quartet'],
    'Venues' => ['Hall', 'Ballroom', 'Garden', 'Rooftop', 'Estate', 'Villa', 'Resort', 'Function Room', 'Marquee Tent', 'Banquet Space'],
    'Transportation' => ['Limousine', 'Classic Car', 'Shuttle Bus', 'Luxury Coach', 'VIP Transfer', 'Bridal Car', 'Guest Transport', 'Chauffeur Service', 'Helicopter Ride', 'Vintage Ride'],
    'Planning' => ['Coordination', 'Management', 'Consultation', 'Design', 'Timeline', 'Vendor Sourcing', 'On-the-day Service', 'Full Package', 'Partial Planning', 'Destination Wedding']
];

$password = Hash::make('password123');
$now = now();
$createdServicesCount = 0;
$numVendorsToCreate = 40;

DB::beginTransaction();

try {
    for ($i = 0; $i < $numVendorsToCreate; $i++) {
        $state = $states[array_rand($states)];
        $town = $townsByState[$state][array_rand($townsByState[$state])];
        $category = $categories[array_rand($categories)];
        $businessName = $businessPrefixes[array_rand($businessPrefixes)] . ' ' . $category . ' ' . $businessSuffixes[array_rand($businessSuffixes)];
        $firstName = ['Ahmad', 'Mohd', 'Nur', 'Siti', 'Lim', 'Tan', 'Wong', 'Lee', 'Ravi', 'Kavitha', 'Sarah', 'Adam', 'Michael', 'David', 'John'][array_rand(['Ahmad', 'Mohd', 'Nur', 'Siti', 'Lim', 'Tan', 'Wong', 'Lee', 'Ravi', 'Kavitha', 'Sarah', 'Adam', 'Michael', 'David', 'John'])];
        $lastName = ['Ali', 'Hassan', 'Abdullah', 'Chong', 'Wee', 'Goh', 'Singh', 'Kumar', 'Smith', 'Jones', 'Brown', 'Taylor'][array_rand(['Ali', 'Hassan', 'Abdullah', 'Chong', 'Wee', 'Goh', 'Singh', 'Kumar', 'Smith', 'Jones', 'Brown', 'Taylor'])];
        $name = $firstName . ' ' . $lastName;
        $email = strtolower($firstName) . '.' . strtolower($lastName) . rand(100, 999) . '@demo.my';

        // Create vendor user
        $userId = DB::table('users')->insertGetId([
            'name'              => $name,
            'email'             => $email,
            'role'              => 'vendor',
            'email_verified_at' => $now,
            'password'          => $password,
            'phone_number'      => '01' . rand(10000000, 99999999),
            'status'            => 'active',
            'profile_completed' => true,
            'created_at'        => $now,
            'updated_at'        => $now,
        ]);

        // Create vendor profile
        DB::table('vendor_profiles')->insert([
            'user_id'            => $userId,
            'ssm_number'         => 'SSM-' . strtoupper(Str::random(8)),
            'ssm_document_path'  => 'documents/demo_ssm_' . Str::random(6) . '.pdf',
            'business_name'      => $businessName,
            'business_link'      => 'https://www.' . strtolower(str_replace(' ', '', $businessName)) . '.com',
            'business_started_at'=> $now->copy()->subYears(rand(1, 15))->format('Y-m-d'),
            'years_of_experience'=> rand(1, 20),
            'service_area_state' => $state,
            'service_area_town'  => $town,
            'bank_name'          => ['Maybank', 'CIMB', 'Bank Islam', 'RHB', 'Public Bank', 'Hong Leong Bank'][array_rand(['Maybank', 'CIMB', 'Bank Islam', 'RHB', 'Public Bank', 'Hong Leong Bank'])],
            'bank_account_number'=> (string) rand(1000000000, 9999999999),
            'bank_holder_name'   => $name,
            'status'             => 'approved',
            'created_at'         => $now,
            'updated_at'         => $now,
        ]);

        $numServices = rand(2, 6);
        for ($j = 0; $j < $numServices; $j++) {
            $serviceCategory = rand(0, 10) > 8 ? $categories[array_rand($categories)] : $category; // 80% chance of being main category
            $noun = $nounsByCategory[$serviceCategory][array_rand($nounsByCategory[$serviceCategory])];
            $adjective = $adjectives[array_rand($adjectives)];
            $serviceName = $adjective . ' ' . $noun;
            
            $basePrice = rand(5, 200) * 50; // Random price between 250 and 10000
            $unit = ['event', 'package', 'session', 'hour', 'day'][array_rand(['event', 'package', 'session', 'hour', 'day'])];

            DB::table('service_profiles')->insert([
                'user_id'              => $userId,
                'service_name'         => $serviceName,
                'service_category'     => $serviceCategory,
                'service_details'      => 'Experience the best with our ' . strtolower($serviceName) . '. We provide top-quality service tailored to your needs. ' . Str::random(50) . '...',
                'pricing_starting_from'=> $basePrice,
                'pricing_unit'         => $unit,
                'status'               => 'approved',
                'is_active'            => true,
                'created_at'           => $now->copy()->subDays(rand(1, 180)),
                'updated_at'           => $now,
            ]);
            $createdServicesCount++;
        }
    }

    DB::commit();
    echo "✅ Done! Created {$createdServicesCount} new services across {$numVendorsToCreate} vendors.\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error: " . $e->getMessage() . "\n";
}
