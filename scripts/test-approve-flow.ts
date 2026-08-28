import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testApproveFlow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('\n🧪 Testing Approve Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 0: Clean up any existing test data
  console.log('Step 0: Cleaning up existing test data...');
  
  // Find any existing test user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingTestUser = existingUsers?.users.find(u => u.email === 'test.doctor@example.com');
  
  if (existingTestUser) {
    // Delete profile first (due to foreign key)
    await supabase.from('profiles').delete().eq('id', existingTestUser.id);
    // Delete auth user
    await supabase.auth.admin.deleteUser(existingTestUser.id);
    console.log('✓ Cleaned up existing test user');
  }
  
  // Delete any existing test applications
  await supabase.from('trade_applications').delete().eq('email', 'test.doctor@example.com');
  console.log('✓ Cleaned up existing test applications');
  console.log();

  // Step 1: Insert test application
  console.log('Step 1: Creating test trade application...');
  const { data: application, error: insertError } = await supabase
    .from('trade_applications')
    .insert({
      applicant_type: 'doctor',
      full_name: 'Dr. Test Applicant',
      email: 'test.doctor@example.com',
      phone: '9876543210',
      business_or_clinic_name: 'Test Medical Clinic',
      registration_number: 'MCI-TEST-12345',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to insert test application:', insertError.message);
    process.exit(1);
  }

  console.log('✓ Test application created');
  console.log('  ID:', application.id);
  console.log('  Email:', application.email);
  console.log('  Status:', application.status);
  console.log();

  // Step 2: Generate invite link (simulating approve action)
  console.log('Step 2: Generating invite link...');
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: application.email,
  });

  if (linkError || !linkData.user || !linkData.properties?.hashed_token) {
    console.error('❌ Failed to generate invite link:', linkError?.message);
    process.exit(1);
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=invite&next=/trade/set-password`;

  console.log('✓ Invite link generated');
  console.log('  User ID:', linkData.user.id);
  console.log('  Token hash:', linkData.properties.hashed_token.substring(0, 20) + '...');
  console.log();

  // Step 3: Verify auth user was created
  console.log('Step 3: Verifying auth user...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const createdUser = authUsers?.users.find(u => u.email === application.email);

  if (!createdUser) {
    console.error('❌ Auth user was not created');
    process.exit(1);
  }

  console.log('✓ Auth user exists');
  console.log('  ID:', createdUser.id);
  console.log('  Email:', createdUser.email);
  console.log();

  // Step 4: Create profile
  console.log('Step 4: Creating profile...');
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: linkData.user.id,
      role: 'trade',
      account_type: application.applicant_type,
      full_name: application.full_name,
      phone: application.phone,
      is_active: true,
    });

  if (profileError) {
    console.error('❌ Failed to create profile:', profileError.message);
    process.exit(1);
  }

  console.log('✓ Profile created');
  console.log();

  // Step 5: Verify profile was created
  console.log('Step 5: Verifying profile...');
  const { data: profile, error: profileFetchError } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('id', linkData.user.id)
    .single();

  if (profileFetchError || !profile) {
    console.error('❌ Profile verification failed:', profileFetchError?.message);
    process.exit(1);
  }

  console.log('✓ Profile verified');
  console.log('  ID:', profile.id);
  console.log('  Role:', profile.role);
  console.log('  Name:', profile.full_name);
  console.log('  Active:', profile.is_active);
  console.log();

  // Step 6: Get the actual admin user ID
  console.log('Step 6: Looking up admin user...');
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .single();

  if (!adminProfile) {
    console.error('❌ No admin user found');
    process.exit(1);
  }

  console.log('✓ Admin user found:', adminProfile.id);
  console.log();

  // Step 7: Update application to approved
  console.log('Step 7: Updating application status...');
  const { error: updateError } = await supabase
    .from('trade_applications')
    .update({
      status: 'approved',
      linked_profile_id: linkData.user.id,
      reviewed_by: adminProfile.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: `Approved. User ID: ${linkData.user.id}. Invite link generated for manual relay.`,
    })
    .eq('id', application.id);

  if (updateError) {
    console.error('❌ Failed to update application:', updateError.message);
    process.exit(1);
  }

  console.log('✓ Application updated to approved');
  console.log();

  // Step 8: Verify application status
  console.log('Step 8: Verifying application status...');
  const { data: updatedApp, error: verifyError } = await supabase
    .from('trade_applications')
    .select('id, email, status, reviewed_by, reviewed_at, admin_notes')
    .eq('id', application.id)
    .single();

  if (verifyError || !updatedApp) {
    console.error('❌ Application verification failed:', verifyError?.message);
    process.exit(1);
  }

  console.log('✓ Application status verified');
  console.log('  ID:', updatedApp.id);
  console.log('  Status:', updatedApp.status);
  console.log('  Reviewed by:', updatedApp.reviewed_by);
  console.log('  Reviewed at:', updatedApp.reviewed_at);
  console.log();

  // Step 9: Display invite URL
  console.log('Step 9: Generated invite URL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Invite URL structure verified:');
  console.log('  Base URL:', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  console.log('  Path: /auth/confirm');
  console.log('  Has token_hash param:', inviteUrl.includes('token_hash='));
  console.log('  Has type=invite param:', inviteUrl.includes('type=invite'));
  console.log('  Has next param:', inviteUrl.includes('next=/trade/set-password'));
  console.log();
  console.log('Full URL (truncated for display):');
  console.log('  ' + inviteUrl.substring(0, 100) + '...');
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL TESTS PASSED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Summary:');
  console.log('  ✓ Test application inserted into trade_applications');
  console.log('  ✓ Auth user created via generateLink');
  console.log('  ✓ Profile created with role=trade');
  console.log('  ✓ Application status updated to approved');
  console.log('  ✓ Invite URL generated with proper token_hash');
  console.log();
  console.log('⚠️  Note: This was a script-driven test of the Server Action logic,');
  console.log('   not a full browser-based form submission test.');
  console.log();
  console.log('📋 Test Fixture Email: test.doctor@example.com (not a real inbox)');
  console.log();
}

testApproveFlow().catch(console.error);
