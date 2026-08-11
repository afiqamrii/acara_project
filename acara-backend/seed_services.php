<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

// ── Seed data ─────────────────────────────────────────────────────────
$vendorData = [
    // [ name, email, business_name, state, town, category_services ]
    [
        'Nur Aisyah binti Mohd Razak', 'aisyah.events@demo.my',
        'Aisyah Creative Events', 'Selangor', 'Shah Alam',
        [
            ['Dreamy Floral Arch Decor',      'Decor',          3500.00, 'event',   'Stunning floral arch setup with premium fresh flowers, complete with fairy lights and drapery for your dream wedding entrance.'],
            ['Full Wedding Decoration Set',   'Decor',          8500.00, 'package', 'Complete pelamin, entrance arch, guest table centrepieces, and photo booth backdrop. Includes setup and teardown.'],
        ],
    ],
    [
        'Ahmad Firdaus bin Hassan', 'firdaus.lens@demo.my',
        'Firdaus Photography Studio', 'Kuala Lumpur', 'Cheras',
        [
            ['Premium Wedding Photography',    'Photography',    4500.00, 'event',   '12-hour coverage with 2 photographers, 500+ edited photos, online gallery, and a premium album of 60 pages.'],
            ['Corporate Event Photography',    'Photography',    2800.00, 'event',   'Professional corporate event coverage with quick turnaround. Includes 300+ edited photos and social media-ready exports.'],
            ['Pre-Wedding Outdoor Shoot',      'Photography',    1800.00, 'session', 'Half-day outdoor shoot at 2 locations of your choice. 100+ edited photos with cinematic colour grading.'],
        ],
    ],
    [
        'Siti Nurhaliza binti Abdullah', 'siti.catering@demo.my',
        'Dapur Siti Catering', 'Johor', 'Johor Bahru',
        [
            ['Malay Buffet Catering (100 pax)', 'Catering',      3200.00, 'event',   'Traditional Malay buffet with nasi minyak, rendang daging, ayam masak merah, and 6 side dishes. Includes tent and tables.'],
            ['Western Fusion Buffet (100 pax)', 'Catering',      4500.00, 'event',   'Western fusion menu featuring grilled lamb, mushroom soup, pasta carbonara, and dessert station. Premium dinnerware included.'],
            ['Hi-Tea Set for 50 pax',           'Catering',      1500.00, 'event',   'Elegant hi-tea set with scones, finger sandwiches, kuih-muih, and premium tea selection.'],
        ],
    ],
    [
        'Muhammad Hafiz bin Ismail', 'hafiz.sounds@demo.my',
        'Hafiz Sound & Entertainment', 'Pulau Pinang', 'George Town',
        [
            ['Live Band Performance',           'Entertainment',  3000.00, 'event',   '4-piece live band with vocalist, 3-hour performance covering pop, jazz, and R&B hits. Full PA system included.'],
            ['DJ Set with Lighting',            'Entertainment',  2000.00, 'event',   'Professional DJ with premium sound system, LED dance lights, haze machine, and custom playlist curation.'],
            ['Emcee & Host Service',            'Entertainment',  1200.00, 'event',   'Bilingual MC (BM/English) for weddings, corporate dinners, and formal events. Script consultation included.'],
        ],
    ],
    [
        'Farah Amira binti Yusof', 'farah.venues@demo.my',
        'Grand Amira Venues', 'Selangor', 'Petaling Jaya',
        [
            ['Rooftop Garden Venue',            'Venue',          6000.00, 'event',   'Stunning rooftop garden venue with city skyline view. Capacity 200 pax. Includes basic sound system and in-house catering option.'],
            ['Ballroom Package (300 pax)',       'Venue',         12000.00, 'event',   'Grand ballroom with crystal chandeliers, full AC, built-in stage, bridal suite, and valet parking for 100 cars.'],
        ],
    ],
    [
        'Razali bin Osman', 'razali.transport@demo.my',
        'Razali Luxury Transport', 'Kuala Lumpur', 'Bangsar',
        [
            ['Luxury Bridal Car Package',       'Transportation', 1800.00, 'event',   'Mercedes S-Class or BMW 7-Series with professional chauffeur. Includes flower decoration and 6-hour service.'],
            ['VIP Guest Shuttle (40-seater)',    'Transportation', 2500.00, 'event',   'Luxury 40-seater coach with AC, WiFi, and onboard refreshments for guest transport between venues.'],
            ['Classic Vintage Car Rental',       'Transportation', 2200.00, 'event',   'Restored classic vintage car (1960s Rolls-Royce or Mercedes) with chauffeur. Perfect for grand wedding entrances.'],
        ],
    ],
    [
        'Zainab binti Ahmad', 'zainab.plan@demo.my',
        'Zainab Event Planning', 'Negeri Sembilan', 'Seremban',
        [
            ['Full Wedding Planning',           'Planning',       8000.00, 'package', 'End-to-end wedding planning: vendor coordination, timeline management, budget tracking, and day-of coordination for up to 500 pax.'],
            ['Day-Of Coordination',             'Planning',       2500.00, 'event',   'Professional day-of coordinator to manage your event timeline, vendor arrivals, and ensure everything runs smoothly.'],
            ['Corporate Event Planning',        'Planning',       5000.00, 'event',   'Full corporate event management: venue selection, vendor coordination, itinerary planning, and registration management.'],
        ],
    ],
    [
        'Tan Wei Ming', 'weiming.photo@demo.my',
        'WM Visual Studio', 'Perak', 'Ipoh',
        [
            ['Cinematic Wedding Video',         'Photography',    5500.00, 'event',   'Cinematic same-day-edit video + full highlight reel. 2 videographers, drone footage, and 4K delivery.'],
            ['Event Videography Package',       'Photography',    3000.00, 'event',   'Professional videography for corporate events, product launches, and gala dinners. Includes 2-minute highlight reel.'],
        ],
    ],
    [
        'Noraini binti Mohamad', 'noraini.catering@demo.my',
        'Warisan Dapur Noraini', 'Terengganu', 'Kuala Terengganu',
        [
            ['East Coast Gulai Buffet (150 pax)', 'Catering',    4200.00, 'event',   'Authentic East Coast menu: nasi dagang, gulai ikan tongkol, keropok lekor, and traditional desserts. Serves 150 guests.'],
            ['BBQ Night Setup (80 pax)',           'Catering',    3800.00, 'event',   'Outdoor BBQ station with marinated lamb, chicken, seafood, and salad bar. Includes charcoal grills and serving staff.'],
        ],
    ],
    [
        'Kavitha a/p Subramaniam', 'kavitha.decor@demo.my',
        'Kavitha Grand Decor', 'Melaka', 'Melaka City',
        [
            ['Indian Wedding Mandap Decor',     'Decor',          7000.00, 'event',   'Traditional Indian wedding mandap with jasmine garlands, marigold accents, and draped fabrics. Full ceremony setup included.'],
            ['Outdoor Garden Party Decor',       'Decor',          4000.00, 'event',   'Rustic garden party setup with wooden arches, fairy lights, lanterns, and flower arrangements for up to 150 guests.'],
            ['Minimalist Modern Decor',          'Decor',          3000.00, 'event',   'Clean minimalist decor with geometric shapes, white drapery, and subtle greenery. Perfect for modern themed events.'],
        ],
    ],
    [
        'Lim Chong Wei', 'chongwei.music@demo.my',
        'CW Entertainment Group', 'Sarawak', 'Kuching',
        [
            ['Full Sound System Rental',        'Entertainment',  1500.00, 'event',   'Professional PA system rental with mixing console, speakers, subwoofers, and wireless mics. Includes technician.'],
            ['Cultural Performance Package',    'Entertainment',  3500.00, 'event',   'Traditional dance performance troupe (Malay, Chinese, or Indian) with live gamelan/kompang accompaniment.'],
        ],
    ],
    [
        'Amirul bin Kamarudin', 'amirul.venue@demo.my',
        'Dewan Amirul Events', 'Kedah', 'Alor Setar',
        [
            ['Community Hall Package',          'Venue',          2500.00, 'event',   'Spacious community hall with AC, 400 pax capacity, parking for 80 cars, and basic PA system included.'],
            ['Outdoor Lakeside Venue',          'Venue',          4500.00, 'event',   'Beautiful lakeside venue with natural scenery, gazebo, and fairy-light canopy. Perfect for intimate garden weddings.'],
        ],
    ],
];

