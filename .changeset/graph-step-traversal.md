---
'@workflow/swc-plugin': patch
---

Fix graph mode traversal so it walks workflow bodies with a DFS pass, capturing direct calls, callbacks, and nested workflow references in the emitted graph manifest.

