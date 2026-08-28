import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Load environment variables
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function seedAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SECRET_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const adminEmail = 'admin@florus.in';

  console.log('\n🔐 Creating admin account...\n');

  try {
    let userId: string | null = null;
    let newPasswordGenerated: string | null = null;
    let userCreatedNow = false;

    // Step 1: Try to create the user
    const password = randomBytes(16).toString('base64').slice(0, 16);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      // Check if the error is because user already exists
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        console.log('ℹ️  Auth user already exists, looking up...');
        
        // Step 2: User exists, look them up
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users.find(u => u.email === adminEmail);
        
        if (!existingUser) {
          console.error('❌ User should exist but could not be found');
          process.exit(1);
        }
        
        userId = existingUser.id;
        console.log('✓ Found existing auth user:', userId);
      } else {
        console.error('❌ Failed to create admin user:', authError.message);
        process.exit(1);
      }
    } else if (authData.user) {
      // New user created successfully
      userId = authData.user.id;
      newPasswordGenerated = password;
      userCreatedNow = true;
      console.log('✓ Created new auth user:', userId);
    } else {
      console.error('❌ Unexpected response from createUser');
      process.exit(1);
    }

    // Step 3: Check if profile exists
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, role, full_name, is_active')
      .eq('id', userId)
      .single();

    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's expected if profile doesn't exist
      console.error('❌ Failed to check for existing profile:', profileFetchError.message);
      process.exit(1);
    }

    if (existingProfile) {
      console.log('✓ Profile already exists');
      console.log('   Role:', existingProfile.role);
      console.log('   Name:', existingProfile.full_name);
      console.log('   Active:', existingProfile.is_active);
    } else {
      // Step 4: Create profile
      console.log('ℹ️  Creating profile...');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'admin',
          full_name: 'Florus Admin',
          is_active: true,
        });

      if (profileError) {
        console.error('❌ Failed to create admin profile:', profileError.message);
        console.error('   Auth user exists but profile creation failed.');
        if (userCreatedNow) {
          console.error('   You may need to manually create the profile or clean up the orphaned auth user.');
        }
        process.exit(1);
      }

      console.log('✓ Profile created successfully');
    }

    // Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (userCreatedNow && newPasswordGenerated) {
      console.log('✅ New admin account created!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('   Email:   ', adminEmail);
      console.log('   Password:', newPasswordGenerated);
      console.log('   User ID: ', userId);
      console.log('\n⚠️  IMPORTANT: Save this password now!');
      console.log('   This password will not be shown again.');
      console.log('   Change it after your first login.\n');
    } else {
      console.log('✅ Admin account verified (already existed)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('   Email:  ', adminEmail);
      console.log('   User ID:', userId);
      console.log('\n   No new password was generated.');
      console.log('   Use Supabase Dashboard to reset if needed.\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

seedAdmin();
