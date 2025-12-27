// Trial configuration constants
// Minutes-based system: 30 minutes per day × 7 days = 210 minutes total
export const TRIAL_CONFIG = {
  // Maximum audio minutes allowed during entire trial period (30 × 7 = 210)
  MAX_AUDIO_MINUTES: 210,
  
  // Maximum audio minutes allowed per day
  DAILY_LIMIT_MINUTES: 30,
  
  // Number of days the trial is valid from first use
  VALIDITY_DAYS: 7,
} as const;

export type TrialConfig = typeof TRIAL_CONFIG;
