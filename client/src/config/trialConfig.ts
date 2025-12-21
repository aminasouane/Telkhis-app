export const TRIAL_CONFIG = {
  MAX_SUMMARIES: 1,
  MAX_AUDIO_MINUTES: 30,
  VALIDITY_DAYS: 7,
} as const;

export type TrialConfig = typeof TRIAL_CONFIG;
