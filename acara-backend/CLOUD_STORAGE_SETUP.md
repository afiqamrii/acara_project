# Private SSM Document Storage on Railway

ACARA stores SSM verification documents in a private S3-compatible object
store. They are not exposed through `/storage` or a public bucket URL.

The API checks the signed-in user's role and then streams the document through
one of these protected endpoints:

- Vendor's own document: `GET /api/vendor/profile/ssm-document`
- Admin verification: `GET /api/admin/vendors/{vendorProfile}/ssm-document`

This avoids the 404s caused by Railway's ephemeral service filesystem and keeps
company documents inaccessible to anonymous visitors.

## 1. Create the production bucket

1. Open the ACARA project in Railway.
2. Select **Create** on the project canvas.
3. Select **Bucket**.
4. Name it `AcaraDocuments` and choose the same region as the API when possible.
5. Keep the bucket private. Railway buckets do not need public access for this
   implementation.

## 2. Connect the bucket to the API service

Open the API service's **Variables** tab and add:

```env
SSM_DOCUMENTS_DISK=s3

AWS_ACCESS_KEY_ID=${{AcaraDocuments.ACCESS_KEY_ID}}
AWS_SECRET_ACCESS_KEY=${{AcaraDocuments.SECRET_ACCESS_KEY}}
AWS_DEFAULT_REGION=${{AcaraDocuments.REGION}}
AWS_BUCKET=${{AcaraDocuments.BUCKET}}
AWS_ENDPOINT=${{AcaraDocuments.ENDPOINT}}
AWS_USE_PATH_STYLE_ENDPOINT=false
```

`AcaraDocuments` must match the Railway bucket service name. New Railway
buckets use virtual-hosted URLs, so path-style access is normally `false`. If
the bucket's Credentials tab explicitly says `path`, change it to `true`.

`FILESYSTEM_DISK` can remain `public`; SSM documents use the separate
`SSM_DOCUMENTS_DISK` setting.

The browser never receives these credentials. They belong only on the API
service. The email worker does not need them unless a future queued job reads or
writes SSM documents.

## 3. Deploy

Deploy the API after adding the variables. The Composer lock file includes the
Laravel S3 adapter required to connect to the bucket.

If configuration is cached by the deployment process, clear and rebuild it:

```bash
php artisan optimize:clear
php artisan config:cache
```

## 4. Copy documents uploaded before this change

Database records contain the object path, so the filename does not need to
change. Run the migration command from an environment that can access both the
old local files and the new bucket:

```bash
php artisan ssm-documents:migrate --from=public
```

The command is safe to rerun: objects already present in the destination are
skipped. It keeps the original local files by default. After confirming every
document opens correctly, the optional cleanup form is:

```bash
php artisan ssm-documents:migrate --from=public --delete-source
```

Important: a document lost during an earlier Railway redeploy cannot be
recovered from the database, because the database stores only its path. If the
file is also unavailable on a developer machine or backup, ask that vendor to
upload it again.

## 5. Verify production

1. Sign in as a vendor and upload or replace an SSM document.
2. Refresh the vendor company profile and select **View document**.
3. Sign in as an admin, open **Vendor Verifications**, and view the same
   document.
4. Confirm the link still works after redeploying the API.
5. Confirm a signed-out request to either endpoint receives `401`, and an
   organizer receives `403` from the admin endpoint.

## Local development

Local development uses:

```env
SSM_DOCUMENTS_DISK=private
```

Files are stored under `storage/app/private/vendor_ssm_documents` and are
served only through the authenticated API endpoints.
