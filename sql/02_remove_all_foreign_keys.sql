-- 清理项目业务表上的外键约束（用于历史库兼容）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, cls.relname
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND cls.relname IN (
        'albums',
        'photos',
        'announcement_signups',
        'holiday_moments',
        'holiday_media',
        'life_events',
        'offerings',
        'photo_annotation_images',
        'photo_annotations',
        'ancestral_halls',
        'ancestral_hall_donations',
        'ancestral_hall_photos'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.relname, r.conname);
  END LOOP;
END $$;
