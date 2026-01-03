# R2 Bucket Configuration

**Bucket Name:** `proof-of-build-uploads`

## Bucket Structure

This document defines the canonical R2 bucket layout for Proof-of-Build, as specified in `ARCHITECTURE.md` Section 3.

### Directory Layout

```
proof-of-build-uploads/
├── uploads/
│   └── {project_id}/
│       ├── manifest.json          ← completion signal (triggers queue)
│       ├── frames/
│       │   ├── 001.png
│       │   ├── 002.png
│       │   └── ...
│       ├── terminal/
│       │   ├── 001.txt
│       │   ├── 002.txt
│       │   └── ...
│       └── logs/
│           └── app.log
│
├── scripts/
│   └── {project_id}.json           ← AI-generated script
│
├── audio/
│   └── {project_id}.m4a            ← ElevenLabs-generated audio
│
└── state/
    └── {project_id}.json           ← orchestration state (processing/ready/error)
```

## Access Rules

- **CLI**: Write-only access to `uploads/{project_id}/**`
- **Worker**: Read/write access to all directories
- **Pages**: Read-only access to all directories (for playback UI)

## Event Notifications

- **Trigger**: `object-create` events on `uploads/{project_id}/manifest.json`
- **Target**: `proof-of-build-queue`
- **Filter**: `--suffix manifest.json` (only triggers on manifest.json uploads)

## Lifecycle Policies

Future consideration:
- Old uploads cleanup (after X days)
- Completed projects retention (keep for Y days)
- Error state retention (keep for Z days for debugging)

---

**See Also:**
- `ARCHITECTURE.md` Section 3 (Canonical Data Model)
- `IMPLEMENTATION_PLAN.md` Phase 2

