# Game Test Tracker

极简游戏测试记录工具，用于记录测试任务、测试用例、测试结果等信息。

## 技术栈

- **后端**：FastAPI（端口 8080，同时提供 UI 和 REST API）
- **数据库**：PostgreSQL（Zeabur）
- **认证**：HTTP Basic Auth（浏览器原生弹窗，无需登录页）
- **部署**：Docker（GHCR 镜像）

## Zeabur 部署

### 1. 创建 PostgreSQL 数据库

在 Zeabur 控制台创建 PostgreSQL 数据库，复制连接字符串（`DATABASE_URL`）。

### 2. 部署服务

在 Zeabur  Marketplace 安装 **game-test-tracker**，或手动从 GitHub 部署：

- 镜像地址：`ghcr.io/kumacoolgo/game-test-tracker:latest`

### 3. 配置环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串（必填） |
| `APP_USER` | 登录用户名（默认：admin） |
| `APP_PASSWORD` | 登录密码（必填） |

### 4. 绑定端口

将容器端口 **8080** 映射到外部访问。

### 5. 连接数据库

将应用服务绑定到 PostgreSQL 所在的网络。

## 使用说明

打开应用后，浏览器会弹出 HTTP Basic Auth 认证框，输入 `APP_USER` / `APP_PASSWORD` 即可进入。

## API 接口（均需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/{id} | 更新任务 |
| DELETE | /api/tasks/{id} | 删除任务 |
| PUT | /api/tasks/reorder | 调整顺序（`{"id": 1, "direction": "up\|down"}`） |
| GET | /health | 健康检查（无需认证） |
