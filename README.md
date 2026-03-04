# pure-genealogy 族谱管理系统

<p align="center">
  <img alt="pure-genealogy Tree" src="app/demo.gif" width="800">
</p>

<p align="center">
  基于 Next.js + Supabase 的全中文家族族谱管理系统。
</p>

## 项目简介

`pure-genealogy` 是一个面向中文家族场景的族谱平台，提供成员档案管理、关系图谱可视化、时间轴与统计分析、家族公告与共享等能力。

核心特性：

- 成员管理：支持成员增删改查、配偶/父子关系、联系方式、墓地、头像等档案字段。
- 可视化：支持 2D 族谱图、3D 力导向图、家族时间轴、统计仪表盘。
- 生平记录：支持富文本生平编辑与传记书（`biography-book`）展示。
- 家族内容：支持相册、照片标注、节日时刻、公告、祖祠、祭品等模块。
- 分享能力：支持基于 token 的公开访问页面（只读查看）。
- 认证与权限：基于 Supabase Auth 的登录/注册/密码重置与权限管理页面。

## 技术栈

- 前端框架：[Next.js](https://nextjs.org/)（App Router）+ React 19 + TypeScript
- 后端能力：[Supabase](https://supabase.com/)（PostgreSQL / Auth / Realtime / Storage）
- UI 与样式：Tailwind CSS + Radix UI + shadcn/ui
- 图谱与图表：`@xyflow/react`、`react-force-graph-3d`、`recharts`
- 富文本：`slate` / `slate-react`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

最小配置如下：

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_FAMILY_SURNAME=刘
```

### 3. 初始化数据库（Supabase SQL Editor）

执行合并脚本：

1. `01_init_schema.sql`（全量建表 + 补字段 + 索引 + 注释）
2. `02_remove_all_foreign_keys.sql`（仅旧库兼容时按需执行）

### 4. 配置 Supabase Storage（按需）

请参考 `storage/` 下说明文档：

- `SETUP_SUPABASE_STORAGE.md`
- `SETUP_PHOTOS_STORAGE.md`
- `SETUP_PHOTO_ANNOTATIONS_STORAGE.md`
- `SETUP_HOLIDAY_MEDIA_STORAGE.md`

### 5. 启动开发环境

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run start    # 启动生产服务
```

## 主要页面

- `/family-tree`：成员列表与基础管理
- `/family-tree/graph`：2D 族谱图
- `/family-tree/graph-3d`：3D 族谱关系图
- `/family-tree/timeline`：家族时间轴
- `/family-tree/statistics`：统计分析
- `/family-tree/life-events`：人生事件
- `/family-tree/albums`：家族相册
- `/family-tree/photo-annotation`：照片标注
- `/family-tree/announcements`：家族公告
- `/family-tree/ancestral-halls`：祖祠管理
- `/family-tree/offerings`：祭品管理
- `/family-tree/memorial`：纪念功能
- `/share/[token]`：公开分享页

## 项目结构

```text
app/                 Next.js App Router 页面与服务端逻辑
components/          通用组件与业务组件
lib/                 Supabase 客户端、权限、工具方法
hooks/               自定义 React Hooks
sql/                 数据库结构与迁移脚本
storage/             Supabase Storage 配置说明
```

## 许可证

本项目采用 [MIT](LICENSE) 许可证。

## 致谢

本项目基于开源项目 [yunfengsa/pure-genealogy](https://github.com/yunfengsa/pure-genealogy) 进行开发与扩展，感谢原作者及贡献者的工作。