$password = Hash::make('password123');
$now = now();
$createdCount = 0;

// Clean up any orphaned demo users from previous failed attempts
$demoEmails = array_column($vendorData, 1);
DB::table('users')->whereIn('email', $demoEmails)->delete();

DB::beginTransaction();

try {
    foreach ($vendorData as $vendor) {
        [$name, $email, $businessName, $state, $town, $services] = $vendor;

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
            'business_link'      => '',
            'business_started_at'=> $now->copy()->subYears(rand(2, 8))->format('Y-m-d'),
            'years_of_experience'=> rand(2, 10),
            'service_area_state' => $state,
            'service_area_town'  => $town,
            'bank_name'          => collect(['Maybank', 'CIMB', 'Bank Islam', 'RHB', 'Public Bank'])->random(),
            'bank_account_number'=> (string) rand(1000000000, 9999999999),
            'bank_holder_name'   => $name,
            'status'             => 'approved',
            'created_at'         => $now,
            'updated_at'         => $now,
        ]);

        // Create service profiles
        foreach ($services as $service) {
            [$serviceName, $category, $price, $unit, $details] = $service;

            DB::table('service_profiles')->insert([
                'user_id'              => $userId,
                'service_name'         => $serviceName,
                'service_category'     => $category,
                'service_details'      => $details,
                'pricing_starting_from'=> $price,
                'pricing_unit'         => $unit,
                'status'               => 'approved',
                'is_active'            => true,
                'created_at'           => $now->copy()->subDays(rand(1, 60)),
                'updated_at'           => $now,
            ]);
            $createdCount++;
        }

        echo "✓ Created vendor: {$businessName} ({$name}) with " . count($services) . " services\n";
    }

    DB::commit();
    echo "\n✅ Done! Created {$createdCount} new services across " . count($vendorData) . " vendors.\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
