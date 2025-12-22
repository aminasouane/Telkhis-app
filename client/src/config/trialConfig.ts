// Trial configuration constants
// Minutes-based system: users get 30 minutes of audio processing within 7 days
export const TRIAL_CONFIG = {
  // Maximum audio minutes allowed during trial period
  MAX_AUDIO_MINUTES: 30,
  
  // Number of days the trial is valid from first use
  VALIDITY_DAYS: 7,
} as const;

export type TrialConfig = typeof TRIAL_CONFIG;
