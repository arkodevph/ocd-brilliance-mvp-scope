-- Parents first; no employee home address or raw GPS history is stored.
CREATE TABLE participants (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE workers (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  approved boolean NOT NULL DEFAULT false
);

CREATE TABLE bookings (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  worker_id text,
  service_date date NOT NULL,
  start_time time NOT NULL,
  status text NOT NULL,
  visited boolean NOT NULL DEFAULT false,
  UNIQUE (id, worker_id)
);

CREATE TABLE journeys (
  booking_id text PRIMARY KEY,
  worker_id text NOT NULL,
  session_id text NOT NULL,
  consent boolean NOT NULL,
  phase text NOT NULL CHECK (phase IN ('locating', 'en-route', 'stale', 'arrived', 'not-started')),
  remaining_minutes integer CHECK (remaining_minutes >= 0),
  progress double precision NOT NULL CHECK (progress BETWEEN 0 AND 1),
  updated_at timestamptz NOT NULL
);

-- Preserve intake review, idempotency, history and private video references.
-- Video binaries remain in their existing private file storage.
CREATE TABLE intakes (
  id text PRIMARY KEY,
  revision text NOT NULL,
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object' AND record->>'id' IS NOT NULL AND record->>'id' = id)
);

-- Add references only after all referenced tables exist.
ALTER TABLE bookings ADD CONSTRAINT bookings_participant_fk
  FOREIGN KEY (participant_id) REFERENCES participants(id);
ALTER TABLE bookings ADD CONSTRAINT bookings_worker_fk
  FOREIGN KEY (worker_id) REFERENCES workers(id);
ALTER TABLE journeys ADD CONSTRAINT journeys_assignment_fk
  FOREIGN KEY (booking_id, worker_id) REFERENCES bookings(id, worker_id);

CREATE INDEX bookings_participant_date_idx ON bookings(participant_id, service_date);
CREATE INDEX bookings_worker_date_idx ON bookings(worker_id, service_date);
CREATE UNIQUE INDEX intakes_creation_key_idx ON intakes ((record->>'creationKey'))
  WHERE record->>'creationKey' IS NOT NULL;

-- Keep every participant, including those whose bookings are all before cutoff.
CREATE FUNCTION participant_bookings_from(cutoff date)
RETURNS TABLE (participant_id text, participant_name text, booking_id text, booking_date date)
LANGUAGE sql STABLE AS $$
  SELECT p.id, p.name, b.id, b.service_date
  FROM participants p
  LEFT JOIN bookings b ON b.participant_id = p.id
    AND b.service_date >= cutoff
  ORDER BY p.id, b.service_date, b.id;
$$;
