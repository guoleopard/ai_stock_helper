const PLATFORMS = {
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  qwen: {
    name: '阿里千问',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus'
  }
};

let currentPlatform = localStorage.getItem('platform') || 'deepseek';
let savedApiKey = localStorage.getItem('apiKey') || '';
let savedApiUrl = localStorage.getItem('apiUrl') || '';
let savedModel = localStorage.getItem('model') || '';
let abortController = null;
let conversationHistory = [];
let currentStockCode = '';

document.addEventListener('DOMContentLoaded', () => {
  initPlatformBtns();
  initSettingsModal();
  loadSavedConfig();
  initAnalyzeBtn();
  initStockInput();
  initChatInput();
  initClearBtn();
  initHistory();
  initTabs();
  checkUrlParams();
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetPane = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (targetPane) {
        targetPane.classList.add('active');
      }
      
      if (tab === 'chart') {
        if (currentStockCode) {
          loadChart(currentStockCode);
        } else {
          const chartContainer = document.getElementById('chartContainer');
          if (chartContainer) {
            chartContainer.innerHTML = '<div class="info-placeholder">请先分析一只股票</div>';
          }
        }
      }
      if (tab === 'info') {
        if (currentStockCode) {
          loadStockInfo(currentStockCode);
        } else {
          const stockInfoEl = document.getElementById('stockInfo');
          if (stockInfoEl) {
            stockInfoEl.innerHTML = '<div class="info-placeholder">请先分析一只股票</div>';
          }
        }
      }
    });
  });
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const stockCode = params.get('stock');
  
  if (stockCode) {
    document.getElementById('stockCode').value = stockCode;
    
    const apiKey = document.getElementById('apiKey').value.trim();
    if (apiKey) {
      setTimeout(() => {
        analyzeStock();
      }, 500);
    }
  }
}

function initPlatformBtns() {
  const btns = document.querySelectorAll('.platform-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.dataset.platform;
      localStorage.setItem('platform', currentPlatform);
      
      const platform = PLATFORMS[currentPlatform];
      document.getElementById('apiUrl').value = platform.url;
      document.getElementById('model').value = platform.model;
    });
  });
}

const DEFAULT_PROMPT = `你是一位专业的股票分析师，具有10年以上的A股和港股市场分析经验。你的分析风格专业、客观、数据驱动。

请对用户指定的股票进行全面的专业分析，包括：

1. **基本面分析**
   - 公司概况与业务模式
   - 营收与利润情况
   - 估值水平（市盈率、市净率、市盈率TTM等）
   - 盈利能力分析
   - 对于港股，注意分析其ADR对比、汇率影响

2. **技术面分析**
   - 近期股价走势
   - 关键支撑位与阻力位
   - 均线系统分析
   - 成交量分析

3. **行业分析**
   - 所属行业概况
   - 行业地位与竞争优势
   - 行业景气度

4. **风险评估**
   - 经营风险
   - 行业风险
   - 市场风险
   - 对于港股，注意汇率风险和海外市场联动风险

5. **投资建议**
   - 综合评级
   - 目标价位
   - 风险提示

请使用专业的金融术语，给出具体的数据和理由。格式要清晰，使用Markdown格式。`;

let customPrompt = localStorage.getItem('systemPrompt') || DEFAULT_PROMPT;

function initSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const btn = document.getElementById('settingsBtn');
  const close = document.getElementById('modalClose');
  const promptTextarea = document.getElementById('systemPrompt');
  const saveBtn = document.getElementById('savePromptBtn');
  const resetBtn = document.getElementById('resetPromptBtn');
  
  btn.addEventListener('click', () => {
    promptTextarea.value = customPrompt;
    modal.classList.add('show');
  });
  
  close.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });
  
  saveBtn.addEventListener('click', () => {
    customPrompt = promptTextarea.value.trim();
    localStorage.setItem('systemPrompt', customPrompt);
    modal.classList.remove('show');
  });
  
  resetBtn.addEventListener('click', () => {
    promptTextarea.value = DEFAULT_PROMPT;
  });
}

function loadSavedConfig() {
  const platform = PLATFORMS[currentPlatform];
  document.getElementById('apiKey').value = savedApiKey;
  document.getElementById('apiUrl').value = savedApiUrl || platform.url;
  document.getElementById('model').value = savedModel || platform.model;
  
  const btns = document.querySelectorAll('.platform-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platform === currentPlatform);
  });
}

function initStockInput() {
  const input = document.getElementById('stockCode');
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      analyzeStock();
    }
  });
}

