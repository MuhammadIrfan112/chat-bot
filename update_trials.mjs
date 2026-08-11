import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ecwjgbwfnqzwjoyivecw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjd2pnYndmbnF6d2pveWl2ZWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQzNDAwMywiZXhwIjoyMDk3MDEwMDAzfQ.PiZLmP5gqibS4b5Z2x5Ow9KjEyeUro9qayMN1lhFSlw'
);

async function run() {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 15);
  const trialEndStr = trialEnd.toISOString();

  console.log('Fetching users without a trial end date...');
  
  const { data: users, error: selectError } = await supabase
    .from('users_subscription')
    .select('user_id, status, plan, trial_ends_at');

  if (selectError) {
    console.error('Error fetching users:', selectError);
    return;
  }

  const usersToUpdate = users.filter(u => !u.trial_ends_at && u.status !== 'Active');

  console.log(`Found ${usersToUpdate.length} users to update.`);

  for (const user of usersToUpdate) {
    console.log(`Updating user ${user.user_id}...`);
    const { error: updateError } = await supabase
      .from('users_subscription')
      .update({
        status: 'Trialing',
        plan: 'starter', // standard plan
        trial_ends_at: trialEndStr
      })
      .eq('user_id', user.user_id);
      
    if (updateError) {
      console.error(`Error updating user ${user.user_id}:`, updateError);
    }
  }

  console.log('Updating bots...');
  for (const user of usersToUpdate) {
    await supabase.from('bots').update({ plan: 'standard' }).eq('user_id', user.user_id);
  }

  // Also create billing_history table if we need to? No we can't do DDL with the normal client.
  // Actually, wait, the user didn't mention they made the table yet. 
  console.log('Done!');
}

run();
