# 棕榈岛（Palm Island）· 手机网页版

全中文、手机竖屏、可离线游玩的《棕榈岛》单人网页版（PWA）。

- 完整单人规则：储存 / 旋转 / 翻面 / 弃牌、资源支付、4 张上限、资源过期、8 轮结算
- 天赋卡（Feat）系统：结算解锁、永久保存、难度预设、局内启用
- 纯前端静态站，无需服务器

## 本地运行

```bash
cd app
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080`。

## 上线托管

`app/` 是完整静态站点，可直接部署到任意静态托管：

### GitHub Pages（推荐）

```bash
cd app
git init
git add .
git commit -m "棕榈岛网页版"
git branch -M main
git remote add origin git@github.com:<你的用户名>/<仓库名>.git
git push -u origin main
```

仓库设置 → Pages → 分支 `main` / 根目录 → 保存，即可访问
`https://<你的用户名>.github.io/<仓库名>/`。

### Vercel

```bash
npm i -g vercel
cd app && vercel --prod
```

### Netlify

```bash
npm i -g netlify-cli
cd app && netlify deploy --prod --dir=.
```

## 数据说明

卡牌与天赋的具体数值为初稿（`verified: false`），数据文件：

- `app/js/data/cards.js`
- `app/js/data/feats.js`

拿到官方数值后只需修改上述文件。
