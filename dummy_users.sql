-- ==============================================================================
-- DUMMY USERS SQL SCRIPT FOR ANCHOR LIBRARY
-- Password for all users: User@123456
-- Note: All 10 users have already been inserted into your Supabase database!
-- This SQL is provided for reference or if you ever want to reset/re-run in Supabase SQL Editor.
-- ==============================================================================

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  default_pw text := 'User@123456';
  encrypted_pw text;
  new_user_id uuid;
  users_data record;
BEGIN
  -- Generate bcrypt hash for User@123456
  encrypted_pw := crypt(default_pw, gen_salt('bf'));

  FOR users_data IN
    SELECT * FROM (VALUES
      ('user1', 'user1@anchor.com', 'Aarav Sharma', 'Avid reader & tech enthusiast'),
      ('user2', 'user2@anchor.com', 'Priya Patel', 'Literature student & book lover'),
      ('user3', 'user3@anchor.com', 'Rohan Verma', 'History and philosophy reader'),
      ('user4', 'user4@anchor.com', 'Sneha Gupta', 'Fiction & novel reader'),
      ('user5', 'user5@anchor.com', 'Amit Kumar', 'Competitive exam aspirant'),
      ('user6', 'user6@anchor.com', 'Pooja Singh', 'Science fiction explorer'),
      ('user7', 'user7@anchor.com', 'Vikram Joshi', 'Self-help and productivity geek'),
      ('user8', 'user8@anchor.com', 'Ananya Roy', 'Poetry and art lover'),
      ('user9', 'user9@anchor.com', 'Deepak Yadav', 'Daily study room member'),
      ('user10', 'user10@anchor.com', 'Neha Mehta', 'Reading enthusiast')
    ) AS t(username, email, full_name, bio)
  LOOP
    -- Check if user already exists in auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = users_data.email;

    IF new_user_id IS NULL THEN
      new_user_id := gen_random_uuid();
      
      -- Insert into auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-00-00-00-00-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        users_data.email,
        encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('username', users_data.username, 'full_name', users_data.full_name),
        now(),
        now()
      );
    END IF;

    -- Upsert into public.profiles
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      email,
      bio,
      is_admin,
      reading_streak,
      last_active_at,
      created_at
    ) VALUES (
      new_user_id,
      users_data.username,
      users_data.full_name,
      users_data.email,
      users_data.bio,
      false,
      floor(random() * 15 + 1)::int,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      bio = EXCLUDED.bio;

  END LOOP;
END $$;
