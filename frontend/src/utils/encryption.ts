import CryptoJS from 'crypto-js';

// Generate a random encryption key on app initialization
const ENCRYPTION_KEY = (() => {
  let key = sessionStorage.getItem('app_encryption_key');
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString();
    sessionStorage.setItem('app_encryption_key', key);
  }
  return key;
})();

export const encryptData = (data: string): string => {
  if (!data) return '';
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
};

export const decryptData = (encryptedData: string): string => {
  if (!encryptedData) return '';
  try {
    // Try to decrypt
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails (returns empty string), return the original data
    // This handles the case where the data wasn't encrypted in the first place
    return decrypted || encryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return the original data if decryption fails
    return encryptedData;
  }
}; 