function initAnalyzeBtn() {
  const btn = document.getElementById('analyzeBtn');
  btn.addEventListener('click', analyzeStock);
}

function initChatInput() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  sendBtn.addEventListener('click', sendChatMessage);
}

function initClearBtn() {
  const btn = document.getElementById('clearBtn');
  btn.addEventListener('click', newSession);
}

function initHistory() {
  loadHistory();
  
  document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      try {
        const response = await fetch('/api/history/all', { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
          loadHistory();
        }
      } catch (error) {
        console.error('清空历史失败:', error);
      }
    }
  });
}

async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const history = await response.json();
    renderHistory(history);
  } catch (error) {
    console.error('加载历史失败:', error);
  }
}

function renderHistory(history) {
  const container = document.getElementById('historyList');
  
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    return;
  }
  
  container.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}" data-code="${item.stock_code}">
      <span class="history-delete" data-id="${item.id}">×</span>
      <div class="history-code">${item.stock_code}</div>
      <div class="history-time">${formatTime(item.created_at)}</div>
    </div>
  `).join('');
  
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-delete')) return;
      const code = item.dataset.code;
      document.getElementById('stockCode').value = code;
      loadHistoryItem(item.dataset.id);
    });
  });
  
  container.querySelectorAll('.history-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteHistory(btn.dataset.id);
    });
  });
}

async function deleteHistory(id) {
  try {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    loadHistory();
  } catch (error) {
    console.error('删除历史失败:', error);
  }
}

async function loadHistoryItem(id) {
  try {
    const response = await fetch('/api/history');
    const history = await response.json();
    const item = history.find(h => h.id == id);
    
    if (item) {
      currentStockCode = item.stock_code;
      conversationHistory = [];
      
      const outputHeader = document.getElementById('outputHeader');
      const displayStockCode = document.getElementById('displayStockCode');
      const statusBadge = document.getElementById('statusBadge');
      const chatMessages = document.getElementById('chatMessages');
      const chatInputArea = document.getElementById('chatInputArea');
      const welcomeMessage = document.getElementById('welcomeMessage');
      
      outputHeader.style.display = 'flex';
      displayStockCode.textContent = currentStockCode;
      statusBadge.classList.add('done');
      statusBadge.innerHTML = '<span class="status-dot"></span>历史记录';
      
      if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
      }
      
      chatMessages.innerHTML = '<div class="chat-message ai"><div class="message-bubble analysis" id="analysisContent"></div></div>';
      const contentEl = document.getElementById('analysisContent');
      chatInputArea.style.display = 'block';
      
      renderMarkdown(item.content, contentEl);
      
      conversationHistory.push({ role: 'system', content: customPrompt });
      loadChart(currentStockCode);
      loadStockInfo(currentStockCode);
      conversationHistory.push({ role: 'assistant', content: item.content });
    }
  } catch (error) {
    console.error('加载历史详情失败:', error);
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function newSession() {
  conversationHistory = [];
  currentStockCode = '';
  
  const outputHeader = document.getElementById('outputHeader');
  const chatMessages = document.getElementById('chatMessages');
  const chatInputArea = document.getElementById('chatInputArea');
  const welcomeMessage = document.getElementById('welcomeMessage');
  
  outputHeader.style.display = 'none';
  chatInputArea.style.display = 'none';
  
  chatMessages.innerHTML = '';
  chatMessages.appendChild(welcomeMessage);
  welcomeMessage.style.display = 'flex';
}

function loadChart(stockCode) {
  const chartContainer = document.getElementById('chartContainer');
  if (!chartContainer) return;
  
  const code = stockCode.toLowerCase();
  let url = '';
  
  if (code.startsWith('sh')) {
    const num = code.replace('sh', '');
    url = `https://quote.eastmoney.com/sh${num}.html`;
  } else if (code.startsWith('sz')) {
    const num = code.replace('sz', '');
    url = `https://quote.eastmoney.com/sz${num}.html`;
  } else if (code.startsWith('hk')) {
    const num = code.replace('hk', '');
    url = `https://quote.eastmoney.com/hk${num}.html`;
  } else if (code.startsWith('bj')) {
    const num = code.replace('bj', '');
    url = `https://quote.eastmoney.com/bj${num}.html`;
  } else {
    const numOnly = code.replace(/[^0-9]/g, '');
    if (numOnly.length === 5) {
      url = `https://quote.eastmoney.com/hk${numOnly}.html`;
    } else if (numOnly.startsWith('6')) {
      url = `https://quote.eastmoney.com/sh${numOnly}.html`;
    } else {
      url = `https://quote.eastmoney.com/sz${numOnly}.html`;
    }
  }
  
  chartContainer.innerHTML = `<iframe id="chartFrame" src="${url}" frameborder="0" width="100%" height="100%" style="border:none;"></iframe>`;
}

