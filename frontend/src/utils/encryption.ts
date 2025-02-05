import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-secure-key'; // In production, this should be an environment variable

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