-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Game state table (stores points, images, setup status)
CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  my_image TEXT,
  their_image TEXT,
  my_points INTEGER DEFAULT 0,
  their_points INTEGER DEFAULT 0,
  selected_user TEXT,
  is_setup BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- History table (stores point entries)
CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  person TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  given_by TEXT,
  disputed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER REFERENCES history(id) ON DELETE CASCADE,
  dispute_reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial game state row
INSERT INTO game_state (id, my_points, their_points, is_setup)
VALUES (1, 0, 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (since this is a personal app)
CREATE POLICY "Allow all access to game_state" ON game_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to history" ON history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to disputes" ON disputes FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE history;
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
