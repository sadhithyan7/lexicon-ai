-- =============================================================================
-- Lexicon — Postgres Schema for Hybrid Search
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: every statement uses IF NOT EXISTS or CREATE OR REPLACE
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Enable pgvector
--    pgvector adds the vector type and the <=> cosine distance operator.
--    Supabase projects have it available but it must be explicitly enabled.
-- ---------------------------------------------------------------------------
create extension if not exists vector;


-- ---------------------------------------------------------------------------
-- 2. Documents table
--
--    content_tsv: a GENERATED ALWAYS AS ... STORED column — Postgres
--    automatically recomputes it on every INSERT/UPDATE using English
--    stemming and stop-word removal. We don't set it manually; it just
--    appears. The GIN index below makes full-text queries fast.
--
--    embedding: vector(768) — must match the Gemini text-embedding-004
--    output dimension. Stored as a pgvector binary type.
--
--    url: UNIQUE ensures the extension's upsert on re-visit doesn't
--    duplicate rows — ON CONFLICT (url) DO UPDATE is the pattern in
--    the /api/save route.
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id          bigint generated always as identity primary key,
  url         text   not null unique,
  title       text   not null,
  content     text   not null,
  content_tsv tsvector
              generated always as (to_tsvector('english', title || ' ' || content)) stored,
  embedding   vector(768),
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 3a. GIN index on content_tsv for full-text keyword search
--     GIN (Generalized Inverted Index) is the standard index type for
--     tsvector columns. It stores every lexeme → set of row positions,
--     making @@ (match) queries extremely fast even on large tables.
-- ---------------------------------------------------------------------------
create index if not exists documents_tsv_idx
  on documents using gin(content_tsv);


-- ---------------------------------------------------------------------------
-- 3b. HNSW index on embedding for approximate nearest-neighbor vector search
--     HNSW (Hierarchical Navigable Small World) is the modern, fast ANN
--     graph index provided by pgvector. It trades a small amount of recall
--     for much faster query time compared to the older IVFFlat index.
--
--     vector_cosine_ops tells the index to optimize for cosine distance
--     (the <=> operator), which is correct for normalized embedding models
--     like Gemini text-embedding-004.
--
--     m=16, ef_construction=64 are the pgvector defaults — good starting
--     point; tune m upward (e.g. 32) if recall drops noticeably at scale.
-- ---------------------------------------------------------------------------
create index if not exists documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);


-- ---------------------------------------------------------------------------
-- 4a. keyword_search(query text, match_count int)
--
--     Uses Postgres full-text search:
--     - plainto_tsquery converts a plain string to a tsquery (handles
--       spaces, no need for users to write 'react & hooks')
--     - ts_rank scores rows by how well their content_tsv matches the
--       query, taking term frequency and position into account
--     - The WHERE clause pre-filters to only rows that actually match
--       before ranking, which is critical for index use
--
--     Returns: id, title, url, content, rank (float, higher = better)
--     The /api/search route calls this and the vector function separately,
--     then merges results with RRF in application code.
-- ---------------------------------------------------------------------------
create or replace function keyword_search(
  query       text,
  match_count int default 10
)
returns table (
  id      bigint,
  title   text,
  url     text,
  content text,
  rank    float
)
language sql stable
as $$
  select
    d.id,
    d.title,
    d.url,
    d.content,
    ts_rank(d.content_tsv, plainto_tsquery('english', query))::float as rank
  from documents d
  where d.content_tsv @@ plainto_tsquery('english', query)
  order by rank desc
  limit match_count;
$$;


-- ---------------------------------------------------------------------------
-- 4b. vector_search(query_embedding vector(768), match_count int)
--
--     Uses pgvector cosine distance:
--     - <=> is the cosine distance operator (0 = identical, 2 = opposite)
--     - We return similarity = 1 - distance so higher = more similar,
--       which matches the intuition from keyword_search's rank (higher = better)
--     - ORDER BY distance ASC uses the HNSW index automatically
--
--     Returns: id, title, url, content, similarity (float, higher = better)
-- ---------------------------------------------------------------------------
create or replace function vector_search(
  query_embedding vector(768),
  match_count     int default 10
)
returns table (
  id          bigint,
  title       text,
  url         text,
  content     text,
  similarity  float
)
language sql stable
as $$
  select
    d.id,
    d.title,
    d.url,
    d.content,
    (1 - (d.embedding <=> query_embedding))::float as similarity
  from documents d
  where d.embedding is not null
  order by d.embedding <=> query_embedding asc
  limit match_count;
$$;


-- ---------------------------------------------------------------------------
-- Verify (run these in a separate query to check everything landed)
-- ---------------------------------------------------------------------------
-- select count(*) from documents;
-- select keyword_search('react', 3);
-- select id, title, similarity from vector_search('[0.1, 0.2, ...]'::vector(768), 3);
