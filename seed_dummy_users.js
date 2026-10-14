const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const dummyUsers = [
  { username: 'user1', email: 'user1@anchor.com', full_name: 'Aarav Sharma', bio: 'Avid reader & tech enthusiast' },
  { username: 'user2', email: 'user2@anchor.com', full_name: 'Priya Patel', bio: 'Literature student & book lover' },
  { username: 'user3', email: 'user3@anchor.com', full_name: 'Rohan Verma', bio: 'History and philosophy reader' },
  { username: 'user4', email: 'user4@anchor.com', full_name: 'Sneha Gupta', bio: 'Fiction & novel reader' },
  { username: 'user5', email: 'user5@anchor.com', full_name: 'Amit Kumar', bio: 'Competitive exam aspirant' },
  { username: 'user6', email: 'user6@anchor.com', full_name: 'Pooja Singh', bio: 'Science fiction explorer' },
  { username: 'user7', email: 'user7@anchor.com', full_name: 'Vikram Joshi', bio: 'Self-help and productivity geek' },
  { username: 'user8', email: 'user8@anchor.com', full_name: 'Ananya Roy', bio: 'Poetry and art lover' },
  { username: 'user9', email: 'user9@anchor.com', full_name: 'Deepak Yadav', bio: 'Daily study room member' },
  { username: 'user10', email: 'user10@anchor.com', full_name: 'Neha Mehta', bio: 'Reading enthusiast' }
];

const DEFAULT_PASSWORD = 'User@123456';

async function seed() {
  console.log('--- Starting Dummy Users Creation ---');

  for (const u of dummyUsers) {
    try {
      // 1. Create in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          username: u.username,
          full_name: u.full_name
        }
      });

      let userId = authData?.user?.id;

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`User ${u.email} already exists in auth. Fetching user id...`);
          const { data: list } = await supabase.auth.admin.listUsers();
          const existing = list.users.find(x => x.email === u.email);
          userId = existing?.id;
        } else {
          console.error(`Failed to create auth user ${u.email}:`, authError.message);
          continue;
        }
      }

      if (userId) {
        // 2. Upsert in public.profiles table
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          username: u.username,
          full_name: u.full_name,
          email: u.email,
          bio: u.bio,
          is_admin: false,
          reading_streak: Math.floor(Math.random() * 15) + 1,
          last_active_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (profileError) {
          console.error(`Failed to upsert profile for ${u.username}:`, profileError.message);
        } else {
          console.log(`✓ Created / Updated user: ${u.username} (${u.email}) - Password: ${DEFAULT_PASSWORD}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${u.username}:`, err);
    }
  }

  console.log('--- Finished Seeding Dummy Users ---');
}

seed();
