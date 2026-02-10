CREATE TABLE IF NOT EXISTS gcal_external_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gcal_event_id TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  summary TEXT,
  location TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  gcal_etag TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcal_external_events_date ON gcal_external_events(date);
