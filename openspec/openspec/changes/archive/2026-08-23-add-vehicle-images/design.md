## Context

See `proposal.md` for motivation. The existing architecture keeps business data in MongoDB through feature-level actions and queries, while `supabase-integration` already defines a shared foundation for Supabase-backed features. Vehicle images are the first vehicle feature that needs binary object storage plus MongoDB metadata.

The behavior contract lives in `specs/vehicles/spec.md`. This design focuses on how to attach object storage to the existing `vehicles` feature without turning images into vehicle fields or coupling them to purchases, repairs, expenses, sales, or payments.

## Goals / Non-Goals

**Goals:**

- Keep image metadata queryable and auditable in MongoDB.
- Store image bytes outside MongoDB using the existing Supabase integration.
- Make image reads part of vehicle detail without changing vehicle identity, status, costs, or financial summaries.
- Keep upload and delete authorization server-side, using the same `ActionResult` and `requireRole` patterns as other vehicle mutations.
- Make deletion safe when storage and metadata operations can fail independently.

**Non-Goals:**

- Image editing, cropping, rotation, compression, AI tagging, OCR, or document classification.
- A required primary image, custom ordering, drag-and-drop sorting, or bulk reordering.
- Reusing the same image record across multiple vehicles or transaction modules.
- A generic attachment system for all domains. This change solves vehicle images only; a shared attachment abstraction can be introduced after a second domain needs it.

## Decisions

### Store bytes in Supabase Storage and metadata in MongoDB

MongoDB stores a `vehicleImages` collection with one document per uploaded image. The document owns the business metadata: `vehicleId`, `storageBucket`, `storagePath`, `originalFileName`, `mimeType`, `byteSize`, `createdAt`, `createdBy`, `deletedAt`, `deletedBy`, and optional `deleteError`.

Supabase Storage stores the binary object under a deterministic namespace such as `vehicles/<vehicleId>/<imageId>.<ext>`. The application never trusts the original file name as a storage path; it is metadata only.

Alternative considered: embedding image metadata in the vehicle document. That makes the detail query simple, but vehicle documents would grow for a concern that has its own lifecycle, delete state, and storage reconciliation needs. A separate collection gives clean indexes and avoids rewriting the vehicle every time an image changes.

Alternative considered: MongoDB GridFS. It avoids a second service, but the project already has Supabase integration and browser/server configuration for Supabase-backed features. Using Supabase keeps binary storage in the tool built for it and avoids pushing large files through MongoDB.

### Upload is a server action with metadata written after storage succeeds

The upload action validates role, vehicle state, file count, MIME type, and size before writing anything. It then creates or reserves an image identifier, uploads the object to Supabase Storage, writes the MongoDB metadata, and revalidates the vehicle detail route.

If storage upload fails, no metadata is created. If metadata write fails after storage succeeds, the action attempts best-effort object cleanup and returns a failure. Tests should cover the metadata path; storage cleanup is verified with a mock or adapter boundary.

Alternative considered: direct browser upload to Supabase with a signed URL followed by metadata confirmation. That scales better for very large files, but it introduces a two-phase orphan-object problem immediately. For the expected lote workflow, server-mediated upload is simpler and keeps authorization and validation in one place. If file sizes later outgrow server action limits, the same metadata model can support signed uploads with a pending/confirmed state.

### Deletion is logical in MongoDB plus best-effort storage removal

Deleting an image sets `deletedAt` and `deletedBy` first, then attempts to remove the Supabase object. Normal galleries filter deleted records. If object removal fails, the record stays deleted and stores `deleteError` for operational follow-up; the user-facing behavior remains correct because the image no longer appears.

Alternative considered: deleting the storage object first and then metadata. That can leave an active metadata record pointing to a missing image if MongoDB fails after storage succeeds. Marking metadata deleted first preserves the product behavior even when cleanup has to be retried.

### Validation rules live in the vehicles feature

The vehicles feature owns constants for allowed MIME types, maximum file size, and maximum active images per vehicle. Initial defaults should be conservative: JPEG, PNG, and WebP; 10 MB per file; 40 active images per vehicle. These are domain rules, not user-administered catalogs.

The action validates the server-observed MIME type and size. Client-side `accept` and helper text improve usability but are not security controls.

Alternative considered: making limits configurable in the database. There is no current admin workflow for operational settings, and changing image limits is a deployment-level decision for now.

### Read URLs are generated for detail rendering, not stored as permanent URLs

The metadata stores `storagePath`, not a long-lived public URL. Vehicle detail queries return DTOs with the metadata needed by the UI plus a renderable URL produced by the storage adapter. If the bucket is public, the URL can be derived; if it is private, the adapter can issue a short-lived signed URL without changing callers.

Alternative considered: storing public URLs in MongoDB. That makes rendering easy but couples persistent business records to bucket naming and access policy. Paths are the stable contract; URLs are runtime presentation.

### UI lives inside vehicle detail as a focused gallery section

The vehicle detail page composes a `VehicleImagesSection` from `features/vehicles/components`. It shows an empty state, thumbnail grid, larger preview dialog, upload control, and delete confirmation. The section must keep stable responsive dimensions so image loading does not shift the surrounding financial and operational sections.

Deletion controls are hidden from users without write permission, but the server action remains the enforcement point.

## Risks / Trade-offs

- **Large uploads can exceed Server Action or deployment body limits** -> keep the first version under a documented max size and isolate storage access behind an adapter so signed uploads can replace the transport later.
- **Storage object cleanup can fail after metadata deletion** -> preserve user-facing correctness with logical deletion and record `deleteError` for retry or manual cleanup.
- **Private buckets require signed URL refresh** -> return render URLs from the query layer and avoid persisting URLs in MongoDB.
- **Image count checks can race under concurrent uploads** -> enforce the count in the action before upload and re-check before metadata insert; accept that true hard limits may need a transaction or counter if concurrent bulk upload becomes common.
- **A vehicle with many images can slow detail rendering** -> return bounded metadata, responsive thumbnails, and avoid embedding binary data in MongoDB or server-rendered HTML.

## Migration Plan

1. Add the `vehicleImages` model and indexes. The collection starts empty.
2. Create or document the Supabase Storage bucket used for vehicle images and required environment configuration.
3. Deploy actions, queries, and UI together so metadata and gallery behavior ship atomically.
4. Rollback by hiding the gallery/upload UI and disabling image actions; existing metadata can remain inert because no vehicle core fields depend on it.

## Open Questions

- Should the storage bucket be public with stable object URLs or private with signed URLs? The design supports both by keeping storage paths in MongoDB and generating render URLs at query time.
- Should deleted image metadata remain permanently for audit, or be purged by a retention job later? The spec only requires deleted images to disappear from normal galleries.