async function loadStockInfo(stockCode) {
  const stockInfoEl = document.getElementById('stockInfo');
  stockInfoEl.innerHTML = '<div class="loading-spinner">加载中</div>';
  
  const code = stockCode.toLowerCase();
  const numOnly = code.replace(/[^0-9]/g, '');
  let secid = '';
  
  if (code.startsWith('sh') || (!code.startsWith('sz') && !code.startsWith('hk') && numOnly.startsWith('6'))) {
    secid = `1.${numOnly}`;
  } else if (code.startsWith('sz') || code.startsWith('0') || code.startsWith('3')) {
    secid = `0.${numOnly}`;
  } else if (code.startsWith('hk') || numOnly.length === 5) {
    secid = `116.${numOnly}`;
  } else {
    secid = `0.${numOnly}`;
  }
  
  try {
    const url = `https://push2.eastmoney.com/api/qt/stock/get?fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f59,f60,f116,f117,f162,f167,f168,f169,f170,f171,f173,f177,f187,f188,f189,f190,f191,f192,f193,f194,f195,f196,f197,f198,f199&secid=${secid}&_=${Date.now()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data) {
      renderStockInfo(data.data, code);
    } else {
      stockInfoEl.innerHTML = '<div class="info-placeholder">无法获取股票信息</div>';
    }
  } catch (error) {
    console.error('获取股票信息失败:', error);
    stockInfoEl.innerHTML = '<div class="info-placeholder">获取股票信息失败</div>';
  }
}

function renderStockInfo(data, code) {
  const stockInfoEl = document.getElementById('stockInfo');
  
  const price = (parseFloat(data.f43) || 0) / 100;
  const preClose = (parseFloat(data.f60) || 0) / 100;
  const open = (parseFloat(data.f46) || 0) / 100;
  const high = (parseFloat(data.f170) || 0) / 100;
  const low = (parseFloat(data.f168) || 0) / 100;
  const volume = parseInt(data.f47) || 0;
  const amount = (parseFloat(data.f48) || 0) / 10000;
  const change = price - preClose;
  const changePercent = preClose > 0 ? (change / preClose) * 100 : 0;
  
  const isUp = change >= 0;
  const changeClass = isUp ? 'up' : 'down';
  const changeSign = isUp ? '+' : '';
  
  const volumeStr = volume >= 100000000 ? (volume / 100000000).toFixed(2) + '亿' : (volume / 10000).toFixed(2) + '万';
  const amountStr = amount >= 10000 ? (amount / 10000).toFixed(2) + '万亿' : amount.toFixed(2) + '亿';
  
  const turnover = (parseFloat(data.f168) || 0) / 100;
  
  stockInfoEl.innerHTML = `
    <div class="stock-info-header">
      <div>
        <div class="stock-info-code">${code.toUpperCase()}</div>
        <div class="stock-info-name">${data.f58 || code.toUpperCase()}</div>
      </div>
    </div>
    <div class="stock-info-price">${price.toFixed(2)}</div>
    <div class="stock-info-change ${changeClass}">
      ${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)
    </div>
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">今开</div>
        <div class="info-value">${open.toFixed(2)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">最高</div>
        <div class="info-value">${high.toFixed(2)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">最低</div>
        <div class="info-value">${low.toFixed(2)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">成交量</div>
        <div class="info-value">${volumeStr}</div>
      </div>
      <div class="info-card">
        <div class="info-label">成交额</div>
        <div class="info-value">${amountStr}</div>
      </div>
      <div class="info-card">
        <div class="info-label">昨收</div>
        <div class="info-value">${(price - change).toFixed(2)}</div>
      </div>
    </div>
  `;
}

async function analyzeStock() {
  const stockCode = document.getElementById('stockCode').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const model = document.getElementById('model').value.trim();
  const exchange = document.getElementById('exchange').value;
  
  if (!stockCode) {
    showError('请输入股票代码');
    return;
  }
  
  if (!apiKey) {
    showError('请输入API Key');
    return;
  }
  
  localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('apiUrl', apiUrl);
  localStorage.setItem('model', model);
  
  currentStockCode = normalizeStockCode(stockCode, exchange);
  conversationHistory = [];
  
  const outputHeader = document.getElementById('outputHeader');
  const displayStockCode = document.getElementById('displayStockCode');
  const statusBadge = document.getElementById('statusBadge');
  const chatMessages = document.getElementById('chatMessages');
  const chatInputArea = document.getElementById('chatInputArea');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const btn = document.getElementById('analyzeBtn');
  
  outputHeader.style.display = 'flex';
  displayStockCode.textContent = currentStockCode;
  statusBadge.classList.remove('done');
  statusBadge.innerHTML = '<span class="status-dot"></span>分析中';
  
  if (welcomeMessage) {
    welcomeMessage.style.display = 'none';
  }
  
  chatMessages.innerHTML = '<div class="chat-message ai"><div class="message-bubble analysis" id="analysisContent"></div></div>';
  const contentEl = document.getElementById('analysisContent');
  chatInputArea.style.display = 'block';
  
  btn.disabled = true;
  btn.classList.add('loading');
  
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  
  let stockInfoText = '';
  try {
    const codeLower = currentStockCode.toLowerCase();
    const numOnly = codeLower.replace(/[^0-9]/g, '');
    let secid = '';
    
    if (codeLower.startsWith('sh') || (!codeLower.startsWith('sz') && !codeLower.startsWith('hk') && numOnly.startsWith('6'))) {
      secid = `1.${numOnly}`;
    } else if (codeLower.startsWith('sz') || codeLower.startsWith('0') || codeLower.startsWith('3')) {
      secid = `0.${numOnly}`;
    } else if (codeLower.startsWith('hk') || numOnly.length === 5) {
      secid = `116.${numOnly}`;
    } else {
      secid = `0.${numOnly}`;
    }
    
    const url = `https://push2.eastmoney.com/api/qt/stock/get?fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f59,f60,f116,f117,f162,f167,f168,f169,f170,f171,f173,f177,f187,f188,f189,f190,f191,f192,f193,f194,f195,f196,f197,f198,f199&secid=${secid}&_=${Date.now()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data) {
      const d = data.data;
      const price = (parseFloat(d.f43) || 0) / 100;
      const preClose = (parseFloat(d.f60) || 0) / 100;
      const open = (parseFloat(d.f46) || 0) / 100;
      const high = (parseFloat(d.f170) || 0) / 100;
      const low = (parseFloat(d.f168) || 0) / 100;
      const volume = parseInt(d.f47) || 0;
      const amount = (parseFloat(d.f48) || 0) / 10000;
      const change = price - preClose;
      const changePercent = preClose > 0 ? (change / preClose) * 100 : 0;
      const amountStr = amount >= 10000 ? (amount / 10000).toFixed(2) + '万亿' : amount.toFixed(2) + '亿';
      const volumeStr = volume >= 100000000 ? (volume / 100000000).toFixed(2) + '亿' : (volume / 10000).toFixed(2) + '万';
      const amount2 = (parseFloat(d.f48) || 0);
      const turnover = (parseFloat(d.f168) || 0) / 100;
      
      stockInfoText = `\n\n【实时行情信息 - 2026年最新数据】\n股票代码: ${currentStockCode.toUpperCase()}\n股票名称: ${d.f58 || ''}\n当前价格: ${price.toFixed(2)}元\n涨跌额: ${change >= 0 ? '+' : ''}${change.toFixed(2)}元\n涨跌幅: ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%\n今开: ${open.toFixed(2)}元\n最高: ${high.toFixed(2)}元\n最低: ${low.toFixed(2)}元\n成交量: ${volumeStr}手\n成交额: ${amountStr}\n昨收: ${preClose.toFixed(2)}元\n换手率: ${turnover.toFixed(2)}%\n总市值: ${((parseFloat(d.f116) || 0) / 100000000).toFixed(2)}亿\n流通市值: ${((parseFloat(d.f117) || 0) / 100000000).toFixed(2)}亿\n数据时间: ${new Date().toLocaleString('zh-CN')}`;
    }
  } catch (e) {
    console.error('获取股票信息失败:', e);
  }
  
  const enhancedPrompt = customPrompt + `\n\n【重要提示】\n1. 当前日期是2026年2月26日，请务必使用最新数据进行计算和分析\n2. 你可以使用联网搜索功能获取最新的股票新闻、公告、财务数据等信息\n3. 所有分析必须基于最新的实时行情数据，不得使用过期数据` + stockInfoText;
  
  conversationHistory.push({
    role: 'system',
    content: enhancedPrompt
  });
  
  conversationHistory.push({
    role: 'user',
    content: `请分析股票：${currentStockCode}，${getMarketName(currentStockCode)}。请结合实时行情数据进行专业分析。`
  });
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        apiKey,
        apiUrl,
        model
      }),
      signal: abortController.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            finishAnalysis(fullText);
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices?.[0]?.delta?.content || '';
            if (text) {
              fullText += text;
              renderMarkdown(fullText, contentEl);
            }
          } catch (e) {}
        }
      }
    }
    
    finishAnalysis(fullText);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    showError(error.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
  
  function finishAnalysis(analysisText) {
    statusBadge.classList.add('done');
    statusBadge.innerHTML = '<span class="status-dot"></span>分析完成';
    
    conversationHistory.push({
      role: 'assistant',
      content: analysisText
    });
    
    saveHistory(currentStockCode, analysisText);
    loadChart(currentStockCode);
    loadStockInfo(currentStockCode);
  }
}

