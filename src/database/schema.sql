CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('signup', 'contact', 'cta')),
  title TEXT NOT NULL,
  description TEXT,
  button_text TEXT NOT NULL DEFAULT 'Submit',
  display_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS widget_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (widget_id, field_key)
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  ip INET,
  user_agent TEXT,
  geo JSONB,
  status TEXT NOT NULL DEFAULT 'received',
  spam_score INTEGER NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id ON widgets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_widgets_tenant_id_id ON widgets (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_widgets_created_at ON widgets (created_at);

CREATE INDEX IF NOT EXISTS idx_widget_fields_tenant_id ON widget_fields (tenant_id);
CREATE INDEX IF NOT EXISTS idx_widget_fields_widget_id ON widget_fields (widget_id);

CREATE INDEX IF NOT EXISTS idx_submissions_tenant_id ON submissions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_id_id ON submissions (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_submissions_widget_created ON submissions (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_events_submission_id ON submission_events (submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_events_tenant_id ON submission_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_submission_events_created_at ON submission_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_idempotency_tenant_scope ON idempotency_keys (tenant_id, scope);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_keys (expires_at);
