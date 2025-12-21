const APP_USER_ID_KEY = 'app_user_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getOrCreateAppUserId(): string {
  try {
    const existingId = localStorage.getItem(APP_USER_ID_KEY);
    
    if (existingId) {
      return existingId;
    }
    
    const newId = generateUUID();
    localStorage.setItem(APP_USER_ID_KEY, newId);
    return newId;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return generateUUID();
  }
}

export function getAppUserId(): string | null {
  try {
    return localStorage.getItem(APP_USER_ID_KEY);
  } catch (error) {
    console.error('Error reading app_user_id:', error);
    return null;
  }
}

export function hasAppUserId(): boolean {
  try {
    return localStorage.getItem(APP_USER_ID_KEY) !== null;
  } catch (error) {
    return false;
  }
}

export function clearAppUserId(): void {
  try {
    localStorage.removeItem(APP_USER_ID_KEY);
  } catch (error) {
    console.error('Error clearing app_user_id:', error);
  }
}
