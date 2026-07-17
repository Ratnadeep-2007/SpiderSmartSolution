-- =============================================================================
-- SpiderSmart IMS – Compliance Advisor Feature Migration
-- Run this in Supabase SQL Editor to add the RAG compliance advisor tables.
-- This is ADDITIVE only — it does NOT drop or modify existing tables.
-- =============================================================================

-- compliance_policies: knowledge base for retention laws and regulations
CREATE TABLE IF NOT EXISTS public.compliance_policies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    source                  TEXT,
    jurisdiction            TEXT,
    category                TEXT,
    applicable_record_types TEXT[],
    retention_years         INTEGER,
    effective_date          TEXT,
    summary                 TEXT,
    content                 TEXT NOT NULL,
    chunk_index             INTEGER DEFAULT 0,
    -- Embedding stored as JSONB float array (matches embedding_service.py pattern)
    embedding               JSONB,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_compliance_policies_jurisdiction ON public.compliance_policies(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_category ON public.compliance_policies(category);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_is_active ON public.compliance_policies(is_active);

-- compliance_queries: audit trail of all advisor queries and AI answers
CREATE TABLE IF NOT EXISTS public.compliance_queries (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL,
    query_text               TEXT NOT NULL,
    record_type_hint         TEXT,
    ai_response              TEXT,
    citations                JSONB,
    suggested_retention_years INTEGER,
    created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_queries_user_id ON public.compliance_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_queries_created_at ON public.compliance_queries(created_at DESC);
