import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

async function migrateSettings() {
    console.log("Connecting to DB...");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.system_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            
            ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
            
            INSERT INTO public.system_settings (key, value, description)
            VALUES 
                ('TRIAL_LIMITS', '{"MAX_AUDIO_MINUTES": 900, "DAILY_LIMIT_MINUTES": 30, "VALIDITY_DAYS": 30, "MAX_FILE_DURATION_SECONDS": 300}', 'Trial plan limits'),
                ('PAID_LIMITS', '{"DAILY_LIMIT_MINUTES": 45, "TOTAL_MINUTES": 1350}', 'Paid plan limits'),
                ('STUDENT_LIMITS', '{"DAILY_LIMIT_MINUTES": 45}', 'Student plan daily limits'),
                ('PRO_LIMITS', '{"DAILY_LIMIT_MINUTES": 45}', 'Professional plan daily limits')
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                description = EXCLUDED.description,
                updated_at = timezone('utc'::text, now());
        `);
        console.log("Migration successful: system_settings created and seeded.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrateSettings();
