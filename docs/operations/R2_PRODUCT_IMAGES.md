# R2 Product Images

## Architecture

Product images are stored in Cloudflare R2 and served publicly through a Cloudflare custom domain.

- Product rows store public image URLs in `public.products.image_url`.
- The menu UI reads `image_url` through `getProductImageUrl`.
- Admin product image uploads go through `POST /api/admin/product-images`.
- The API route verifies the user is an admin, receives the uploaded image, and writes the original bytes to R2.
- Supabase Storage remains only as rollback/source history for the migrated product images.

## Bucket Name

`menu-images`

## Public URL

`https://menu-images.coconut.holiday`

Objects are served at:

```text
https://menu-images.coconut.holiday/<filename>
```

## Upload Flow

1. An admin selects an image in the product form.
2. The browser posts the file to `POST /api/admin/product-images`.
3. The server route checks admin access with Supabase auth.
4. The server uploads the file to R2 using the original filename as the object key.
5. The upload preserves the file MIME type from the browser upload.
6. The upload sets:

```text
Cache-Control: public, max-age=31536000, immutable
```

7. The route returns the public R2 URL.
8. The product mutation stores that R2 URL in `public.products.image_url`.

New product image uploads must not write to Supabase Storage.

## Required Environment Variables

Set these in Vercel for production. Use the same values for preview if preview admin uploads should work.

```text
CLOUDFLARE_ACCOUNT_ID=0e543750d0b264970f73dc17ef71c287
R2_BUCKET_NAME=menu-images
NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL=https://menu-images.coconut.holiday
R2_ACCESS_KEY_ID=<from Cloudflare R2 API token>
R2_SECRET_ACCESS_KEY=<from Cloudflare R2 API token>
```

Create the R2 credentials in Cloudflare:

1. Open Cloudflare dashboard for account `Steepdecline@gmail.com's Account`.
2. Go to R2 object storage.
3. Open API tokens.
4. Create an R2 API token with Object Read & Write permission.
5. Scope it to the `menu-images` bucket only.
6. Copy the Access Key ID into `R2_ACCESS_KEY_ID`.
7. Copy the Secret Access Key into `R2_SECRET_ACCESS_KEY`.

The secret access key is shown only once by Cloudflare. Do not commit it.

## Rollback Procedure

Rollback artifacts from the migration are stored outside the repository in:

```text
/Users/tyler/Documents/Codex/2026-07-02/ca/outputs/menu-images-r2-migration/
```

Important files:

- `product-image-url-backup.csv`
- `product-image-url-backup.json`
- `rollback-product-image-supabase-urls.sql`
- `r2-verification.json`

To roll back product rows to Supabase Storage URLs, run the SQL in `rollback-product-image-supabase-urls.sql` against project `wcplwmvbhreevxvsdmog`.

Do not delete R2 objects during rollback. Keeping both copies makes rollback reversible.

## Migrate Additional Images Later

For any future batch migration:

1. Inventory the exact product rows or object keys to migrate.
2. Copy only the referenced files.
3. Preserve filenames.
4. Preserve MIME types.
5. Set `Cache-Control: public, max-age=31536000, immutable`.
6. Verify every object by byte size and MIME type before updating database rows.
7. Export a backup mapping with `product_id`, old URL, and new URL.
8. Update `public.products.image_url` only after verification.
9. Leave Supabase Storage objects intact until a separate cleanup is explicitly approved.

Do not touch unrelated buckets such as passports, TM30 exports, bot photos, FAQ media, or profile pictures.

## Optimize Images Later Without Changing URLs

The current phase intentionally does not resize or optimize images.

A later optimization pass can keep URLs stable by replacing each R2 object in place with an optimized version at the same filename. Before doing that:

1. Export a fresh object inventory with byte sizes, MIME types, and checksums.
2. Keep a backup copy of the original R2 objects.
3. Optimize one small batch first.
4. Re-upload to the same object keys.
5. Preserve public URLs.
6. Verify menu rendering and cache behavior.

Because the URL path stays the same, no database update is required for an in-place optimization pass.
