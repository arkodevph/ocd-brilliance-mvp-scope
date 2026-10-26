-- Account-scoped pilot state. Each short transaction locks this scope only;
-- network calls run outside the transaction. The existing intake tables stay intact.
CREATE TABLE automation_state (
  scope text PRIMARY KEY,
  revision integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
