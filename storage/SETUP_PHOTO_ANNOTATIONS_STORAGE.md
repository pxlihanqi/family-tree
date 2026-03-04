# Supabase 图片标注存储配置指南

为了支持跨设备同步图片标注（多图片），需要在 Supabase 控制台中配置图片存储桶。

## 步骤 1：登录 Supabase 控制台

1. 打开 [Supabase 控制台](https://app.supabase.com/)
2. 选择您的项目

## 步骤 2：创建存储桶

1. 在左侧导航栏中，点击 "Storage"（存储）
2. 点击 "New Bucket"（新建存储桶）按钮
3. 在弹出的对话框中：
   - **Name**（名称）：输入 `photo-annotations`
   - **Public**（公开）：勾选此选项
   - **File Size Limit**（文件大小限制）：建议设置为 10MB
   - **Allowed MIME Types**（允许的 MIME 类型）：输入 `image/*`
4. 点击 "Create Bucket"（创建存储桶）

## 步骤 3：配置权限

1. 进入 `photo-annotations` 存储桶
2. 在 "Policies"（策略）中创建允许已登录用户上传与读取的策略
3. 如果希望直接通过 URL 访问图片，请保持存储桶为 Public

## 步骤 4：执行数据库脚本

在 Supabase SQL Editor 中执行：

- `sql/01_init_schema.sql`

## 注意事项

- 存储桶名称必须为 `photo-annotations`（或同步修改代码常量）
- 标记数据保存在 `photo_annotation_images` 表，图片保存在 Storage
- 同一用户可以上传多张图片，每张图片的标记独立保存