async function saveHistory(stockCode, content) {
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockCode,
        content
      })
    });
    loadHistory();
  } catch (error) {
    console.error('保存历史失败:', error);
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const model = document.getElementById('model').value.trim();
  const chatInputArea = document.getElementById('chatInputArea');
  const sendBtn = document.getElementById('chatSendBtn');
  
  if (!message) return;
  if (!currentStockCode) {
    showError('请先分析一只股票');
    return;
  }
  if (!apiKey) {
    showError('请输入API Key');
    return;
  }
  
  const chatMessages = document.getElementById('chatMessages');
  
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'chat-message user';
  userMessageDiv.innerHTML = `<div class="message-bubble">${escapeHtml(message)}</div>`;
  chatMessages.appendChild(userMessageDiv);
  
  input.value = '';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message ai';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="chat-typing">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
      AI思考中...
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  sendBtn.disabled = true;
  
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();
  
  conversationHistory.push({
    role: 'user',
    content: message
  });
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        apiKey,
        apiUrl,
        model
      }),
      signal: abortController.signal
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '请求失败');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    
    typingDiv.remove();
    
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'chat-message ai';
    aiMessageDiv.innerHTML = '<div class="message-bubble" id="aiResponse"></div>';
    chatMessages.appendChild(aiMessageDiv);
    const aiContent = aiMessageDiv.querySelector('.message-bubble');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            conversationHistory.push({
              role: 'assistant',
              content: fullText
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
            sendBtn.disabled = false;
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices?.[0]?.delta?.content || '';
            if (text) {
              fullText += text;
              renderMarkdown(fullText, aiContent);
            }
          } catch (e) {}
        }
      }
    }
    
    conversationHistory.push({
      role: 'assistant',
      content: fullText
    });
    
  } catch (error) {
    typingDiv.remove();
    if (error.name === 'AbortError') {
      return;
    }
    showError(error.message);
  } finally {
    sendBtn.disabled = false;
  }
}

