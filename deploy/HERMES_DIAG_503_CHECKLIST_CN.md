# brakehub.cn 503 排障命令清单（给云端 Hermes Agent）

目标：定位 `http://brakehub.cn` / `http://www.brakehub.cn` 出现 `HTTP 503` 的根因。  
要求：按顺序执行，保存原始输出，逐段反馈。

---

## A. 基础信息采集

```bash
set -x
date
uname -a
cat /etc/os-release
whoami
pwd
```

---

## B. DNS 与网络连通性

```bash
dig +short brakehub.cn A
dig +short www.brakehub.cn A
curl -I --max-time 10 http://127.0.0.1
curl -I --max-time 10 http://localhost
curl -I --max-time 10 http://brakehub.cn
curl -I --max-time 10 http://www.brakehub.cn
```

预期：
- `dig` 返回服务器公网 IP（如 `211.159.168.121`）
- 本机 `127.0.0.1`/`localhost` 应至少有可响应 HTTP 头

---

## C. 端口与进程占用

```bash
sudo ss -ltnp | grep -E ':80|:443|:8000|:8080' || true
ps -ef | grep -E 'nginx|docker|containerd|caddy|apache2' | grep -v grep || true
```

关注：
- `:80` 是否被 Docker/Nginx 占用
- 是否有宝塔/Nginx/其他服务抢占 80

---

## D. Docker/Compose 状态

在项目目录执行（替换为真实路径）：

```bash
cd ~/apps/brake-calc || cd /opt/brake-calc || pwd
docker version
docker compose version
docker compose ps
docker compose config
```

---

## E. 容器日志与健康检查

```bash
docker compose logs --no-color --tail=300 app
docker compose logs --no-color --tail=300 web
docker compose exec app python - <<'PY'
import requests
print("skip requests check if not installed")
PY
docker compose exec app sh -lc "wget -qO- http://127.0.0.1:8000/api/health || curl -sS http://127.0.0.1:8000/api/health"
docker compose exec web sh -lc "wget -qO- http://app:8000/api/health || curl -sS http://app:8000/api/health"
```

预期：
- `app` 返回 `{"ok":true}`
- `web` 容器内访问 `http://app:8000/api/health` 也应成功

---

## F. Nginx 配置核对（容器内）

```bash
docker compose exec web sh -lc "nginx -t"
docker compose exec web sh -lc "cat /etc/nginx/conf.d/default.conf"
```

必须确认：
- `location /api/` 的 `proxy_pass` 指向 `http://app:8000`
- 有 `location / { try_files $uri $uri/ /index.html; }`

---

## G. 快速修复动作（仅当检查失败时执行）

### G1. 容器未正常运行

```bash
docker compose down
docker compose up -d --build
docker compose ps
```

### G2. app 正常但 web 反代失败

```bash
docker compose restart web
docker compose logs --no-color --tail=200 web
```

### G3. 80 端口冲突

1. 先定位占用进程：
```bash
sudo ss -ltnp | grep ':80'
```
2. 临时改 `docker-compose.yml` 为 `8080:80` 验证应用可用，再处理 80 冲突。

---

## H. 最终验收回传（必须提供）

请 Hermes 最后回传以下 6 段输出：

1. `docker compose ps`
2. `docker compose logs --no-color --tail=120 app`
3. `docker compose logs --no-color --tail=120 web`
4. `docker compose exec app ... /api/health` 输出
5. `docker compose exec web ... http://app:8000/api/health` 输出
6. `curl -I http://brakehub.cn` 与 `curl -I http://www.brakehub.cn` 输出

---

## 备注（针对你当前现象）

- 你浏览器显示 `www.brakehub.cn` 的 `HTTP 503`，这通常说明：
  - 域名和 80 端口已通
  - 但上游应用不可达或代理配置不匹配
- 最可能出问题的点：
  - `web` 容器 Nginx 没能连到 `app:8000`
  - 80 端口实际由其他 Nginx/面板接管
  - 部署目录不是当前项目，导致运行了旧 compose

