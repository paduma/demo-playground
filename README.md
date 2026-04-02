# ToB SaaS Frontend Toolkit

[中文](#中文说明) | **English**

A collection of 10 enterprise-grade frontend demos extracted from real ToB SaaS project experience. Each demo focuses on a specific product pattern or engineering challenge commonly found in B2B applications.

## ✨ Demo List

| #   | Demo                       | Description                                                        | Key Tech                             |
| --- | -------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| 1   | Approval Template Designer | Form builder + flow designer in one, like DingTalk/Feishu approval | JSON Schema, SVG, dnd-kit            |
| 2   | RBAC Permission Manager    | Role list + menu tree + button-level permission matrix             | Ant Design Tree, Checkbox matrix     |
| 3   | Configurable Table         | Query filter customization + column visibility/sort/pin            | localStorage persistence, dnd-kit    |
| 4   | Org Tree                   | Recursive tree with lazy loading, search highlight, context menu   | Async tree, recursive component      |
| 5   | File Manager               | Grid/list view, breadcrumb, drag-upload, copy/cut/paste            | Tree CRUD, view switching            |
| 6   | Notification Center        | Categorized tabs, unread badges, real-time push simulation         | setInterval push, message state      |
| 7   | Virtual Editable Table     | Virtual scrolling + inline editing, data preserved on scroll       | Manual virtualization, Form sync     |
| 8   | Text Highlight             | Multi-keyword + URL auto-detection, XSS-safe React nodes           | Interval merging algorithm           |
| 9   | Resizable Table            | Draggable column width + column config persistence                 | react-resizable, localStorage        |
| 10  | Token Auto-Refresh         | Axios interceptor with queue-based token refresh                   | 401 retry queue, concurrency control |

## 🛠️ Tech Stack

- React 18 + TypeScript
- Ant Design 5
- Vite
- dnd-kit (drag and drop)
- react-resizable
- Axios

## 🚀 Quick Start

```bash
git clone https://github.com/paduma/demo-playground.git
cd demo-playground
npm install
npm run dev
```

Open http://localhost:5173

## 📁 Project Structure

```
demo-playground/
├── src/
│   ├── demos/
│   │   ├── ApprovalTemplateDemo.tsx      # Approval template designer
│   │   ├── approval-flow/               # Flow designer types & components
│   │   ├── FormBuilderDemo.tsx           # Standalone form builder
│   │   ├── form-builder/                # Form builder types & components
│   │   ├── RbacDemo.tsx                  # RBAC permission manager
│   │   ├── rbac/                        # RBAC types & mock data
│   │   ├── ConfigurableTableDemo.tsx     # Configurable table
│   │   ├── OrgTreeDemo.tsx              # Org tree
│   │   ├── org-tree/                    # Org tree types & mock data
│   │   ├── FileManagerDemo.tsx          # File manager
│   │   ├── file-manager/               # File manager types & mock data
│   │   ├── NotificationDemo.tsx         # Notification center
│   │   ├── VirtualEditableTableDemo.tsx # Virtual editable table
│   │   ├── TextHighlightDemo.tsx        # Text highlight
│   │   ├── ResizableTableDemo.tsx       # Resizable table
│   │   └── RequestDemo.tsx              # Token auto-refresh
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## 📖 Demo Details

### 1. Approval Template Designer

A unified approval template configuration page inspired by DingTalk/Feishu, with two tabs:

- **Form Design**: JSON Schema-driven form builder with drag-sort fields, field config panel, template presets, JSON import/export
- **Flow Design**: SVG canvas with draggable approval nodes, bezier curve connections, condition branches that reference form fields

### 2. RBAC Permission Manager

Three-column layout for role-based access control:

- Left: Role CRUD (create, edit, copy, delete)
- Middle: Menu permission tree with cascading checkboxes
- Right: Button-level permission matrix (view/create/edit/delete/export/import) with row/column select-all

### 3. Configurable Table

Full-featured order management page demonstrating:

- Configurable query filters (show/hide conditions, expand/collapse)
- Column visibility, drag-sort, left/right pin
- Table density toggle, batch operations, localStorage persistence

### 4. Org Tree

Recursive organization tree with:

- Four node types: company, department, team, person
- Async lazy loading with loading state
- Search with keyword highlight and auto-expand matched paths
- Right-click context menu (add/edit/copy/delete)
- Detail panel with parent info and child list

### 5. File Manager

Desktop-style file management:

- Grid and list view toggle
- Breadcrumb navigation with folder drill-down
- Right-click context menu (open/rename/copy/cut/paste/delete)
- Drag-to-upload zone simulation
- Search and multi-sort (name/date/size)
- Multi-select with Ctrl+Click

### 6. Notification Center

Real-time message notification system:

- Category tabs (all/unread/system/approval/task/alert) with unread badges
- Simulated real-time push (new message every 8s with toast)
- Mark read, mark all read, clear read messages
- Push on/off toggle

### 7-10. Engineering Utilities

See the table above for details on Virtual Editable Table, Text Highlight, Resizable Table, and Token Auto-Refresh.

---

<a id="中文说明"></a>

## 中文说明

基于真实 ToB SaaS 项目经验提炼的 10 个企业级前端 Demo 合集。每个 Demo 聚焦一个具体的产品形态或工程难点。

### 启动

```bash
npm install
npm run dev
```

### Demo 列表

| #   | Demo               | 说明                                                 |
| --- | ------------------ | ---------------------------------------------------- |
| 1   | 审批模板设计器     | 表单设计 + 流程设计一体化，类似钉钉/飞书审批模板配置 |
| 2   | 权限管理可视化     | 角色列表 + 菜单权限树 + 按钮级权限矩阵               |
| 3   | 可配置表格         | 查询条件自定义 + 表头列显隐/排序/固定 + 持久化       |
| 4   | 树形组织架构       | 递归树 + 懒加载 + 搜索高亮 + 右键菜单                |
| 5   | 文件管理器         | 网格/列表视图 + 面包屑 + 拖拽上传 + 复制剪切粘贴     |
| 6   | 消息通知中心       | 分类 Tab + 未读标记 + 实时推送模拟                   |
| 7   | 虚拟滚动可编辑表格 | 手动虚拟滚动 + 行内编辑 + 滚出数据保留               |
| 8   | 多关键词文本高亮   | 多关键词 + URL 识别 + 防 XSS React 节点方案          |
| 9   | 可拖拽列宽表格     | 列宽拖拽 + 列配置持久化                              |
| 10  | Token 自动刷新     | Axios 拦截器 + 队列排队 + 并发刷新控制               |

## 📄 License

MIT

## 👤 Author

Paduma ([@paduma](https://github.com/paduma))
