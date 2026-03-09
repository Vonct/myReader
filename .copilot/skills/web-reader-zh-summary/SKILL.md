---
name: web-reader-zh-summary
description: 读取网页并输出中文翻译与结构化总结，支持抓取清洗、术语提炼、自动分类、Markdown归档与图片下载替换。用于“阅读网页并中文收录/总结/翻译”场景。当用户提出收录某网页时，使用该技能。
---

# 网页阅读翻译总结助手

## 目标

将用户提供的网页内容转化为高质量中文信息输出，包含：
- 忠实、精确、完整的中文翻译版（逐段对应原文）
- 简明、结构化总结的精读版（保留当前深度解读逻辑）
- 关键术语与要点提炼（术语保留英文）

## 何时调用

在以下场景调用本技能：
- 用户给出网页链接并要求翻译为中文
- 用户要求“读网页并总结”
- 用户希望快速获取某页面的中文要点

## 执行流程

0. 首次使用初始化（可分发 Skill 自举）
   - 本 Skill 作为可发布模板，接收方首次使用时应能自举出同等前端能力
   - 检查 `web/` 是否存在可运行前端；若不存在，自动搭建可发布站点
   - 前提检查：Node.js、npm、文件写入权限、网络可用（安装依赖时）
   - 最小目录要求：
       - `web/public/articles_digest/`（精读版归档）
       - `web/public/articles_translation/`（翻译版归档）
     - `web/public/articles/assets/`（图片资源）
     - `web/src/app/`（页面渲染）
    - 前端必须能直接读取不同版本目录下的 `*.md` 并渲染列表页与详情页 Tab
   - 启动方式统一为：在 `web/` 目录运行 `npm run dev`
   - 发布目标为 `public` 目录可直接托管的静态资源；若需静态导出，生成到 `web/out/`
   - 若受环境限制无法自动搭建，必须返回可执行的手动初始化步骤，不得静默跳过

1. 获取网页内容
   - 默认优先使用 Tavily 抓取正文
     - 单页优先 `extract()`，建议 `extract_depth="advanced"`
     - 页面复杂或跨页主题可使用 `crawl()`，并限制抓取深度与范围
    - 优先使用内置脚本获取正文，脚本会自动处理 Tavily 与降级：
       ```bash
       python .copilot/skills/web-reader-zh-summary/scripts/fetch_article.py "{url}" --query "{optional_focus_query}" --output "tmp/article.json"
       ```
    - 读取脚本输出 JSON 中的 `content`、`title`、`images`、`source`、`fallback_reason` 字段，继续后续翻译、精读、归档流程
   - 若 Tavily 失败（API Key 缺失、配额、网络或返回空结果），立即回退到原有通用网页抓取逻辑
   - 回退后继续沿用现有清洗、翻译、总结、归档与配图流程，不改变下游逻辑
   - 无论是否回退，都需要在文末“抓取说明”明确数据来源与回退原因
   - 若抓取失败，说明失败原因并给出可行替代方案

2. 内容清洗与识别
   - 识别标题、核心段落、列表、结论部分
   - 过滤导航、版权、广告等噪声文本
   - 对明显无关内容做简要忽略说明

3. 中文翻译版
   - 必须覆盖原文全部有效信息，做到完整翻译，不得省略关键段落
   - 保持原意准确，不编造信息，不擅自改写结论
   - 专业术语采用“中文（English）”格式首次出现时标注，后续可保留英文
   - 保留专有名词、产品名、API名、方法名、协议名等英文原词
   - 数字、时间、单位、代码片段保持一致

4. 生成精读版与分类
   - 在翻译版之外，**必须同时生成**当前逻辑下的精读版
   - 精读版输出3-6条核心结论
   - 提炼“这篇内容在讲什么、为何重要、可采取什么行动”
   - 若是技术文档，补充适用场景与限制条件
   - **自动分类**：根据文章内容，自动分配1个主分类（如：AI, Engineering, Product, Research, Design, Culture）和3-5个相关标签（Tags）

4.5 抓取参数与调用约定（新增）
   - Tavily 首选参数：`extract_depth="advanced"`；按需添加 `query` 聚焦目标内容
   - 以“正文完整度优先”配置抓取深度与内容范围
   - 站点级抓取需限制深度与广度，避免噪声页面进入正文
   - 多 URL 任务优先并行编排，先聚合后写入，避免重复片段
   - 保留关键信息：标题、关键数字、限制条件、术语原文

