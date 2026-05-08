# brake-calc 云端部署说明（给 Hermes Agent）

本文用于指导云服务器上的 Hermes Agent 完成 `brake-calc` 部署。  
目标是让用户通过浏览器访问域名并使用系统。

## 1. 部署目标

- 使用 Docker Compose 部署两个服务：
  - `app`：FastAPI 后端（容器端口 `8000`）
  - `web`：Nginx 托管前端并反向代理 `/api`（容器端口 `80`）
- 对外提供：
  - HTTP：`80`
  - HTTPS：`443`（推荐）

## 2. 服务器前置要求

- 操作系统：Ubuntu 22.04+/Debian 12+（推荐）
- 已具备：
  - 公网 IP
  - 域名（A 记录可指向服务器）
- 安全组/防火墙放行：
  - `22`（SSH）
  - `80`（HTTP）
  - `443`（HTTPS）

## 3. 安装 Docker 与 Compose（国内镜像源）

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.ustc.edu.cn/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

source /etc/os-release
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.ustc.edu.cn/docker-ce/linux/ubuntu ${UBUNTU_CODENAME} stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

重新登录一次 SSH 使 `docker` 免 `sudo` 生效。

## 4. Docker 国内加速配置（强烈建议）

创建或更新 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com"
  ]
}
```

重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
docker info
```

## 5. 拉取代码并准备部署

```bash
mkdir -p ~/apps
cd ~/apps
git clone <你的仓库地址> brake-calc
cd brake-calc
```

## 6. 生产部署前配置检查

### 6.1 端口映射

编辑 `docker-compose.yml`，云端建议 `web` 使用：

```yaml
ports:
  - "80:80"
```

如果你仍想临时避开 80 端口冲突，可先用 `8080:80`，后续再切回 `80:80`。

### 6.2 数据库持久化（当前方案）

当前项目使用 SQLite + Docker Volume。`app` 服务应保持：

```yaml
environment:
  BRAKE_CALC_DB_PATH: /data/brake_calc.db
volumes:
  - brake_calc_data:/data
```

不要在生产长期使用 `./out:/data` 绑定方式（仅适合本地临时迁移）。

## 7. 启动服务

```bash
cd ~/apps/brake-calc
docker compose up -d --build
docker compose ps
```

健康检查：

```bash
curl http://127.0.0.1:8000/api/health
```

预期返回：

```json
{"ok":true}
```

若 `web` 用 `80:80`，浏览器可直接访问：

- `http://<服务器公网IP>`
- 或 `http://<你的域名>`

## 8. 启用 HTTPS（推荐：Nginx + Certbot）

### 8.1 安装 Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### 8.2 申请证书

先确保域名 A 记录已指向服务器公网 IP，再执行：

```bash
sudo certbot --nginx -d <你的域名> -d www.<你的域名>
```

按提示选择自动跳转 HTTPS。

### 8.3 自动续期验证

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 9. 发布后更新流程

```bash
cd ~/apps/brake-calc
git pull
docker compose up -d --build
docker compose ps
```

## 10. 常见问题排查

### 10.1 拉镜像超时

- 现象：`TLS handshake timeout`、`i/o timeout`
- 处理：
  - 确认第 4 节镜像加速已配置
  - 重试 `docker pull` 后再 `docker compose up -d --build`

### 10.2 端口 80 被占用

```bash
sudo ss -ltnp | grep ':80'
```

- 暂时改 `docker-compose.yml` 为 `8080:80`
- 排查并释放 80 后改回 `80:80`

### 10.3 服务已起但页面 502/无法访问

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 web
```

- 确认 `app` 为 `Up`
- 确认 `web` 配置里 `/api/` 反向代理目标是 `http://app:8000`

## 11. 给 Hermes Agent 的执行要求（建议）

1. 先执行“只读检查”（系统版本、端口占用、Docker 状态）。  
2. 再执行安装与部署命令。  
3. 每完成一阶段，回传命令输出摘要（成功/失败、关键日志）。  
4. 涉及删除数据前，先备份数据库（如导出 `brake_calc.db` 备份）。  
5. 部署完成后，回传三个验收结果：
   - `docker compose ps`
   - `curl /api/health`
   - 浏览器访问域名截图或状态说明

