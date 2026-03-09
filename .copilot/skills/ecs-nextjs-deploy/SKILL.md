---
name: ecs-nextjs-deploy
description: Deploy and maintain Next.js projects on Alibaba Cloud ECS with GitHub, PM2, and Nginx path-based routing. Use for first-time deployment, /subpath hosting, updates, and rollback checks.
---

# ECS Next.js 部署技能

执行基于 ECS 的 Next.js 部署与维护，适用于多项目共用一台服务器的场景。

## 适用前提

- 服务器为 Linux（Ubuntu/Debian）
- 代码已推送到 GitHub
- 已能通过 SSH 登录 ECS
- 目标项目可在 `npm run build` 通过

## 标准流程

1. 在本地修改代码并推送到 GitHub
2. 在 ECS 拉取代码并构建
3. 用 PM2 托管 Next.js 进程
4. 用 Nginx 配置路径路由（如 `/myreader`）
5. 验证页面与静态资源路径

## 本地发布步骤

```bash
git add .
git commit -m "feat: update"
git push
```

若使用子路径部署，必须配置 Next：

```ts
// web/next.config.ts
basePath: "/myreader"
```

## ECS 更新步骤

```bash
cd /var/www/myReader
git pull
cd web
npm ci
npm run build
pm2 restart myreader
pm2 save
```

## PM2 首次启动

```bash
cd /var/www/myReader/web
npm ci
npm run build
pm2 start npm --name myreader -- start
pm2 save
pm2 startup
```

## Nginx 路径路由模板

`/etc/nginx/sites-available/myreader`：

```nginx
server {
    listen 80;
    server_name _;

    location /myreader/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用并生效：

```bash
ln -sf /etc/nginx/sites-available/myreader /etc/nginx/sites-enabled/myreader
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

## 验证清单

- `pm2 status` 中 `myreader` 为 `online`
- `nginx -t` 返回 successful
- 访问 `http://<ECS-IP>/myreader` 正常
- 页面静态资源无 404

## 常见问题

- 页面 404：检查 `basePath` 与 Nginx `location /myreader/` 是否一致
- 静态资源 404：确认已重新 `npm run build`
- 配置改了不生效：确认 `pm2 restart myreader` 与 `systemctl restart nginx` 都执行
