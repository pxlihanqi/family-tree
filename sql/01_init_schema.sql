-- pure-genealogy 全量初始化脚本
-- 说明：
-- 1) 面向新环境，建议在 Supabase SQL Editor 直接执行本文件。
-- 2) 语句尽量采用 IF NOT EXISTS，支持重复执行。

-- =========================
-- 核心表：family_members
-- =========================
CREATE TABLE IF NOT EXISTS family_members (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    generation integer,
    sibling_order integer,
    father_id bigint,
    gender text CHECK (gender IN ('男', '女')),
    official_position text,
    is_alive boolean DEFAULT true,
    spouse text,
    spouse_id bigint,
    remarks text,
    birthday date,
    death_date date,
    burial_place text,
    residence_place text,
    contact text,
    avatar text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_members_father_id ON family_members(father_id);
CREATE INDEX IF NOT EXISTS idx_family_members_name ON family_members(name);

COMMENT ON COLUMN family_members.burial_place IS '埋葬地点';
COMMENT ON COLUMN family_members.contact IS '联系方式';
COMMENT ON COLUMN family_members.avatar IS '成员头像 URL 或路径';
COMMENT ON COLUMN family_members.spouse_id IS '配偶成员ID（可空，无外键）';

-- =========================
-- 相册与照片
-- =========================
CREATE TABLE IF NOT EXISTS albums (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_member_id bigint UNIQUE,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    album_id bigint,
    family_member_id bigint,
    name text NOT NULL,
    description text,
    url text NOT NULL,
    storage_path text NOT NULL,
    size bigint,
    mime_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_albums_family_member_id ON albums(family_member_id);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_family_member_id ON photos(family_member_id);

COMMENT ON TABLE albums IS '家族成员相册表';
COMMENT ON COLUMN albums.family_member_id IS '关联的家族成员ID';
COMMENT ON TABLE photos IS '相册照片表';
COMMENT ON COLUMN photos.album_id IS '关联的相册ID';
COMMENT ON COLUMN photos.family_member_id IS '关联的家族成员ID';
COMMENT ON COLUMN photos.url IS '照片访问URL';
COMMENT ON COLUMN photos.storage_path IS '照片在存储中的路径';

-- =========================
-- 活动公告
-- =========================
CREATE TABLE IF NOT EXISTS announcements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    description text,
    event_date date,
    location text,
    capacity int,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_signups (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    announcement_id bigint,
    name text NOT NULL,
    contact text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_announcements_event_date ON announcements(event_date);
CREATE INDEX IF NOT EXISTS idx_signups_announcement_id ON announcement_signups(announcement_id);

COMMENT ON TABLE announcements IS '活动公告';
COMMENT ON TABLE announcement_signups IS '公告报名记录';
COMMENT ON COLUMN announcement_signups.announcement_id IS '关联公告ID';

-- =========================
-- 节日动态
-- =========================
CREATE TABLE IF NOT EXISTS holiday_moments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text,
    description text,
    holiday text NOT NULL,
    family_member_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS holiday_media (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    moment_id bigint,
    media_type text NOT NULL,
    url text NOT NULL,
    storage_path text NOT NULL,
    size bigint,
    mime_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_holiday_moments_holiday ON holiday_moments(holiday);
CREATE INDEX IF NOT EXISTS idx_holiday_moments_family_member_id ON holiday_moments(family_member_id);
CREATE INDEX IF NOT EXISTS idx_holiday_media_moment_id ON holiday_media(moment_id);

COMMENT ON TABLE holiday_moments IS '节日动态表';
COMMENT ON COLUMN holiday_moments.holiday IS '节日名称';
COMMENT ON COLUMN holiday_moments.family_member_id IS '发布人关联的家族成员ID';
COMMENT ON TABLE holiday_media IS '节日动态媒体表';
COMMENT ON COLUMN holiday_media.media_type IS '媒体类型: image/video';
COMMENT ON COLUMN holiday_media.url IS '媒体访问URL';
COMMENT ON COLUMN holiday_media.storage_path IS '媒体在存储中的路径';

-- =========================
-- 生平事迹
-- =========================
CREATE TABLE IF NOT EXISTS life_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_member_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    event_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_events_family_member_id ON life_events(family_member_id);
CREATE INDEX IF NOT EXISTS idx_life_events_event_date ON life_events(event_date);

-- =========================
-- 祭品/祭拜
-- =========================
CREATE TABLE IF NOT EXISTS offerings (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    family_member_id bigint,
    content text NOT NULL,
    offered_by text,
    offered_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_offerings_family_member_id ON offerings(family_member_id);

COMMENT ON TABLE offerings IS '上香祭拜记录';
COMMENT ON COLUMN offerings.family_member_id IS '关联成员ID';
COMMENT ON COLUMN offerings.content IS '祭拜内容';
COMMENT ON COLUMN offerings.offered_by IS '祭拜人';
COMMENT ON COLUMN offerings.offered_at IS '祭拜时间';

-- =========================
-- 图片标注
-- =========================
CREATE TABLE IF NOT EXISTS photo_annotation_images (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    image_url text NOT NULL,
    image_name text,
    image_description text,
    storage_path text,
    markers jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_annotation_images_user_id ON photo_annotation_images(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_annotation_images_updated_at ON photo_annotation_images(updated_at DESC);

COMMENT ON TABLE photo_annotation_images IS '图片坐标标注数据（多图片）';
COMMENT ON COLUMN photo_annotation_images.user_id IS 'Supabase Auth 用户ID';
COMMENT ON COLUMN photo_annotation_images.image_description IS '图片描述';
COMMENT ON COLUMN photo_annotation_images.markers IS '标记列表 JSON（x/y 百分比坐标）';

-- =========================
-- 族谱分享
-- =========================
CREATE TABLE IF NOT EXISTS share_links (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token text NOT NULL UNIQUE,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);

COMMENT ON TABLE share_links IS '族谱分享链接';
COMMENT ON COLUMN share_links.token IS '分享访问令牌';
COMMENT ON COLUMN share_links.expires_at IS '过期时间';

-- =========================
-- 祠堂
-- =========================
CREATE TABLE IF NOT EXISTS ancestral_halls (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    photo_url text,
    photo_storage_path text,
    history_intro text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS ancestral_hall_donations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    hall_id bigint NOT NULL,
    donor_name text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0,
    remarks text,
    donated_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS ancestral_hall_photos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL,
    hall_id bigint NOT NULL,
    photo_url text NOT NULL,
    storage_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ancestral_halls_user_id ON ancestral_halls(user_id);
CREATE INDEX IF NOT EXISTS idx_ancestral_halls_updated_at ON ancestral_halls(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_donations_user_id ON ancestral_hall_donations(user_id);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_donations_hall_id ON ancestral_hall_donations(hall_id);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_donations_donated_at ON ancestral_hall_donations(donated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_photos_user_id ON ancestral_hall_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_photos_hall_id ON ancestral_hall_photos(hall_id);
CREATE INDEX IF NOT EXISTS idx_ancestral_hall_photos_created_at ON ancestral_hall_photos(created_at DESC);

COMMENT ON TABLE ancestral_halls IS '祠堂信息';
COMMENT ON COLUMN ancestral_halls.user_id IS 'Supabase Auth 用户ID';
COMMENT ON COLUMN ancestral_halls.history_intro IS '祠堂历史简介';

COMMENT ON TABLE ancestral_hall_donations IS '祠堂捐赠记录';
COMMENT ON COLUMN ancestral_hall_donations.user_id IS 'Supabase Auth 用户ID';
COMMENT ON COLUMN ancestral_hall_donations.hall_id IS '祠堂ID（逻辑关联，不设外键）';
COMMENT ON COLUMN ancestral_hall_donations.amount IS '捐赠金额';

COMMENT ON TABLE ancestral_hall_photos IS '祠堂照片（多张）';
COMMENT ON COLUMN ancestral_hall_photos.user_id IS 'Supabase Auth 用户ID';
COMMENT ON COLUMN ancestral_hall_photos.hall_id IS '祠堂ID（逻辑关联，不设外键）';
