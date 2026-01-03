# Infrastructure Setup Guide

This directory contains infrastructure configuration and documentation for Proof-of-Build.

## Directory Structure

```
infra/
├── r2/
│   └── bucket-config.md          # R2 bucket structure and configuration
├── wrangler/
│   └── worker.toml               # Worker configuration template
└── README.md                     # This file
```

## Required Infrastructure

### 1. R2 Bucket

**Name:** `proof-of-build-uploads`

**Purpose:** Stores all project data:
- Uploaded artifacts (screenshots, terminal, logs)
- Generated scripts
- Generated audio
- State files

**Creation:**
```bash
wrangler r2 bucket create proof-of-build-uploads
```

### 2. Queue

**Name:** `proof-of-build-queue`

**Purpose:** Receives event notifications when `manifest.json` is uploaded to R2.

**Creation:**
```bash
wrangler queues create proof-of-build-queue
```

**Note:** Requires Workers Paid plan.

### 3. Event Notification

**Purpose:** Triggers queue messages when `manifest.json` is uploaded (completion signal).

**Creation:**
```bash
wrangler r2 bucket notification create proof-of-build-uploads \
  --event-type object-create \
  --queue proof-of-build-queue \
  --suffix manifest.json
```

**Behavior:**
- Only triggers on `object-create` events
- Only triggers when object key ends with `manifest.json`
- Sends message to `proof-of-build-queue`
- Worker consumes messages and processes pipeline

### 4. Worker Configuration

**Template:** `infra/wrangler/worker.toml`

**Usage:**
1. Copy `infra/wrangler/worker.toml` to `apps/worker/wrangler.toml`
2. Customize as needed
3. Deploy Worker (Phase 3)

## Setup Checklist

- [ ] Create R2 bucket: `proof-of-build-uploads`
- [ ] Create queue: `proof-of-build-queue`
- [ ] Create event notification (triggers on manifest.json)
- [ ] Verify bucket is accessible
- [ ] Verify queue is accessible
- [ ] Test event notification (upload manifest.json via CLI)

## Validation

After setup, verify:

1. **Bucket exists:**
   ```bash
   wrangler r2 bucket list
   ```

2. **Queue exists:**
   ```bash
   wrangler queues list
   ```

3. **Event notification exists:**
   ```bash
   wrangler r2 bucket notification list proof-of-build-uploads
   ```

4. **Test flow:**
   ```bash
   # Upload artifacts and manifest via CLI
   cd apps/cli
   npm run dev -- upload --project test-001 --frames ./screenshots
   npm run dev -- manifest --project test-001 --artifacts-file /tmp/artifacts-test-001.json
   
   # Check queue for message (after Worker is deployed)
   # Worker should consume message and process pipeline
   ```

## Next Steps

After infrastructure is set up:

1. **Phase 3:** Build Worker orchestration
2. **Phase 4:** Integrate AI and audio generation
3. **Phase 5:** Build playback UI

---

**See Also:**
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_PLAN.md` Phase 2 - Detailed setup instructions
- `infra/r2/bucket-config.md` - Bucket structure details
- `infra/wrangler/worker.toml` - Worker configuration template

