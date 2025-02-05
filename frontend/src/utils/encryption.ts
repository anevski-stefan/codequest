import CryptoJS from 'crypto-js';
const ENCRYPTION_KEY = 'your-secure-key';
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
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData;
  }
};