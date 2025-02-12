const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SupabaseService {
  async createOrUpdateUser(profile) {
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('github_id', profile.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingUser) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: profile.id,
            github_id: profile.id,
            username: profile.username,
            avatar_url: profile._json.avatar_url,
            email: profile.emails?.[0]?.value
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newUser;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('github_id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedUser;
    } catch (error) {
      console.error('Supabase user operation error:', error);
      throw error;
    }
  }

  async saveChat(userId, messages, title) {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .insert({
          user_id: userId,
          messages,
          title,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase chat save error:', error);
      throw error;
    }
  }

  async getUserChats(userId) {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  async deleteChat(chatId, userId) {
    try {
      const { data, error } = await supabase
        .from('chat_histories')
        .delete()
        .match({ 
          id: chatId,
          user_id: userId 
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService(); 