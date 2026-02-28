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
                ('TRIAL_LIMITS', '{"MAX_AUDIO_MINUTES": 210, "DAILY_LIMIT_MINUTES": 30, "VALIDITY_DAYS": 7, "MAX_FILE_DURATION_SECONDS": 300}', 'Trial plan limits'),
                ('STUDENT_LIMITS', '{"DAILY_LIMIT_MINUTES": 120}', 'Student plan daily limits'),
                ('PRO_LIMITS', '{"DAILY_LIMIT_MINUTES": 300}', 'Professional plan daily limits')
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log("Migration successful: system_settings created and seeded.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrateSettings();
