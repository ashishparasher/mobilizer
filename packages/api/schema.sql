-- ============================================================================
-- MOBILIZE - DATABASE SCHEMA MIGRATION
-- Target: Supabase PostgreSQL + PostGIS
-- ============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. CREATE ENUM TYPES
CREATE TYPE campaign_category AS ENUM (
  'political',
  'wedding',
  'brand_activation',
  'religious',
  'ngo_volunteer',
  'influencer_shoot',
  'survey',
  'entertainment',
  'flash_mob',
  'startup_launch',
  'emergency_response'
);

CREATE TYPE campaign_status AS ENUM (
  'draft',
  'pending_approval',
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TYPE application_status AS ENUM (
  'pending',
  'confirmed',
  'rejected',
  'waitlisted',
  'cancelled',
  'no_show'
);

CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'disputed',
  'cancelled'
);

CREATE TYPE gender_type AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

-- 3. CREATE TABLES

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- References Supabase auth.users(id)
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(100),
  age INTEGER CHECK (age >= 16 AND age <= 80),
  gender gender_type,
  city VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  verified BOOLEAN DEFAULT false,
  aadhaar_verified BOOLEAN DEFAULT false,
  reliability_score DECIMAL(5,2) DEFAULT 70.00,
  profile_complete INTEGER DEFAULT 0 CHECK (profile_complete >= 0 AND profile_complete <= 100),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('participant', 'campaigner', 'admin')),
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: participant_profiles
CREATE TABLE participant_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  languages TEXT[] DEFAULT '{}',
  education VARCHAR(100),
  profession VARCHAR(100),
  interests TEXT[] DEFAULT '{}',
  category_preferences campaign_category[] DEFAULT '{}',
  blocked_categories campaign_category[] DEFAULT '{}',
  min_compensation INTEGER DEFAULT 0,
  travel_radius INTEGER DEFAULT 10, -- In kilometers
  is_online BOOLEAN DEFAULT false,
  is_discoverable BOOLEAN DEFAULT true,
  availability_schedule JSONB DEFAULT '{}',
  location GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMPTZ,
  expo_push_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: campaigners
CREATE TABLE campaigners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  org_name VARCHAR(200) NOT NULL,
  org_type VARCHAR(100),
  description TEXT,
  verified BOOLEAN DEFAULT false,
  wallet_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_campaigns INTEGER DEFAULT 0 CHECK (total_campaigns >= 0),
  payment_reliability DECIMAL(5,2) DEFAULT 100.00 CHECK (payment_reliability >= 0 AND payment_reliability <= 100),
  cancellation_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (cancellation_rate >= 0 AND cancellation_rate <= 100),
  logo_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaigner_id UUID REFERENCES campaigners(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category campaign_category NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_hrs DECIMAL(4,1) NOT NULL CHECK (duration_hrs > 0),
  location_name VARCHAR(200) NOT NULL,
  location_address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  payout INTEGER NOT NULL DEFAULT 0 CHECK (payout >= 0),
  payout_type VARCHAR(20) DEFAULT 'cash' CHECK (payout_type IN ('cash', 'non_monetary')),
  slots_total INTEGER NOT NULL CHECK (slots_total > 0),
  slots_filled INTEGER DEFAULT 0 CHECK (slots_filled >= 0),
  slots_waitlist INTEGER DEFAULT 0 CHECK (slots_waitlist >= 0),
  status campaign_status DEFAULT 'pending_approval',
  dress_code TEXT,
  requirements JSONB NOT NULL DEFAULT '{}',
  visibility_radius INTEGER DEFAULT 10, -- In kilometers
  is_urgent BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  budget_locked DECIMAL(12,2) DEFAULT 0.00 CHECK (budget_locked >= 0),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  auto_qualified BOOLEAN DEFAULT false,
  campaigner_note TEXT,
  UNIQUE(campaign_id, user_id)
);

-- Table: checkins
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  checkin_time TIMESTAMPTZ DEFAULT NOW(),
  checkout_time TIMESTAMPTZ,
  checkin_location GEOGRAPHY(POINT, 4326),
  checkout_location GEOGRAPHY(POINT, 4326),
  checkin_selfie_url TEXT,
  verified BOOLEAN DEFAULT false,
  hours_attended DECIMAL(4,2) CHECK (hours_attended >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE RESTRICT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status payout_status DEFAULT 'pending',
  upi_id VARCHAR(100),
  razorpay_payout_id VARCHAR(200),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, campaign_id)
);

