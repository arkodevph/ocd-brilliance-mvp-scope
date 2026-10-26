CREATE TABLE IF NOT EXISTS automation_documents (
  scope text NOT NULL,
  id text NOT NULL,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, id)
);
