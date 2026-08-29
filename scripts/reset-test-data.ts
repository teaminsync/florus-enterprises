/**
 * Reset test data for fresh testing
 * 
 * PRESERVES:
 * - Admin profile (60fb931c-a688-4a5f-93ee-0272e0f5df51)
 * - Products table (all data)
 * - Categories table (all data)
 * 
 * DELETES:
 * - All trade profiles (role='trade')
 * - All auth users (except admin)
 * - All trade applications
 * - All orders (cascades to order_items and order_status_history)
 * - All cart_items
 * - All PO files from storage
 * 
 * Usage: npx tsx scripts/reset-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_ID = '60fb931c-a688-4a5f-93ee-0272e0f5df51';

async function resetTestData() {
  console.log('=== Resetting Test Data ===\n');
  console.log('⚠️  This will delete:');
  console.log('   - All trade user profiles and auth accounts');
  console.log('   - All trade applications');
  console.log('   - All orders, order items, and status history');
  console.log('   - All cart items');
  console.log('   - All PO files from storage\n');
  
  console.log('✓ Preserving:');
  console.log('   - Admin profile and auth account');
  console.log('   - All products');
  console.log('   - All categories\n');

  try {
    // Step 1: Delete cart items
    console.log('Step 1: Deleting cart items...');
    const { error: cartError, count: cartCount } = await supabase
      .from('cart_items')
      .delete()
      .neq('user_id', ADMIN_ID);

    if (cartError) {
      console.error('❌ Failed to delete cart items:', cartError);
      return;
    }
    console.log(`✓ Deleted ${cartCount || 0} cart items\n`);

    // Step 2: Delete PO files from storage
    console.log('Step 2: Deleting PO files from storage...');
    const { data: folders, error: listError } = await supabase.storage
      .from('po-uploads')
      .list('', { limit: 1000 });

    if (listError) {
      console.error('❌ Failed to list storage folders:', listError);
    } else if (folders && folders.length > 0) {
      const actualFolders = folders.filter(f => f.name !== '.emptyFolderPlaceholder');
      let totalDeleted = 0;

      for (const folder of actualFolders) {
        const { data: files } = await supabase.storage
          .from('po-uploads')
          .list(folder.name);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${folder.name}/${f.name}`);
          const { error: deleteError } = await supabase.storage
            .from('po-uploads')
            .remove(filePaths);

          if (!deleteError) {
            totalDeleted += filePaths.length;
          }
        }
      }

      console.log(`✓ Deleted ${totalDeleted} PO files\n`);
    } else {
      console.log('✓ No PO files to delete\n');
    }

    // Step 3: Delete orders (cascades to order_items and order_status_history)
    console.log('Step 3: Deleting orders (cascades to items and history)...');
    const { error: ordersError, count: ordersCount } = await supabase
      .from('orders')
      .delete()
      .neq('user_id', ADMIN_ID);

    if (ordersError) {
      console.error('❌ Failed to delete orders:', ordersError);
      return;
    }
    console.log(`✓ Deleted ${ordersCount || 0} orders (and their items/history)\n`);

    // Step 4: Delete trade applications
    console.log('Step 4: Deleting trade applications...');
    const { error: appsError, count: appsCount } = await supabase
      .from('trade_applications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (appsError) {
      console.error('❌ Failed to delete trade applications:', appsError);
      return;
    }
    console.log(`✓ Deleted ${appsCount || 0} trade applications\n`);

    // Step 5: Find trade user IDs
    console.log('Step 5: Finding trade user profiles...');
    const { data: tradeProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'trade');

    if (profilesError) {
      console.error('❌ Failed to fetch trade profiles:', profilesError);
      return;
    }

    const tradeUserIds = tradeProfiles?.map(p => p.id) || [];
    console.log(`✓ Found ${tradeUserIds.length} trade users\n`);

    // Step 6: Delete trade profiles
    if (tradeUserIds.length > 0) {
      console.log('Step 6: Deleting trade profiles...');
      const { error: deleteProfilesError, count: profilesCount } = await supabase
        .from('profiles')
        .delete()
        .in('id', tradeUserIds);

      if (deleteProfilesError) {
        console.error('❌ Failed to delete trade profiles:', deleteProfilesError);
        return;
      }
      console.log(`✓ Deleted ${profilesCount || 0} trade profiles\n`);

      // Step 7: Delete auth users
      console.log('Step 7: Deleting auth users...');
      let deletedAuthUsers = 0;
      
      for (const userId of tradeUserIds) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
        
        if (deleteAuthError) {
          console.error(`⚠️  Failed to delete auth user ${userId}:`, deleteAuthError.message);
        } else {
          deletedAuthUsers++;
        }
      }
      
      console.log(`✓ Deleted ${deletedAuthUsers}/${tradeUserIds.length} auth users\n`);
    } else {
      console.log('Step 6-7: No trade users to delete\n');
    }

    // Step 8: Verify cleanup
    console.log('Step 8: Verifying cleanup...');
    
    const { count: remainingCarts } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingApps } = await supabase
      .from('trade_applications')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingTradeProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'trade');
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUserCount = authUsers?.users.length || 0;

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    console.log('\n=== Verification Results ===');
    console.log(`Cart items: ${remainingCarts || 0}`);
    console.log(`Orders: ${remainingOrders || 0}`);
    console.log(`Trade applications: ${remainingApps || 0}`);
    console.log(`Trade profiles: ${remainingTradeProfiles || 0}`);
    console.log(`Auth users: ${authUserCount} (should be 1 - admin only)`);
    console.log(`Products: ${productCount || 0} (preserved)`);
    console.log(`Categories: ${categoryCount || 0} (preserved)\n`);

    if (
      (remainingCarts || 0) === 0 &&
      (remainingOrders || 0) === 0 &&
      (remainingApps || 0) === 0 &&
      (remainingTradeProfiles || 0) === 0 &&
      authUserCount === 1
    ) {
      console.log('✅ Reset complete! Database is ready for fresh testing.\n');
    } else {
      console.log('⚠️  Reset completed but some data may remain. Review counts above.\n');
    }

  } catch (error) {
    console.error('❌ Unexpected error during reset:', error);
    process.exit(1);
  }
}

// Run reset
resetTestData();
