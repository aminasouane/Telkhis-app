// Trial configuration constants
// Minutes-based system: users get 30 minutes of audio processing within 7 days
// Plus daily limit to spread usage across the trial period
export const TRIAL_CONFIG = {
  // Maximum audio minutes allowed during entire trial period
  MAX_AUDIO_MINUTES: 30,
  
  // Maximum audio minutes allowed per day
  DAILY_LIMIT_MINUTES: 5,
  
  // Number of days the trial is valid from first use
  VALIDITY_DAYS: 7,
} as const;

export type TrialConfig = typeof TRIAL_CONFIG;
