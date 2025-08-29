# Changelog

## v5.4.11

- Ops/Batch Management: Fix Activate button staying disabled after CSV uploads by refreshing the selected batch from Firestore once uploads complete.
- Health updates: Clean listener setup/cleanup and add throttling to avoid repeated "Loading health status" logs after uploads.
- No breaking changes to CSV formats or existing flows.