-- Table: notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50),
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: wallet_transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaigner_id UUID REFERENCES campaigners(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- e.g., 'deposit', 'payout_hold', 'payout_release', 'refund'
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  reference_id VARCHAR(200),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE INDEXES
CREATE INDEX idx_campaigns_location ON campaigns USING GIST(location);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_date ON campaigns(event_date);
CREATE INDEX idx_campaigns_category ON campaigns(category);

CREATE INDEX idx_participant_profiles_location ON participant_profiles USING GIST(location);
CREATE INDEX idx_participant_profiles_online ON participant_profiles(is_online);

CREATE INDEX idx_applications_campaign ON applications(campaign_id);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE INDEX idx_checkins_campaign ON checkins(campaign_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- 5. CREATE FUNCTIONS

-- Function: get_nearby_campaigns
-- Finds campaigns within search radius matching user's category preferences and excluding blocked categories
CREATE OR REPLACE FUNCTION get_nearby_campaigns(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_km INT,
  p_user_id UUID
)
RETURNS TABLE (
  campaign_id UUID,
  campaigner_id UUID,
  title VARCHAR(200),
  description TEXT,
  category campaign_category,
  event_date DATE,
  start_time TIME,
  duration_hrs DECIMAL(4,1),
  location_name VARCHAR(200),
  location_address TEXT,
  payout INTEGER,
  payout_type VARCHAR(20),
  slots_total INTEGER,
  slots_filled INTEGER,
  slots_waitlist INTEGER,
  status campaign_status,
  is_urgent BOOLEAN,
  distance_km FLOAT,
  org_name VARCHAR(200),
  campaigner_rating DECIMAL(3,2)
) AS $$
DECLARE
  user_loc GEOGRAPHY;
  user_blocked campaign_category[];
  user_pref campaign_category[];
BEGIN
  -- Set user geography reference point
  user_loc := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
  
  -- Retrieve user preferences and blocked categories
  SELECT COALESCE(blocked_categories, '{}'), COALESCE(category_preferences, '{}')
  INTO user_blocked, user_pref
  FROM participant_profiles
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT 
    c.id AS campaign_id,
    c.campaigner_id,
    c.title,
    c.description,
    c.category,
    c.event_date,
    c.start_time,
    c.duration_hrs,
    c.location_name,
    c.location_address,
    c.payout,
    c.payout_type,
    c.slots_total,
    c.slots_filled,
    c.slots_waitlist,
    c.status,
    c.is_urgent,
    (ST_Distance(c.location, user_loc) / 1000.0) AS distance_km,
    cg.org_name,
    cg.rating AS campaigner_rating
  FROM campaigns c
  JOIN campaigners cg ON c.campaigner_id = cg.id
  WHERE 
    c.status = 'active'
    AND NOT cg.verified = false -- Ensure campaigner is not completely blacklisted (optional, we check active campaigns)
    -- Within the radius specified
    AND ST_Distance(c.location, user_loc) <= (radius_km * 1000)
    -- Filter out category if blocked by user
    AND NOT (c.category = ANY(user_blocked))
    -- Filter out if user already applied
    AND NOT EXISTS (
      SELECT 1 FROM applications app 
      WHERE app.campaign_id = c.id AND app.user_id = p_user_id
    )
  ORDER BY 
    distance_km ASC,
    c.payout DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger Function: update_campaign_slots
CREATE OR REPLACE FUNCTION update_campaign_slots()
RETURNS TRIGGER AS $$
DECLARE
  diff_filled INT := 0;
  diff_waitlist INT := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmed' THEN
      diff_filled := 1;
    ELSIF NEW.status = 'waitlisted' THEN
      diff_waitlist := 1;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check slots_filled adjustments
    IF OLD.status <> 'confirmed' AND NEW.status = 'confirmed' THEN
      diff_filled := 1;
    ELSIF OLD.status = 'confirmed' AND NEW.status <> 'confirmed' THEN
      diff_filled := -1;
    END IF;

    -- Check slots_waitlist adjustments
    IF OLD.status <> 'waitlisted' AND NEW.status = 'waitlisted' THEN
      diff_waitlist := 1;
    ELSIF OLD.status = 'waitlisted' AND NEW.status <> 'waitlisted' THEN
      diff_waitlist := -1;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'confirmed' THEN
      diff_filled := -1;
    ELSIF OLD.status = 'waitlisted' THEN
      diff_waitlist := -1;
    END IF;
  END IF;

  -- Apply changes to target campaign
  IF diff_filled <> 0 OR diff_waitlist <> 0 THEN
    UPDATE campaigns
    SET 
      slots_filled = GREATEST(0, COALESCE(slots_filled, 0) + diff_filled),
      slots_waitlist = GREATEST(0, COALESCE(slots_waitlist, 0) + diff_waitlist)
    WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: calculate_reliability_score
CREATE OR REPLACE FUNCTION calculate_reliability_score(p_user_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_attendance_rate DECIMAL(5,2) := 100.00;
  v_punctuality_rate DECIMAL(5,2) := 100.00;
  v_avg_rating DECIMAL(5,2) := 5.00;
  v_profile_complete INT := 0;
  v_response_rate DECIMAL(5,2) := 100.00;
  v_reliability DECIMAL(5,2) := 70.00;
  
  v_total_confirmed INT := 0;
  v_attended INT := 0;
  v_on_time INT := 0;
  v_total_ratings INT := 0;
BEGIN
  -- 1. Attendance Rate (Attendance Rate = Attended / Total Confirmed)
  SELECT COUNT(*) INTO v_total_confirmed 
  FROM applications 
  WHERE user_id = p_user_id AND status IN ('confirmed', 'no_show');

  SELECT COUNT(*) INTO v_attended
  FROM checkins c
  JOIN applications a ON c.application_id = a.id
  WHERE c.user_id = p_user_id AND c.verified = true;

  IF v_total_confirmed > 0 THEN
    v_attendance_rate := (v_attended::DECIMAL / v_total_confirmed::DECIMAL) * 100.00;
  END IF;

  -- 2. Punctuality Rate
  -- Simple check: did they checkin before start time? (For brevity, check if delay checkin exists, mock here)
  SELECT COUNT(*) INTO v_on_time
  FROM checkins
  WHERE user_id = p_user_id AND verified = true; -- Simplified punctuality flag

  IF v_attended > 0 THEN
    v_punctuality_rate := (v_on_time::DECIMAL / v_attended::DECIMAL) * 100.00;
  END IF;

  -- 3. Average Rating
  SELECT COALESCE(AVG(score), 5.00), COUNT(*) INTO v_avg_rating, v_total_ratings
  FROM ratings
  WHERE to_user_id = p_user_id;

  -- 4. Profile Completeness
  SELECT COALESCE(profile_complete, 0) INTO v_profile_complete
  FROM users
  WHERE id = p_user_id;

  -- 5. Calculate Weighted Reliability Score:
  -- attendance_rate * 0.40 + punctuality_rate * 0.20 + (avg_rating/5.0 * 100) * 0.25 + profile_complete * 0.05 + response_rate * 0.10
  v_reliability := (v_attendance_rate * 0.40) +
                   (v_punctuality_rate * 0.20) +
                   ((v_avg_rating / 5.00) * 100.00 * 0.25) +
                   (v_profile_complete * 0.05) +
                   (v_response_rate * 0.10);

  -- Clamp score between 0 and 100
  v_reliability := LEAST(100.00, GREATEST(0.00, v_reliability));

  -- Update users table
  UPDATE users
  SET reliability_score = v_reliability
  WHERE id = p_user_id;

  RETURN v_reliability;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Helper: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 6. CREATE TRIGGERS

-- Triggers for application updates updating campaign slots
CREATE TRIGGER tr_applications_slots_change
AFTER INSERT OR UPDATE OR DELETE ON applications
FOR EACH ROW EXECUTE FUNCTION update_campaign_slots();

-- Triggers for tracking last modification updated_at
CREATE TRIGGER tr_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 7. ENABLE ROW LEVEL SECURITY (RLS)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigners ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 8. CREATE SECURITY POLICIES

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- Helper function to check if current auth user is a campaigner
-- Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_campaigner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid() AND role = 'campaigner'
  );
$$;

CREATE POLICY "Campaigners can view participant basic info" ON users
  FOR SELECT USING (
    public.is_campaigner()
  );

-- Participant profiles policies
CREATE POLICY "Users can read own profile" ON participant_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile" ON participant_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own profile" ON participant_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

-- Campaigners policies
CREATE POLICY "Anyone can view campaigner profiles" ON campaigners
  FOR SELECT USING (true);

CREATE POLICY "Campaigners can manage own profile" ON campaigners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

-- Campaigns policies
CREATE POLICY "Anyone can view active campaigns" ON campaigns
  FOR SELECT USING (status = 'active' AND is_private = false);

CREATE POLICY "Campaigners can CRUD own campaigns" ON campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigners c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = campaigner_id AND u.auth_id = auth.uid()
    )
  );

