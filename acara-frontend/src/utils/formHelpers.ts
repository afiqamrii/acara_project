export const malaysiaLocations = {
    "Johor": ["Johor Bahru", "Tebrau", "Pasir Gudang", "Bukit Indah", "Skudai", "Kluang", "Batu Pahat", "Muar", "Kota Tinggi", "Segamat", "Pontian", "Mersing", "Tangkak", "Yong Peng"],
    "Kedah": ["Alor Setar", "Sungai Petani", "Kulim", "Langkawi", "Jitra", "Changlun", "Kuala Nerang", "Pendang", "Baling", "Sik", "Yan"],
    "Kelantan": ["Kota Bharu", "Pengkalan Chepa", "Kubang Kerian", "Tanah Merah", "Pasir Mas", "Tumpat", "Gua Musang", "Kuala Krai", "Machang", "Bachok", "Pasir Puteh"],
    "Kuala Lumpur": ["Ampang", "Bangsar", "Brickfields", "Bukit Bintang", "Bukit Jalil", "Cheras", "Damansara", "Gombak", "Jalan Ipoh", "Kepong", "KLCC", "Kuchai Lama", "Mont Kiara", "Old Klang Road", "OUG", "Pandan Indah", "Pandan Jaya", "Petaling Jaya", "Puchong", "Segambut", "Sentul", "Setapak", "Setiawangsa", "Sri Petaling", "Sungai Besi", "Taman Desa", "Taman Melawati", "Taman Tun Dr Ismail", "Titiwangsa", "Wangsa Maju"],
    "Labuan": ["Labuan"],
    "Melaka": ["Bandar Melaka", "Ayer Keroh", "Alor Gajah", "Jasin", "Masjid Tanah", "Bukit Beruang", "Batu Berendam", "Klebang", "Cheng"],
    "Negeri Sembilan": ["Seremban", "Port Dickson", "Nilai", "Bahau", "Tampin", "Kuala Pilah", "Rembau", "Jempol", "Mantin", "Lukut", "Senawang"],
    "Pahang": ["Kuantan", "Temerloh", "Bentong", "Mentakab", "Raub", "Jerantut", "Pekan", "Kuala Lipis", "Cameron Highlands", "Genting Highlands", "Rompin", "Bera"],
    "Penang": ["George Town", "Bayan Lepas", "Butterworth", "Bukit Mertajam", "Nibong Tebal", "Seberang Perai", "Balik Pulau", "Gelugor", "Tanjung Bungah", "Air Itam", "Jelutong", "Kepala Batas", "Simpang Ampat"],
    "Perak": ["Ipoh", "Taiping", "Sitiawan", "Teluk Intan", "Kampar", "Tapah", "Bidor", "Tanjung Malim", "Kuala Kangsar", "Gerik", "Parit Buntar", "Bagan Serai", "Lumut", "Seri Manjung", "Batu Gajah"],
    "Perlis": ["Kangar", "Arau", "Padang Besar", "Kuala Perlis"],
    "Putrajaya": ["Putrajaya"],
    "Sabah": ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu", "Keningau", "Semporna", "Penampang", "Papar", "Putatan", "Ranau", "Kudat", "Beaufort", "Kota Belud", "Tuaran"],
    "Sarawak": ["Kuching", "Miri", "Sibu", "Bintulu", "Kota Samarahan", "Sri Aman", "Sarikei", "Limbang", "Kapit", "Serian", "Bau", "Lundu", "Mukah", "Betong"],
    "Selangor": ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Klang", "Ampang", "Kajang", "Selayang", "Rawang", "Semenyih", "Banting", "Sepang", "Cyberjaya", "Puchong", "Seri Kembangan", "Gombak", "Hulu Langat", "Kuala Langat", "Kuala Selangor", "Sabak Bernam"],
    "Terengganu": ["Kuala Terengganu", "Chukai", "Dungun", "Kerteh", "Marang", "Besut", "Setiu", "Hulu Terengganu"]
};

export const malaysiaBanks = [
    "Maybank",
    "CIMB Bank",
    "Public Bank",
    "RHB Bank",
    "Hong Leong Bank",
    "AmBank",
    "UOB Malaysia",
    "Bank Rakyat",
    "OCBC Bank",
    "HSBC Bank",
    "Bank Islam",
    "Alliance Bank",
    "Standard Chartered",
    "MBSB Bank",
    "Citibank",
    "BSN (Bank Simpanan Nasional)",
    "Bank Muamalat",
    "Agrobank",
    "Al-Rajhi Bank",
    "Kuwait Finance House"
];

export const capitalizeFirstLetter = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toTitleCase = (str: string) => {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};
