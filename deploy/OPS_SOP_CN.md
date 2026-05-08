# brake-calc 运维 SOP（生产）

## 1. 服务状态检查

```bash
cd ~/apps/brake-calc
docker compose ps
docker compose logs --no-color --tail=120 app
docker compose logs --no-color --tail=120 web
curl -k https://brakehub.cn/api/health
```

## 2. 日常发布更新

```bash
cd ~/apps/brake-calc
git pull
docker compose up -d --build
docker compose ps
```

## 3. 快速重启

```bash
cd ~/apps/brake-calc
docker compose restart app web
docker compose ps
```

## 4. 回滚（按上一版本代码）

```bash
cd ~/apps/brake-calc
git log --oneline -n 5
git checkout <上一个稳定commit>
docker compose up -d --build
docker compose ps
```

## 5. 证书检查与续期

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

证书路径（当前）：

- `/opt/brakehub/certs/live/brakehub.cn/fullchain.pem`
- `/opt/brakehub/certs/live/brakehub.cn/privkey.pem`

## 6. 常见故障处理

### 6.1 域名返回 502/503

```bash
cd ~/apps/brake-calc
docker compose ps
docker compose logs --no-color --tail=200 web
docker compose logs --no-color --tail=200 app
docker compose exec web sh -lc "wget -qO- http://app:8000/api/health || curl -sS http://app:8000/api/health"
```

### 6.2 80/443 端口冲突

```bash
sudo ss -ltnp | grep -E ':80|:443'
```

停止冲突服务后重启：

```bash
cd ~/apps/brake-calc
docker compose restart web
```

### 6.3 磁盘不足

```bash
df -h
docker system df
docker image prune -f
```

## 7. 数据备份（SQLite）

```bash
cd ~/apps/brake-calc
docker compose exec app cp /data/brake_calc.db /data/brake_calc.db.bak_$(date +%F_%H%M%S)
```

如需导出到宿主机：

```bash
docker cp brake-calc-app:/data/brake_calc.db ./backup_brake_calc.db
```

## 8. 重启后自启动确认

```bash
docker inspect -f '{{ .HostConfig.RestartPolicy.Name }}' brake-calc-app
docker inspect -f '{{ .HostConfig.RestartPolicy.Name }}' brake-calc-web
```

预期：`unless-stopped`

