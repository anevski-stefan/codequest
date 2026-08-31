const {
  getSupabase
} = require('../config/supabase');
const {
  encrypt,
  decryptAndUpgrade
} = require('../utils/crypto');
class SupabaseService {
  async persistAccessToken(userId, accessToken, refreshToken) {
    const tokenRecord = encrypt(accessToken);
    const updates = {
      github_token: JSON.stringify(tokenRecord),
      updated_at: new Date().toISOString()
    };
    if (refreshToken) {
      updates.github_refresh_token = JSON.stringify(encrypt(refreshToken));
    }
    const {
      error
    } = await getSupabase().from('users').update(updates).eq('github_id', userId).select().single();
    if (error) throw error;
  }
  async getUserWithToken(userId) {
    const {
      data,
      error
    } = await getSupabase().from('users').select('*').eq('github_id', userId).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    if (!data.github_token) return {
      ...data,
      accessToken: null
    };
    let accessToken;
    try {
      const { plain, upgraded } = decryptAndUpgrade(JSON.parse(data.github_token));
      if (upgraded) {
        await getSupabase().from('users')
          .update({ github_token: JSON.stringify(upgraded) })
          .eq('github_id', userId);
      }
      accessToken = plain;
    } catch (e) {
      return {
        ...data,
        accessToken: null
      };
    }
    return {
      ...data,
      github_token: undefined,
      github_refresh_token: undefined,
      accessToken
    };
  }
  async createOrUpdateUser(profile) {
    try {
      const {
        data: existingUser,
        error: fetchError
      } = await getSupabase().from('users').select('*').eq('github_id', profile.id).single();
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      if (!existingUser) {
        const {
          data: newUser,
          error: insertError
        } = await getSupabase().from('users').insert({
          id: profile.id,
          github_id: profile.id,
          username: profile.username,
          avatar_url: profile._json.avatar_url,
          email: profile.emails?.[0]?.value
        }).select().single();
        if (insertError) throw insertError;
        return newUser;
      }
      const {
        data: updatedUser,
        error: updateError
      } = await getSupabase().from('users').update({
        last_login: new Date().toISOString()
      }).eq('github_id', profile.id).select().single();
      if (updateError) throw updateError;
      return updatedUser;
    } catch (error) {
      console.error('Supabase user operation error:', error);
      throw error;
    }
  }
  async saveChat(userId, messages, title) {
    try {
      const {
        data,
        error
      } = await getSupabase().from('chat_histories').insert({
        user_id: userId,
        messages,
        title,
        created_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase chat save error:', error);
      throw error;
    }
  }
  async getUserChats(userId) {
    try {
      const {
        data,
        error
      } = await getSupabase().from('chat_histories').select('*').eq('user_id', userId).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }
  async deleteChat(chatId, userId) {
    try {
      const {
        data,
        error
      } = await getSupabase().from('chat_histories').delete().match({
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