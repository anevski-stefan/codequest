const {
  getSupabase
} = require('../config/supabase');
const logger = require('../utils/logger');
const {
  encrypt,
  decryptWithUpgrade
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
    const accessToken = decryptWithUpgrade(data.github_token, upgradedCiphertext => {
      getSupabase().from('users')
        .update({ github_token: upgradedCiphertext })
        .eq('github_id', userId)
        .catch(error => logger.error('Failed to upgrade github token ciphertext:', error));
    });
    if (!accessToken) {
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
  async invalidateAccessToken(userId) {
    const {
      error
    } = await getSupabase().from('users')
      .update({
        github_token: null,
        github_refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('github_id', userId);
    if (error) throw error;
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
      logger.error('Supabase user operation error:', error);
      throw error;
    }
  }
}
module.exports = new SupabaseService();