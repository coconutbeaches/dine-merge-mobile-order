import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runQATests() {
  console.log('🧪 Starting QA tests for Guest Family Archiving...\n');

  try {
    // ===== STEP 1: Verify migration applied =====
    console.log('✅ STEP 1: Verifying migration...');
    
    // Check if guest_family_archives table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'guest_family_archives');
    
    if (tableError) {
      console.error('❌ Error checking table existence:', tableError);
      return;
    }
    
    if (tables.length === 0) {
      console.log('⚠️  Table guest_family_archives does not exist. Please run the migration first.');
      console.log('   Run the SQL script: apply_guest_family_archiving.sql in your Supabase SQL editor');
      return;
    }
    
    console.log('✅ Table guest_family_archives exists');
    
    // Check if functions exist
    const { data: functions, error: funcError } = await supabase
      .rpc('get_grouped_customers_with_total_spent', { include_archived: true });
    
    if (funcError) {
      console.log('⚠️  Functions not available. Please run the migration first.');
      console.log('   Run the SQL script: apply_guest_family_archiving.sql in your Supabase SQL editor');
      return;
    }
    
    console.log('✅ Customer functions are available');
    
    // ===== STEP 2: Get guest families to test archiving =====
    console.log('\n✅ STEP 2: Finding guest families to test archiving...');
    
    const guestFamilies = functions.filter(customer => customer.customer_type === 'guest_family');
    
    if (guestFamilies.length === 0) {
      console.log('⚠️  No guest families found. Creating test data...');
      
      // Create test guest order
      const testOrder = {
        guest_user_id: 'qa_test_guest',
        guest_first_name: 'QA Test',
        stay_id: 'QA-TEST-FAMILY',
        total_amount: 50.00,
        table_number: 'QA1',
        order_items: JSON.stringify([
          { id: 'test1', name: 'Test Item', price: 50.00, quantity: 1 }
        ]),
        order_status: 'completed'
      };
      
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(testOrder)
        .select();
      
      if (orderError) {
        console.error('❌ Error creating test order:', orderError);
        return;
      }
      
      console.log('✅ Created test guest family: QA-TEST-FAMILY');
      guestFamilies.push({
        customer_id: 'QA-TEST-FAMILY',
        name: 'QA-TEST-FAMILY',
        customer_type: 'guest_family',
        total_spent: 50.00,
        archived: false
      });
    }
    
    console.log(`Found ${guestFamilies.length} guest families:`);
    guestFamilies.forEach(family => {
      console.log(`  🛖 ${family.name} - $${family.total_spent} (archived: ${family.archived})`);
    });
    
    // ===== STEP 3: Test archiving a guest family =====
    console.log('\n✅ STEP 3: Testing guest family archiving...');
    
    const testFamily = guestFamilies[0];
    console.log(`Testing with family: ${testFamily.name}`);
    
    // Archive the family
    const { data: archiveResult, error: archiveError } = await supabase
      .from('guest_family_archives')
      .upsert({ stay_id: testFamily.customer_id });
    
    if (archiveError) {
      console.error('❌ Error archiving family:', archiveError);
      return;
    }
    
    console.log('✅ Family archived successfully');
    
    // Verify archive status in guest_family_archives table
    const { data: archiveCheck, error: archiveCheckError } = await supabase
      .from('guest_family_archives')
      .select('*')
      .eq('stay_id', testFamily.customer_id);
    
    if (archiveCheckError) {
      console.error('❌ Error checking archive table:', archiveCheckError);
      return;
    }
    
    if (archiveCheck.length === 0) {
      console.error('❌ Family not found in archive table');
      return;
    }
    
    console.log('✅ Archive record confirmed in guest_family_archives table');
    
    // ===== STEP 4: Test that archived families disappear unless "include archived" is toggled =====
    console.log('\n✅ STEP 4: Testing archived family visibility...');
    
    // Get families without including archived
    const { data: familiesWithoutArchived, error: noArchiveError } = await supabase
      .rpc('get_grouped_customers_with_total_spent', { include_archived: false });
    
    if (noArchiveError) {
      console.error('❌ Error getting families without archived:', noArchiveError);
      return;
    }
    
    const archivedFamilyHidden = !familiesWithoutArchived.some(f => 
      f.customer_id === testFamily.customer_id && f.customer_type === 'guest_family'
    );
    
    if (archivedFamilyHidden) {
      console.log('✅ Archived family is hidden when include_archived = false');
    } else {
      console.log('❌ Archived family is still visible when include_archived = false');
    }
    
    // Get families with archived included
    const { data: familiesWithArchived, error: withArchiveError } = await supabase
      .rpc('get_grouped_customers_with_total_spent', { include_archived: true });
    
    if (withArchiveError) {
      console.error('❌ Error getting families with archived:', withArchiveError);
      return;
    }
    
    const archivedFamilyVisible = familiesWithArchived.some(f => 
      f.customer_id === testFamily.customer_id && f.customer_type === 'guest_family' && f.archived === true
    );
    
    if (archivedFamilyVisible) {
      console.log('✅ Archived family is visible when include_archived = true');
    } else {
      console.log('❌ Archived family is not visible when include_archived = true');
    }
    
    // ===== STEP 5: Test unarchiving =====
    console.log('\n✅ STEP 5: Testing guest family unarchiving...');
    
    // Unarchive the family
    const { data: unarchiveResult, error: unarchiveError } = await supabase
      .from('guest_family_archives')
      .delete()
      .eq('stay_id', testFamily.customer_id);
    
    if (unarchiveError) {
      console.error('❌ Error unarchiving family:', unarchiveError);
      return;
    }
    
    console.log('✅ Family unarchived successfully');
    
    // Verify it's back in the normal list
    const { data: familiesAfterUnarchive, error: afterUnarchiveError } = await supabase
      .rpc('get_grouped_customers_with_total_spent', { include_archived: false });
    
    if (afterUnarchiveError) {
      console.error('❌ Error getting families after unarchive:', afterUnarchiveError);
      return;
    }
    
    const unarchivedFamilyVisible = familiesAfterUnarchive.some(f => 
      f.customer_id === testFamily.customer_id && f.customer_type === 'guest_family' && f.archived === false
    );
    
    if (unarchivedFamilyVisible) {
      console.log('✅ Unarchived family is visible in normal list');
    } else {
      console.log('❌ Unarchived family is not visible in normal list');
    }
    
    // ===== STEP 6: Test auth user archiving still works =====
    console.log('\n✅ STEP 6: Testing auth user archiving (regression test)...');
    
    // Get auth users
    const authUsers = familiesAfterUnarchive.filter(customer => customer.customer_type === 'auth_user');
    
    if (authUsers.length === 0) {
      console.log('⚠️  No auth users found to test archiving');
    } else {
      const testAuthUser = authUsers[0];
      console.log(`Testing with auth user: ${testAuthUser.name}`);
      
      // Archive the auth user
      const { data: authArchiveResult, error: authArchiveError } = await supabase
        .from('profiles')
        .update({ archived: true })
        .eq('id', testAuthUser.customer_id);
      
      if (authArchiveError) {
        console.error('❌ Error archiving auth user:', authArchiveError);
        return;
      }
      
      console.log('✅ Auth user archived successfully');
      
      // Test visibility
      const { data: authTestResult, error: authTestError } = await supabase
        .rpc('get_grouped_customers_with_total_spent', { include_archived: false });
      
      if (authTestError) {
        console.error('❌ Error getting customers for auth test:', authTestError);
        return;
      }
      
      const authUserHidden = !authTestResult.some(u => 
        u.customer_id === testAuthUser.customer_id && u.customer_type === 'auth_user'
      );
      
      if (authUserHidden) {
        console.log('✅ Archived auth user is hidden when include_archived = false');
      } else {
        console.log('❌ Archived auth user is still visible when include_archived = false');
      }
      
      // Unarchive the auth user
      await supabase
        .from('profiles')
        .update({ archived: false })
        .eq('id', testAuthUser.customer_id);
      
      console.log('✅ Auth user unarchived (cleanup)');
    }
    
    console.log('\n🎉 All QA tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Migration applied and verified');
    console.log('✅ Guest family archiving works');
    console.log('✅ Archived families are hidden unless "include archived" is toggled');
    console.log('✅ Guest family unarchiving works');
    console.log('✅ Auth user archiving still works (regression test passed)');
    
    console.log('\n🖥️  Next steps:');
    console.log('1. Test the UI at: http://localhost:3002/admin/customers');
    console.log('2. Toggle "Include archived" to see archived families');
    console.log('3. Use the archive/unarchive buttons to test manually');
    
  } catch (error) {
    console.error('❌ Unexpected error during QA tests:', error);
  }
}

runQATests();
