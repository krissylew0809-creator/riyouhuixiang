# 日有回响

一个给 Krissy 用的复习、日历、待办和每日备注 app。

## 部署方式

这是纯静态网页，`index.html`、`styles.css`、`app.js` 可以直接部署到 GitHub Pages、Netlify 或 Vercel。

推荐正式网址：

- GitHub Pages: `https://<github-username>.github.io/riyouhuixiang/`
- Netlify: 自定义站点名，例如 `https://riyouhuixiang.netlify.app/`

## 数据说明

当前版本的数据保存在浏览器本地存储里。正式链接固定之后，同一个浏览器访问同一个网址会保留完成记录。

为了防止换浏览器或换网址丢数据，app 内置了「数据保险箱」：

- 功能列表 -> 数据保险箱 -> 导出备份
- 新网址/新浏览器 -> 数据保险箱 -> 导入备份
