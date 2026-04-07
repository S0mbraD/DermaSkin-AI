# Electron 桌面应用架构

## 架构概览

DermaSkin AI 采用 **Vite + Electron** 的混合架构，支持 Web 和桌面两种运行模式。

```
┌─────────────────────────────────────────────┐
│              Electron 主进程                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ main.ts  │  │database  │  │   IPC     │  │
│  │ 窗口管理  │←→│  .ts     │←→│ handlers  │  │
│  │ 生命周期  │  │ SQLite   │  │  .ts      │  │
│  └──────────┘  └──────────┘  └─────┬─────┘  │
│                                     │ IPC    │
│  ┌──────────────────────────────────┤        │
│  │          preload.ts              │        │
│  │    contextBridge.exposeInMainWorld        │
│  └──────────────────────────────────┘        │
└─────────────────────────┬───────────────────┘
                          │ window.electronAPI
┌─────────────────────────┴───────────────────┐
│              渲染进程 (Vite + React)          │
│  ┌────────────┐  ┌────────────┐              │
│  │ dbService  │  │  Zustand   │              │
│  │   .ts      │→ │  Stores    │              │
│  │ 抽象层     │  │            │              │
│  └────────────┘  └────────────┘              │
│                                              │
│  ┌──── 自动检测运行环境 ────┐                 │
│  │ isElectron() → IPC 调用  │                 │
│  │ !isElectron → localStorage│                 │
│  └──────────────────────────┘                 │
└──────────────────────────────────────────────┘
```

## 数据库设计

### 表结构

| 表名 | 用途 | 主键 |
|------|------|------|
| `students` | 学员信息 | id (INTEGER) |
| `courses` | 课程配置 | id (TEXT) |
| `evaluations` | 评估记录 | id (AUTOINCREMENT) |
| `analysis_results` | AI 分析结果 | id (TEXT, UUID) |
| `settings` | 应用设置 | key (TEXT) |

### 关键索引

- `idx_evaluations_student` — 按学员查询评估
- `idx_evaluations_course` — 按课程查询评估
- `idx_analysis_course` — 按课程查询分析
- `idx_analysis_student` — 按学员查询分析

### JSON 序列化字段

以下字段在数据库中存储为 JSON 文本，读取时自动反序列化：

- `students.recent_scores` → `number[]`
- `students.skills` → `Record<string, number>`
- `students.epa_progress` → `Record<string, { level, lastAssessed }>`
- `courses.rubric` → `RubricDim[]`
- `evaluations.scores` → `number[]`
- `analysis_results.dimension_scores` → 维度评分数组
- `analysis_results.evidence_details` → 循证证据详情
- `analysis_results.transcript` → 语音转录分段

## IPC 通信协议

### 数据库操作 (invoke/handle)

| 通道 | 参数 | 返回 |
|------|------|------|
| `db:students:getAll` | - | `Student[]` |
| `db:students:get` | `id: number` | `Student \| null` |
| `db:students:upsert` | `Student` | `{ ok }` |
| `db:students:delete` | `id: number` | `{ ok }` |
| `db:courses:getAll` | - | `Course[]` |
| `db:courses:upsert` | `Course` | `{ ok }` |
| `db:evaluations:getByCourse` | `courseId: string` | `Evaluation[]` |
| `db:evaluations:getByStudent` | `studentId: number` | `Evaluation[]` |
| `db:evaluations:upsert` | `Evaluation` | `{ ok }` |
| `db:analyses:getAll` | `courseId?: string` | `Analysis[]` |
| `db:analyses:get` | `id: string` | `Analysis \| null` |
| `db:analyses:save` | `Analysis` | `{ ok }` |
| `db:analyses:delete` | `id: string` | `{ ok }` |
| `db:settings:get` | `key: string` | `string \| null` |
| `db:settings:set` | `key, value` | `{ ok }` |
| `db:settings:getAll` | - | `Record<string, string>` |

### 文件操作

| 通道 | 说明 |
|------|------|
| `file:openVideoDialog` | 原生文件选择对话框 (视频) |
| `file:readVideoAsUrl` | 读取视频为 data URL |
| `file:saveReport` | 保存报告 (HTML/PDF) |
| `file:copyVideoToAppData` | 复制视频到应用数据目录 |
| `file:getAppDataPath` | 获取应用数据路径 |

### 应用控制 (send)

| 通道 | 说明 |
|------|------|
| `app:minimize` | 最小化窗口 |
| `app:maximize` | 最大化/还原窗口 |
| `app:close` | 关闭窗口 |

## 安全模型

- **contextIsolation: true** — 渲染进程与 Node.js 完全隔离
- **nodeIntegration: false** — 渲染进程无法直接访问 Node API
- **sandbox: false** — preload 脚本可使用 Node API（仅限 IPC）
- 所有 DB 操作通过 IPC handle/invoke 模式，不暴露 SQL

## 开发/构建流程

```
开发模式:
  npm run dev:electron
  ├── tsup → 构建 electron/ → dist-electron/
  ├── vite → 启动 dev server (localhost:5173)
  └── electron . → 加载 localhost:5173

生产构建:
  npm run dist
  ├── vite build → dist/
  ├── tsup → dist-electron/
  └── electron-builder → release/
      └── DermaSkin AI-1.0.0-Setup.exe
```

## 数据路径

| 平台 | 应用数据目录 |
|------|-------------|
| Windows | `%APPDATA%/dermaskin-ai/` |
| macOS | `~/Library/Application Support/dermaskin-ai/` |
| Linux | `~/.config/dermaskin-ai/` |

数据库文件：`{userData}/dermaskin.db`
视频文件：`{userData}/videos/`

## 自动更新机制

基于 `electron-updater` 实现应用自动更新。

### 更新流程

```
应用启动 → 10秒后自动检查 → 发现新版本
    │                           │
    │                     ┌─────┴─────┐
    │                     │ renderer  │
    │                     │ 通知栏    │
    │                     └─────┬─────┘
    │                           │
    │                     用户点击「下载」
    │                           │
    │                     下载中（进度条）
    │                           │
    │                     下载完成
    │                           │
    │                     用户点击「立即重启」
    │                           │
    └── quitAndInstall() ←──────┘
```

### 文件结构

| 文件 | 用途 |
|------|------|
| `electron/updater.ts` | 主进程更新逻辑（检查/下载/安装） |
| `electron/preload.ts` | 暴露 updater IPC API |
| `src/components/UpdateNotification.tsx` | 渲染进程更新通知 UI |

### IPC 通道

| 通道 | 方向 | 说明 |
|------|------|------|
| `updater:check` | renderer → main | 手动触发检查 |
| `updater:download` | renderer → main | 开始下载 |
| `updater:install` | renderer → main | 退出并安装 |
| `updater:available` | main → renderer | 新版本可用 |
| `updater:progress` | main → renderer | 下载进度 |
| `updater:downloaded` | main → renderer | 下载完成 |
| `updater:error` | main → renderer | 更新错误 |
