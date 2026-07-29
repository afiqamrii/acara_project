<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application. Just store away!
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Private Verification Documents
    |--------------------------------------------------------------------------
    |
    | SSM documents contain sensitive company information and must never use
    | the public web disk. Use "private" locally and "s3" with a private,
    | S3-compatible bucket in production.
    |
    */

    'ssm_documents_disk' => env('SSM_DOCUMENTS_DISK', 'private'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Here you may configure as many filesystem "disks" as you wish, and you
    | may even configure multiple disks of the same driver. Defaults have
    | been set up for each driver as an example of the required values.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'private' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'visibility' => 'private',
            'throw' => true,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID', env('ACCESS_KEY_ID')),
            'secret' => env('AWS_SECRET_ACCESS_KEY', env('SECRET_ACCESS_KEY')),
            'region' => env('AWS_DEFAULT_REGION', env('REGION', 'auto')),
            'bucket' => env('AWS_BUCKET', env('AWS_S3_BUCKET_NAME', env('BUCKET'))),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT', env('AWS_ENDPOINT_URL', env('ENDPOINT'))),
            'use_path_style_endpoint' => env(
                'AWS_USE_PATH_STYLE_ENDPOINT',
                env('AWS_S3_URL_STYLE', 'virtual') === 'path',
            ),
            'throw' => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
