
-- Initialize storage tables to fix "relation does not exist" error

CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    version text,
    owner_id text,
    FOREIGN KEY (bucket_id) REFERENCES storage.buckets (id)
);

CREATE INDEX IF NOT EXISTS bname ON storage.buckets USING btree (name);
CREATE INDEX IF NOT EXISTS name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