function normalizeStockCode(code, exchange) {
  code = code.toLowerCase().trim();
  
  if (exchange === 'hk') {
    const num = code.replace(/[^0-9]/g, '');
    return `hk${num || code}`;
  }
  
  if (exchange !== 'auto') {
    const num = code.replace(/[^0-9]/g, '');
    return `${exchange}${num}`;
  }
  
  const numOnly = code.replace(/[^0-9]/g, '');
  
  if (code.startsWith('hk') || (numOnly.length === 5 && !isNaN(numOnly) && parseInt(numOnly) >= 1)) {
    return `hk${numOnly}`;
  }
  
  if (numOnly.startsWith('6')) return `sh${numOnly}`;
  if (numOnly.startsWith('0') || numOnly.startsWith('3')) return `sz${numOnly}`;
  if (numOnly.startsWith('8') || numOnly.startsWith('4')) return `bj${numOnly}`;
  if (numOnly.startsWith('5') || numOnly.startsWith('1')) return `sh${numOnly}`;
  
  return `sz${numOnly}`;
}

function getMarketName(code) {
  code = code.toLowerCase();
  if (code.startsWith('sh')) return '沪市A股';
  if (code.startsWith('sz')) return '深市A股';
  if (code.startsWith('bj')) return '北交所';
  if (code.startsWith('hk')) return '港股';
  
  const numOnly = code.replace(/[^0-9]/g, '');
  if (numOnly.length === 5) return '港股';
  if (numOnly.startsWith('6')) return '沪市A股';
  if (numOnly.startsWith('0') || numOnly.startsWith('3')) return '深市A股';
  if (numOnly.startsWith('8') || numOnly.startsWith('4')) return '北交所';
  
  return 'A股';
}

function renderMarkdown(text, element) {
  let html = escapeHtml(text);
  
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[123]>)/g, '$1');
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  
  element.innerHTML = html;
  
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = `
    <div class="error-message">
      <h4>⚠️ 错误</h4>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
