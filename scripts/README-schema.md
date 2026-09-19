# Schema Setup Guide

Follow these steps in order. Each step depends on the previous one.

---

## Step 1 — Apply the schema in Supabase

1. Open [supabase.com](https://supabase.com) → your project → **SQL Editor** → **New query**
2. Paste the entire contents of `scripts/schema.sql`
3. Click **Run**

You should see: `Success. No rows returned.`

> If you see `ERROR: type "vector" does not exist`, the `create extension if not exists vector;`
> line failed. This means pgvector is not available on your Supabase plan — contact support
> or use a paid project.

---

## Step 2 — Verify the schema

In the SQL Editor, run each of these separately:

```sql
-- Should return 1 row: the documents table
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'documents';

-- Should return 2 rows: documents_tsv_idx, documents_embedding_idx
select indexname from pg_indexes
where tablename = 'documents';

-- Should return 2 rows: keyword_search, vector_search
select routine_name from information_schema.routines
where routine_schema = 'public'
  and routine_type = 'FUNCTION'
  and routine_name in ('keyword_search', 'vector_search');
```

All three should return the expected rows before you proceed.

---

## Step 3 — Fix `.env.local`

Make sure `.env.local` has all three variables (no quotes, no spaces around `=`):

```
GEMINI_API_KEY=your_key_here
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

Find these in Supabase: **Project Settings → API → Project URL and anon key**.

---

## Step 4 — Run the seed script

```bash
node --experimental-vm-modules scripts/seed.js
```

Or if your `package.json` has `"type": "module"`:

```bash
node scripts/seed.js
```

Expected output:
```
🌱  Lexicon seed script starting…

   Supabase: https://your-project.supabase.co
   Pages:    20
   Model:    gemini-embedding-2 (dim=768)

Clearing existing documents…
   ✓  Cleared.

   [1/20] How React Works… ✓
   [2/20] PostgreSQL Vector Search… ✓
   ...
   [20/20] Next.js useRouter Hook… ✓

──────────────────────────────────────────────────
✅  Seeded:  20/20
```

---

## Step 5 — Verify in Supabase SQL Editor

### Row count
```sql
select count(*) from documents;
-- Expected: 20
```

### content_tsv auto-populated
```sql
select id, title, content_tsv is not null as has_tsv from documents limit 5;
-- Expected: all has_tsv = true
```

### embedding auto-populated
```sql
select id, title, embedding is not null as has_embedding from documents limit 5;
-- Expected: all has_embedding = true
```

### keyword_search function
```sql
select id, title, rank from keyword_search('react', 5);
-- Expected: rows containing 'react' in title/content, sorted by rank desc
```

### vector_search function

You need a real 768-dim vector to test this. The easiest way is to call it from
the seed script's embedding model output. For a quick manual test, paste a shortened
version and Postgres will pad/reject it. Better to test it from the app once
Task 12 (/api/search) is wired.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ENOTFOUND your-project.supabase.co` | Wrong Supabase URL | Copy from Dashboard → Settings → API |
| `Invalid API Key` | Wrong anon key | Regenerate in Dashboard → Settings → API |
| `column "content_tsv" is of type tsvector but...` | Trying to insert content_tsv | Remove it from the insert — it's GENERATED |
| `Expected 768-dim, got N` | Wrong Gemini model | Use `gemini-embedding-2` exactly |
| `duplicate key value violates unique constraint` | URL already exists | Clear table first or the script handles it |
