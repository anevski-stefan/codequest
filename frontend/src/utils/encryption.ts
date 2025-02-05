import CryptoJS from 'crypto-js';
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
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData;
  }
};