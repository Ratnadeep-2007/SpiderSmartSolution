-- SpiderSmart IMS: Reset and Initialize Database Schema
-- Target: Supabase / PostgreSQL 15

-- 1. CLEANUP (Drop existing tables to ensure a clean start)
DROP TABLE IF EXISTS public.saved_searches CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.record_versions CASCADE;
DROP TABLE IF EXISTS public.inventory_records CASCADE;
DROP TABLE IF EXISTS public.record_type_fields CASCADE;
DROP TABLE IF EXISTS public.record_types CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.entities CASCADE;
DROP TABLE IF EXISTS public.entity_types CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABLES

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    scoped_filters JSONB
);

-- Record Types
CREATE TABLE public.record_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record Type Fields
CREATE TABLE public.record_type_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type_id UUID REFERENCES public.record_types(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    validation_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity Types (Master Data)
CREATE TABLE public.entity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Entities (Master Data)
CREATE TABLE public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    entity_code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Departments (Master Data)
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Locations (Master Data)
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Categories (Taxonomy)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Records
CREATE TABLE public.inventory_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type_id UUID REFERENCES public.record_types(id),
    entity_id UUID REFERENCES public.entities(id),
    department_id UUID REFERENCES public.departments(id),
    entity_type_id UUID REFERENCES public.entity_types(id),
    
    -- Cached strings for search/display
    entity TEXT NOT NULL,
    entity_code TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    entity_type TEXT,
    
    box_barcode CHAR(11) UNIQUE NOT NULL,
    file_barcode CHAR(13) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    record_date DATE NOT NULL,
    version INTEGER DEFAULT 1,
    disposition_status TEXT DEFAULT 'ACTIVE',
    legal_hold BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    custom_fields JSONB DEFAULT '{}',
    tags TEXT [] DEFAULT '{}',
    category_id UUID REFERENCES public.categories(id),
    retention_policy_id UUID,
    retention_due_date DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search Index (Full-Text Search)
ALTER TABLE public.inventory_records ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(entity, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(department, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(entity_type, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(box_barcode, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(file_barcode, '')), 'A')
) STORED;

CREATE INDEX inventory_search_idx ON public.inventory_records USING GIN (search_vector);

-- Record Versions
CREATE TABLE public.record_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.inventory_records(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    changes JSONB,
    tamper_hash TEXT NOT NULL
);

-- Saved Searches
CREATE TABLE public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query_params JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE public.tags (
    slug TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SEEDING
-- Default Admin: admin@spidersmart.com / admin123
INSERT INTO public.users (email, hashed_password, role, is_active)
VALUES (
    'admin@spidersmart.com',
    '$2b$12$jE20cYhN7nmBZi.rw14T1./HZ8IcY5dHKryVYLuxreFVlgqtcMjya',
    'SYSTEM_ADMIN',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Initial Entity Types
INSERT INTO public.entity_types (name) VALUES ('Corporate'), ('Branch'), ('Client'), ('Partner') ON CONFLICT (name) DO NOTHING;

-- Initial Entities
INSERT INTO public.entities (name, entity_code) VALUES 
('Spider Smart', '11'),
('Exprivia.IT', 'EXP'),
('Google', 'GOO')
ON CONFLICT (name) DO NOTHING;

-- Initial Departments
INSERT INTO public.departments (entity_id, name) 
SELECT id, 'Finance' FROM public.entities WHERE name = 'Spider Smart'
UNION ALL
SELECT id, 'R&D' FROM public.entities WHERE name = 'Spider Smart'
UNION ALL
SELECT id, 'IT Support' FROM public.entities WHERE name = 'Exprivia.IT'
ON CONFLICT DO NOTHING;

-- Initial Record Types
INSERT INTO public.record_types (name, description, icon) VALUES 
('Physical Box', 'Standard inventory box', 'box'),
('Individual File', 'Single document file', 'file'),
('Digital Media', 'Tapes or Hard Drives', 'database')
ON CONFLICT DO NOTHING;
