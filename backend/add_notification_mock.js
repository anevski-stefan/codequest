require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addNotification() {
  const { data: users, error: userError } = await supabase.from('users').select('id').limit(1);
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found in the database. Please log in first.');
    return;
  }

  const userId = users[0].id;

  const { data, error } = await supabase.from('notifications').insert([
    {
      user_id: userId,
      type: 'system',
      title: 'Успешна инсталација!',
      message: 'Твојот систем за нотификации сега функционира одлично. Кликни овде за повеќе детали.',
      link: '/notifications',
      is_read: false
    },
    {
      user_id: userId,
      type: 'issue_assigned',
      title: 'Доделено ти е ново Issue',
      message: 'Стефан, доделено ти е Issue #123 во проектот CodeQuest.',
      link: '/assigned',
      is_read: false
    }
  ]);

  if (error) {
    console.error('Error adding notification:', error);
  } else {
    console.log(`Successfully added 2 notifications for user ${userId}.`);
  }
}

addNotification();
