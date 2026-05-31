# 日有回响

一个给 Krissy 用的复习、日历、待办和每日备注 app。

## 部署方式

这是纯静态网页，`index.html`、`styles.css`、`app.js` 可以直接部署到 GitHub Pages、Netlify 或 Vercel。

正式网址：

- GitHub Pages: `https://krissylew0809-creator.github.io/riyouhuixiang/`

## 数据说明

当前版本的数据会先保存在浏览器本地存储里。正式链接固定之后，同一个浏览器访问同一个网址会保留完成记录。

为了防止换浏览器或换网址丢数据，app 内置了「数据保险箱」：

- 功能列表 -> 数据保险箱 -> 导出备份
- 新网址/新浏览器 -> 数据保险箱 -> 导入备份

## 云同步

app 已接入 Supabase 云同步。同步数据会先用用户自己的同步口令在浏览器里加密，再上传到 Supabase。

Supabase 表结构：

```sql
create table if not exists riyouhuixiang_sync (
  id text primary key,
  encrypted_payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table riyouhuixiang_sync enable row level security;

create policy "read sync snapshots" on riyouhuixiang_sync
for select using (true);

create policy "insert sync snapshots" on riyouhuixiang_sync
for insert with check (true);

create policy "update sync snapshots" on riyouhuixiang_sync
for update using (true) with check (true);
```
