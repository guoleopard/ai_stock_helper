# AI 股票分析师

📊 基于 AI 大模型的专业股票分析工具，支持 A 股和港股分析。

![GitHub](https://img.shields.io/badge/Node.js-%3E%3D14-blue)
![GitHub](https://img.shields.io/badge/Express-4.18-green)
![GitHub](https://img.shields.io/badge/AI-DeepSeek%2FQwen-orange)

## ✨ 功能特性

- 🤖 **AI 智能分析** - 接入 DeepSeek / 阿里千问大模型，生成专业股票分析报告
- 📈 **实时行情** - 集成东方财富 API，获取最新股价、成交量等数据
- 📊 **K 线图表** - 内嵌东方财富图表，查看技术面走势
- 💬 **多轮对话** - 支持追问功能，深入探讨股票细节
- 📝 **历史记录** - SQLite 本地持久化，随时回顾分析记录
- ⭐ **自选管理** - 添加/删除自选股票，快速切换分析
- 🌐 **多市场支持** - 沪市、深市、北交所、港股
- ⚡ **流式输出** - SSE 实时打字机效果，分析过程立即可见

## 🏗️ 技术架构

| 层级 | 技术栈 |
|------|--------|
| **前端** | HTML5 + CSS3 + Vanilla JavaScript |
| **后端** | Node.js + Express |
| **数据库** | SQLite (sql.js) |
| **AI 接口** | DeepSeek / 阿里千问 (OpenAI 兼容格式) |
| **通信** | Server-Sent Events (SSE) 流式输出 |

## 🚀 快速开始

### 环境要求

- Node.js >= 14.x
- npm >= 6.x

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/guoleopard/ai_stock_helper.git
cd ai_stock_helper

# 安装依赖
npm install

# 启动服务
npm start

# 访问应用
# http://localhost:3000
```

### 开发模式

```bash
npm run dev
```

## ⚙️ 配置说明

### API 配置

首次使用需要配置 AI API：

1. 点击页面右上角 **设置** 按钮
2. 选择 AI 平台（DeepSeek 或 阿里千问）
3. 输入 API Key
4. 确认 API URL 和模型名称

| 平台 | 默认 URL | 模型 |
|------|----------|------|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` |
| 阿里千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` |

### 股票代码格式

| 市场 | 格式示例 |
|------|----------|
| 沪市 A 股 | `600000` 或 `sh600000` |
| 深市 A 股 | `000001` 或 `sz000001` |
| 北交所 | `bj8xxxx` |
| 港股 | `hk00700` 或 `00700` |

## 📁 项目结构

```
ai_stock_helper/
├── README.md              # 项目说明文档
├── SPEC.md                # 详细规格文档
├── package.json           # 项目配置
├── server.js              # 后端服务器
├── public/
│   ├── index.html         # 主页面
│   ├── app.js             # 前端逻辑
│   └── styles.css         # 样式文件
└── history.db             # SQLite 数据库 (运行时生成)
```

## 🔌 API 接口

### 股票分析

```http
POST /api/analyze
Content-Type: application/json

{
  "stockCode": "000001",
  "apiKey": "sk-xxx",
  "apiUrl": "https://api.deepseek.com/v1/chat/completions",
  "model": "deepseek-chat"
}

# 响应：SSE 流式输出
```

### 自选股管理

```http
GET    /api/stocks          # 获取自选股列表
POST   /api/stocks          # 添加股票
DELETE /api/stocks/:code    # 删除股票
```

### 历史记录

```http
GET    /api/history         # 获取分析历史
POST   /api/history         # 保存分析记录
DELETE /api/history/:id     # 删除单条记录
DELETE /api/history/all     # 清空所有记录
```

### 实时行情

```http
GET /api/stock/news?code=sh600000

# 响应:
{
  "success": true,
  "stockInfo": {
    "code": "SH600000",
    "name": "浦发银行",
    "price": 8.52,
    "change": 0.15,
    "changePercent": 1.79,
    ...
  }
}
```

## 📸 界面预览

### 深色金融主题
- 背景色：`#0a0e17`
- 主色调：`#00d4aa` (科技青)
- 卡片背景：`#131a2a`

### 三栏布局
- **左侧**: 自选股票 + 历史记录
- **中间**: API 配置 + 股票查询
- **右侧**: AI 分析 / K 线图 / 实时行情 (Tab 切换)

## 🔒 安全说明

- API Key 仅保存在本地浏览器 (localStorage)，不会上传到服务器
- 生产环境建议配置更严格的 CORS 策略
- 建议使用后端代理转发 API 请求，避免暴露 API Key

## 🛠️ 开发计划

- [ ] 导出分析报告 (PDF/Markdown)
- [ ] 股票对比功能
- [ ] 技术指标分析 (MACD, KDJ, RSI)
- [ ] 财报数据可视化
- [ ] 多语言支持

## 📄 许可证

MIT License

## 🤝 贡献

<img src="https://github.com/user-attachments/assets/39dc3512-f7da-44d7-92e7-8e3009e78351" style="width:200px; height:auto;">

<img src="https://github.com/user-attachments/assets/aa895f4a-690c-409b-b519-f47676f1007d" style="width:200px; height:auto;">


欢迎提交 Issue 和 Pull Request！

## 📬 联系方式

- GitHub: [@guoleopard](https://github.com/guoleopard)
- 项目地址: https://github.com/guoleopard/ai_stock_helper

---

**⚠️ 免责声明**: 本工具生成的内容仅供参考，不构成投资建议。股市有风险，投资需谨慎。
