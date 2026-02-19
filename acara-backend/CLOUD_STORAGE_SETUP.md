# Setting Up Google Cloud Storage (GCS) for Acara

When moving to production, you should switch from local storage to Cloud Storage to ensure files are accessible everywhere (emails, different servers, etc.).

## 1. Get Your Google Cloud Credentials

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (e.g., `acara-production`).
3.  **Enable API**: Search for "Google Cloud Storage JSON API" and enable it.
4.  **Create Service Account**:
    *   Go to **IAM & Admin** > **Service Accounts**.
    *   Click **Create Service Account**. Name it `laravel-storage`.
    *   **Grant Role**: Select `Storage Admin` (allows reading/writing files).
    *   Click **Done**.
5.  **Download Key**:
    *   Click on the newly created service account email.
    *   Go to the **Keys** tab -> **Add Key** -> **Create new key** -> **JSON**.
    *   A `.json` file will download. **Keep this safe!**

## 2. Configure Laravel

1.  **Move the Key**: Place the downloaded JSON file inside your backend project, e.g., `acara-backend/storage/google-cloud-key.json`.
    *   *Important*: Add `storage/google-cloud-key.json` to your `.gitignore` file so you don't accidentally push it to GitHub!

2.  **Update `.env`**:
    Open your `.env` file and update/add these lines:

    ```env
    FILESYSTEM_DISK=gcs
    
    GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
    GOOGLE_CLOUD_KEY_FILE=storage/google-cloud-key.json
    GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
    ```

## 3. Install the Plugin

You need to install the adapter for Laravel to talk to Google Cloud. Run this in your terminal:

```bash
composer require spatie/laravel-google-cloud-storage
```
*(Or the default Laravel adapter if you prefer, but Spatie's is commonly used. Check Laravel docs for the latest recommendation: `composer require google/cloud-storage`)*

## Summary
Once these steps are done, your code `Storage::disk('public')->put(...)` will automatically start sending files to Google Cloud instead of your local folder. No code changes required!
