-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: localhost    Database: acara_db
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2014_10_12_000000_create_users_table',1),(2,'2014_10_12_100000_create_password_reset_tokens_table',1),(3,'2019_08_19_000000_create_failed_jobs_table',1),(4,'2019_12_14_000001_create_personal_access_tokens_table',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'auth_token','8cd67bad5cb094c7ebf0124d2740400e8b2d0914f6d983b41144645a006b8ed4','[\"*\"]',NULL,NULL,'2026-01-28 08:25:04','2026-01-28 08:25:04'),(2,'App\\Models\\User',1,'auth_token','2671b4677f50f992adc1cb45d1a3a6459598fe9c7fc85a30abdce2d371f0d8ea','[\"*\"]',NULL,NULL,'2026-01-28 17:24:45','2026-01-28 17:24:45'),(3,'App\\Models\\User',2,'auth_token','6ad5ad91873f7d58694326a36a049b9361d8fca9046c95c8d2aba66044285701','[\"*\"]',NULL,NULL,'2026-01-28 17:26:55','2026-01-28 17:26:55'),(4,'App\\Models\\User',2,'auth_token','8b051721ada55d4b28fa47f2fd18b57bd64ebbb97282ef4079891669d546ff33','[\"*\"]',NULL,NULL,'2026-01-28 17:28:32','2026-01-28 17:28:32'),(5,'App\\Models\\User',2,'auth_token','d9f38858ce40094a860c6906a31c7b2fcf97e02759445b17b91834e75b700219','[\"*\"]',NULL,NULL,'2026-01-28 17:28:37','2026-01-28 17:28:37'),(6,'App\\Models\\User',2,'auth_token','7665138f32df807af56984528477032dcec20109ffe5720e6e62e4dc6b4a47e5','[\"*\"]',NULL,NULL,'2026-01-28 17:28:42','2026-01-28 17:28:42'),(7,'App\\Models\\User',2,'auth_token','a564d71c24f1db9fde09890921ad29ad7bd4576dcc47722e1c3beeaf1517dc6c','[\"*\"]',NULL,NULL,'2026-01-28 17:28:43','2026-01-28 17:28:43'),(8,'App\\Models\\User',2,'auth_token','6e097a24b33005a61af5c9967ee4bf37c283a12aad33a777c061a4047f64012e','[\"*\"]',NULL,NULL,'2026-01-28 17:31:51','2026-01-28 17:31:51'),(9,'App\\Models\\User',2,'auth_token','46f07fad2665d394a5bdbc381871d1ca22d0c938042d44fc70fe8deabca6fe69','[\"*\"]',NULL,NULL,'2026-01-28 17:33:34','2026-01-28 17:33:34'),(10,'App\\Models\\User',2,'auth_token','6f96a442e0078c3c62177880914056b6fe36b4d9e689628442ccebe1bf7de691','[\"*\"]',NULL,NULL,'2026-01-28 17:38:21','2026-01-28 17:38:21'),(11,'App\\Models\\User',2,'auth_token','14c4782d59b891ff2370881d82a2ad071659fe38df7706d6e37b126e3ca008f0','[\"*\"]',NULL,NULL,'2026-01-28 17:50:39','2026-01-28 17:50:39'),(12,'App\\Models\\User',2,'auth_token','136786893dd2a7a9bc62d319a60649cccc939671beb042de2a2956dd50e15a76','[\"*\"]',NULL,NULL,'2026-01-28 18:04:58','2026-01-28 18:04:58'),(13,'App\\Models\\User',2,'auth_token','193c73417ed4d951db58ac2d23469f8c538251a8501a50f0bb09b228a1b4471f','[\"*\"]',NULL,NULL,'2026-01-28 18:34:48','2026-01-28 18:34:48'),(14,'App\\Models\\User',2,'auth_token','e8f53f97e24b49679dc89b856f9d79784d63742080a04df172c0b556f33b227c','[\"*\"]',NULL,NULL,'2026-01-28 18:40:35','2026-01-28 18:40:35'),(15,'App\\Models\\User',2,'auth_token','c10923f53130ceaee495d751816a9cf03ae00385270998d7fac66ece818360d1','[\"*\"]',NULL,NULL,'2026-01-28 18:50:51','2026-01-28 18:50:51'),(16,'App\\Models\\User',2,'auth_token','7cc7a20002e3b2ce31c188ccb7b7e1dd24356309f98517058f497aae3512a2f9','[\"*\"]',NULL,NULL,'2026-01-28 20:22:38','2026-01-28 20:22:38'),(17,'App\\Models\\User',2,'auth_token','c08dfe30a0243e39cc0131ada0bcc3219530b2e5048eb8e85aa550f4f6f4e3a4','[\"*\"]',NULL,NULL,'2026-01-28 20:22:55','2026-01-28 20:22:55'),(18,'App\\Models\\User',2,'auth_token','349aaca4149decf4fdf0266d9b687f3ed23c47e6829effacd6309c95275172a0','[\"*\"]',NULL,NULL,'2026-01-28 21:39:23','2026-01-28 21:39:23'),(19,'App\\Models\\User',2,'auth_token','5d5244b5d59815e0464683f7f3f624553a4542771d9caa3fda03fa7a036d72bc','[\"*\"]',NULL,NULL,'2026-01-28 23:03:01','2026-01-28 23:03:01'),(20,'App\\Models\\User',2,'auth_token','765fd365fd47882e07649e362c22f179b690b1f11bd4816eed842fb6a0973e98','[\"*\"]',NULL,NULL,'2026-01-29 01:01:38','2026-01-29 01:01:38');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','vendor','crew','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `status` enum('active','pending','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'System Admin','admin@acara.com',NULL,'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin','active',NULL,'2026-01-28 16:21:15','2026-01-28 16:21:15'),(2,'John Vendor','sales@vendor.com',NULL,'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','vendor','active',NULL,'2026-01-28 16:21:15','2026-01-28 16:21:15'),(3,'Sarah Crew','sarah.c@crew.com',NULL,'$2y$10$92IXUNpk$yY.Lq25YxG8Xm9...','crew','active',NULL,'2026-01-28 16:21:15','2026-01-28 16:21:15');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-30  9:54:22
