---
"@workflow/core": patch
"@workflow/world": patch
"@workflow/cli": patch
"@workflow/web": patch
"@workflow/world-testing": patch
---

Make serialization functions async with Encryptor interface

All 8 dehydrate/hydrate functions in the serialization layer are now async and accept an `Encryptor` parameter for future encryption support. Adds `Encryptor`, `EncryptionContext`, and `KeyMaterial` interfaces to `@workflow/world`. This is a no-op refactor — the encryptor parameter is unused in this change.