-- Applications policies
CREATE POLICY "Users can manage own applications" ON applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Campaigners can view applications for their campaigns" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaigners cg ON c.campaigner_id = cg.id
      JOIN users u ON cg.user_id = u.id
      WHERE c.id = campaign_id AND u.auth_id = auth.uid()
    )
  );

-- Checkins policies
CREATE POLICY "Users can manage own checkins" ON checkins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Campaigners can view checkins for their campaigns" ON checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaigners cg ON c.campaigner_id = cg.id
      JOIN users u ON cg.user_id = u.id
      WHERE c.id = campaign_id AND u.auth_id = auth.uid()
    )
  );

-- Payouts policies
CREATE POLICY "Users can view own payouts" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Campaigners can view payouts for their campaigns" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaigners cg ON c.campaigner_id = cg.id
      JOIN users u ON cg.user_id = u.id
      WHERE c.id = campaign_id AND u.auth_id = auth.uid()
    )
  );

-- Ratings policies
CREATE POLICY "Users can view ratings involving them" ON ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() AND (u.id = from_user_id OR u.id = to_user_id)
    )
  );

CREATE POLICY "Users can insert ratings for campaigns they attended" ON ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = from_user_id AND u.auth_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view and manage own notifications" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

-- Wallet transactions policies
CREATE POLICY "Campaigners can view own transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigners cg
      JOIN users u ON cg.user_id = u.id
      WHERE cg.id = campaigner_id AND u.auth_id = auth.uid()
    )
  );
