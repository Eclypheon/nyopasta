# 1. Dual progressive web applications with Appwrite backend

Date: 2026-11-11

## Status

Accepted

## Context

NYO Pasta operates a physical hawker store in Toa Payoh, Singapore. The business needs two distinct interfaces: one for customers ordering food at tables or ahead of time, and one for kitchen admin staff managing live orders, item availability, and loyalty card migrations.

Staff and customers use a variety of mobile devices, predominantly iOS and Android smartphones. Packaging and distributing native iOS and Android apps through app stores introduces app review latency, developer fees, and deployment friction. Furthermore, guest customers scanning a table QR code need immediate access to order without installing an application from an app store.

## Decision

We will structure the platform as a TypeScript monorepo with two Progressive Web Applications:

1. `apps/customer`: A customer ordering PWA supporting guest ordering, member authentication, real-time stock availability, cart checkout, and virtual loyalty cards.
2. `apps/admin`: A kitchen and counter administration PWA supporting live order queues, quick sold-out toggling, store schedule overrides, customer analytics, and QR-based loyalty card migration.

Both PWAs will share TypeScript domain types and API client utilities in `packages/shared`. Backend services, database collections, real-time subscriptions, and media storage will be powered by Appwrite Cloud, with programmatic setup handled via a Node provisioning script.

Both PWAs will feature an explicit in-app cache reset utility to guarantee that iOS standalone WebClips and cached service workers can be purged on demand without requiring users to delete their home screen bookmarks.

## Consequences

### Positive

- Customers can order immediately in their mobile browser or install the app to their home screen as a PWA.
- Kitchen staff get real-time order notifications and instantaneous stock toggles without requiring dedicated POS hardware.
- Schema, types, and domain rules remain unified in a single monorepo.
- Backend setup is automated and reproducible across Appwrite projects.

### Negative

- Web push notifications on iOS require explicit user permission and home screen installation.
- Camera access for admin QR code scanning relies on web browser media permissions.
