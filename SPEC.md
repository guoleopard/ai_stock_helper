# AI Stock Analyst - 规格文档

## 1. 项目概述

- **项目名称**: AI股票分析师 (AI Stock Analyst)
- **项目类型**: Web应用 (前端+后端)
- **核心功能**: 输入股票代码，调用AI分析股票信息并以流式输出专业分析报告
- **目标用户**: 散户投资者、股票爱好者

## 2. 技术栈

- **前端**: 原生HTML + CSS + JavaScript (单页应用)
- **后端**: Node.js + Express
- **AI API**: DeepSeek API / 阿里千问(Qwen) API
- **流式输出**: Server-Sent Events (SSE)

## 3. UI/UX 规格

### 3.1 整体布局

- 单页面应用，深色金融主题
- 顶部标题栏
- 主体分两栏：左侧配置面板，右侧分析输出

### 3.2 色彩方案

- **背景色**: #0a0e17 (深蓝黑)
- **卡片背景**: #131a2a
- **主色调**: #00d4aa (科技青)
- **次要色**: #3b82f6 (蓝)
- **警告色**: #f59e0b (橙)
- **文字主色**: #e2e8f0
- **文字次色**: #94a3b8

### 3.3 字体

- **标题**: "Noto Sans SC", sans-serif
- **正文**: "Noto Sans SC", sans-serif
- **代码/数字**: "JetBrains Mono", monospace

### 3.4 组件设计

#### 顶部标题栏
- 高度: 60px
- 左侧: 应用Logo + 标题 "AI股票分析师"
- 右侧: 设置按钮 (齿轮图标)

#### 左侧配置面板 (宽度: 320px)
- **API配置区域**
  - 选择AI平台 (DeepSeek / 阿里千问)
  - API Key 输入框 (密码类型)
  - API URL 输入框 (可自定义)
- **股票输入区域**
  - 股票代码输入框 (支持沪深A股: 000001, 600000 等)
  - 交易所选择 (沪市/深市/北交所)
- **分析按钮**
  - 完整宽度，渐变背景 (#00d4aa -> #00b894)
  - 悬停状态: 亮度提升

#### 右侧分析输出区
- **标题区**: 显示当前分析的股票代码
- **内容区**: 
  - 流式输出的分析文本
  - 打字机效果
  - Markdown渲染支持
  - 代码块使用暗色主题
- **状态指示**
  - 分析中: 脉冲动画的光标
  - 完成: "分析完成" 标签

### 3.5 动画效果

- 按钮悬停: transform scale(1.02), 0.2s ease
- 卡片: box-shadow 0 4px 20px rgba(0, 212, 170, 0.1)
- 流式输出光标: 闪烁动画
- 加载状态: 旋转动画

## 4. 功能规格

### 4.1 API配置

- 支持两个AI平台切换:
  - **DeepSeek**: 默认URL https://api.deepseek.com/v1/chat/completions
  - **阿里千问**: 默认URL https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
- 用户可自定义API URL
- API Key本地存储(localStorage)
- 配置持久化

### 4.2 股票代码输入

- 支持格式:
  - 纯数字: 000001, 600000, 300750
  - 带前缀: sh000001, sz000001
- 自动识别交易所:
  - 6开头: 沪市
  - 0/3开头: 深市
  - 8/4开头: 北交所

### 4.3 AI分析提示词

作为专业股票分析师，分析内容包括:
1. **基本面分析**: 市值、估值、盈利能力
2. **技术面分析**: 趋势、支撑阻力位
3. **行业分析**: 所处行业地位、竞争格局
4. **风险评估**: 潜在风险因素
5. **投资建议**: 买入/持有/卖出建议

### 4.4 流式输出

- 使用SSE实现实时流式输出
- 每收到一个chunk立即显示
- 支持中断分析
- 打字机效果 (每字符间隔10ms)

### 4.5 错误处理

- API Key为空: 提示配置API Key
- 网络错误: 显示错误信息并可重试
- API返回错误: 显示具体错误原因

## 5. API接口

### 5.1 后端接口

```
POST /api/analyze
Content-Type: application/json

{
  "stockCode": "000001",
  "apiKey": "sk-xxx",
  "apiUrl": "https://api.deepseek.com/v1/chat/completions",
  "model": "deepseek-chat"
}

响应: SSE流式输出
```

### 5.2 前端请求

```javascript
fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
})
```

## 6. 文件结构

```
ai_stock_helper/
├── SPEC.md
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
```

## 7. 验收标准

- [ ] 页面正常加载，深色主题显示正确
- [ ] 可以输入股票代码并提交分析
- [ ] API配置可以切换平台并保存
- [ ] 流式输出正常工作，有打字机效果
- [ ] Markdown内容正确渲染
- [ ] 错误情况有友好提示
- [ ] DeepSeek和千问API都能正常工作