5. 存储为双版本文档
   - 将翻译版与精读版分别整理为独立 Markdown 文件
   - 若原文存在关键配图，抓取并保存到本地资源目录
   - 文件名规则：`YYYY-MM-DD-{slug}.md`（slug为英文标题短横线连接）
   - 图片目录规则：`web/public/articles/assets/{slug}/`
   - **翻译版必须保存到** `web/public/articles_translation/`
   - **精读版必须保存到** `web/public/articles_digest/`
   - 两个版本都**必须**包含Frontmatter元数据：
     ```yaml
     title: "中文标题"
     date: "YYYY-MM-DD"
     category: "分类名"
     tags: ["tag1", "tag2"]
     summary: "一句话总结"
     url: "原文链接"
     original_title: "英文原标题"
     ```
   - 在正文中使用相对路径引用已保存图片，如 `./assets/{slug}/hero.png`
    - 调用`Write`工具分别写入两个版本目录（若目录不存在则创建）

6. 图片下载与链接替换（增强）
    - 在生成 Markdown 文件后，**必须至少对翻译版运行一次**以下脚本来下载图片并修复链接：
     ```bash
       python .trae/skills/web-reader-zh-summary/scripts/download_images.py "web/public/articles_translation/YYYY-MM-DD-{slug}.md" "{source_url}"
     ```
   - 该脚本会自动：
     1. 解析 Markdown 中的图片链接
     2. 将相对链接转换为绝对链接（基于 `source_url`）
     3. 下载图片到 `web/public/articles/assets/{slug}/`
     4. 将 Markdown 中的链接替换为本地路径 `/articles/assets/{slug}/filename` (Next.js public 路径格式)
    5. 若 Markdown 内无图片，自动从源网页发现 `<img>` 并按正文小节就近插入

7. 质量检查
   - 确认翻译与原文关键事实一致
   - 避免遗漏关键前提、限制、风险信息
   - 若页面信息不足，明确说明不确定性
   - 检查“抓取来源标记”是否完整：Tavily / 降级抓取 / 混合抓取

## Tavily 配置

- 推荐在仓库根目录创建 `.env`，填写：
   ```env
   TAVILY_API_KEY=tvly-your-api-key-here
   ```
- 仓库已提供 `.env.example` 模板，可复制为 `.env` 后填入真实 Key
- 若 `TAVILY_API_KEY` 缺失、过期、无权限、配额耗尽或 Tavily 返回空结果，`fetch_article.py` 会自动走当前通用降级抓取逻辑
- 降级时脚本会返回：
   - `source: "fallback"`
   - `fallback_reason: "missing-or-expired-api-key" | "quota-or-rate-limit" | "tavily-request-failed"`
   - `tavily_error: "..."`

## 输出格式

1. 执行文件写入操作（同时保存翻译版与精读版 Markdown）
2. **执行图片下载脚本**
3. 在对话中仅输出：
   - 文章标题与分类
   - 简要总结（3-5点）
   - “已归档至：[翻译版路径] / [精读版路径]”的提示
   - 抓取方式（Tavily 或降级抓取）
   - 完整内容请引导用户查看生成的文件或网页前端
4. 若发生首次初始化，额外输出：
   - “已完成前端初始化，可在 web/ 目录启动”
   - “发布目录：public（静态导出时为 web/out）”
   - 若初始化失败：输出失败原因与手动初始化步骤

## 风格要求

- 语言清晰、专业、简洁
- 翻译优先级高于总结，先保证精确与完整
- 优先信息密度，避免冗长复述
- 对不确定内容明确标注“原文未明确说明”

## 注意事项

- 不得捏造网页中不存在的信息
- 不得以“摘要代替翻译”；用户要求翻译时必须提供完整译文
- 涉及安全、医疗、法律、金融建议时，保留原文语气并提醒用户自行核验
- 如果网页过长，先给“分段摘要 + 重点翻译”，再按用户要求继续展开
- Tavily 失败时必须明确降级，不得伪装为 Tavily 成功抓取结果
