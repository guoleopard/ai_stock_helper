const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const initSqlJs = require('sql.js');
const DB_PATH = path.join(__dirname, 'history.db');

let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      stock_name TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

initDatabase();

const SYSTEM_PROMPT = `你是一位专业的股票分析师，具有10年以上的A股和港股市场分析经验。你的分析风格专业、客观、数据驱动。

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

app.post('/api/analyze', async (req, res) => {
  const { stockCode, apiKey, apiUrl, model } = req.body;
  
  if (!stockCode || !apiKey || !apiUrl || !model) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  try {
    const stockInfo = parseStockCode(stockCode);
    const userMessage = `请分析股票：${stockInfo.fullCode} (${stockInfo.marketName})`;
    
    const requestData = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
    });
    
    const url = new URL(apiUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const request = httpModule.request(options, (proxyRes) => {
      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        let errorBody = '';
        proxyRes.on('data', chunk => errorBody += chunk);
        proxyRes.on('end', () => {
          res.write(`data: ${JSON.stringify({ error: `API错误: ${proxyRes.statusCode} - ${errorBody}` })}\n\n`);
          res.end();
        });
        return;
      }
      
      proxyRes.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            res.write(`data: ${data}\n\n`);
          }
        }
      });
      
      proxyRes.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
    });
    
    request.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ error: `网络错误: ${error.message}` })}\n\n`);
      res.end();
    });
    
    request.write(requestData);
    request.end();
    
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages, apiKey, apiUrl, model } = req.body;
  
  if (!messages || !apiKey || !apiUrl || !model) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  try {
    const customSystemMsg = messages.find(m => m.role === 'system');
    const systemPrompt = customSystemMsg ? customSystemMsg.content : '';

    const chatMessages = messages.filter(m => m.role !== 'system');
    
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt });
    }
    
    const requestData = JSON.stringify({
      model: model,
      messages: chatMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    });
    
    const url = new URL(apiUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const request = httpModule.request(options, (proxyRes) => {
      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        let errorBody = '';
        proxyRes.on('data', chunk => errorBody += chunk);
        proxyRes.on('end', () => {
          res.write(`data: ${JSON.stringify({ error: `API错误: ${proxyRes.statusCode} - ${errorBody}` })}\n\n`);
          res.end();
        });
        return;
      }
      
      proxyRes.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            res.write(`data: ${data}\n\n`);
          }
        }
      });
      
      proxyRes.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
    });
    
    request.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ error: `网络错误: ${error.message}` })}\n\n`);
      res.end();
    });
    
    request.write(requestData);
    request.end();
    
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

function parseStockCode(code) {
  code = code.toLowerCase().trim();
  
  let market = '';
  let num = code;
  
  if (code.startsWith('hk')) {
    market = '港股';
    num = code.slice(2);
  } else if (code.startsWith('sh')) {
    market = '沪市';
    num = code.slice(2);
  } else if (code.startsWith('sz')) {
    market = '深市';
    num = code.slice(2);
  } else if (code.startsWith('bj')) {
    market = '北交所';
    num = code.slice(2);
  } else if (code.startsWith('6')) {
    market = '沪市';
  } else if (code.startsWith('0') || code.startsWith('3')) {
    market = '深市';
  } else if (code.startsWith('8') || code.startsWith('4')) {
    market = '北交所';
  } else if (code.startsWith('5') || code.startsWith('1')) {
    market = '沪市';
  } else if (numOnly(code).length === 5 && parseInt(numOnly(code)) > 0) {
    market = '港股';
  }
  
  let marketName = market;
  if (!market) {
    const numStr = numOnly(code);
    if (numStr.startsWith('6')) marketName = '沪市';
    else if (numStr.startsWith('0') || numStr.startsWith('3')) marketName = '深市';
    else marketName = '深市';
  }
  
  const finalNum = numOnly(code);
  
  return {
    code: finalNum,
    market: market || (finalNum.startsWith('6') ? 'sh' : finalNum.length === 5 ? 'hk' : 'sz'),
    marketName,
    fullCode: (market || (finalNum.length === 5 ? 'HK' : (finalNum.startsWith('6') ? 'SH' : 'SZ'))) + finalNum
  };

function numOnly(str) {
  return str.replace(/[^0-9]/g, '');
}
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/history', (req, res) => {
  try {
    const results = db.exec('SELECT * FROM analysis_history ORDER BY created_at DESC LIMIT 50');
    if (results.length === 0) {
      return res.json([]);
    }
    
    const columns = results[0].columns;
    const values = results[0].values;
    const history = values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history', (req, res) => {
  const { stockCode, stockName, content } = req.body;
  
  if (!stockCode || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  try {
    db.run(
      'INSERT INTO analysis_history (stock_code, stock_name, content) VALUES (?, ?, ?)',
      [stockCode, stockName || '', content]
    );
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    if (id === 'all') {
      db.run('DELETE FROM analysis_history');
    } else {
      db.run('DELETE FROM analysis_history WHERE id = ?', [id]);
    }
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stock/news', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: '缺少股票代码' });
  }
  
  try {
    const codeLower = code.toLowerCase();
    let num = codeLower.replace(/[^0-9]/g, '');
    let secid = '';
    
    if (codeLower.startsWith('sh') || num.startsWith('6')) {
      secid = `1.${num}`;
    } else if (codeLower.startsWith('sz') || codeLower.startsWith('0') || codeLower.startsWith('3')) {
      secid = `0.${num}`;
    } else if (codeLower.startsWith('hk') || num.length === 5) {
      secid = `11.${num}`;
    } else {
      secid = `0.${num}`;
    }
    
    const newsUrl = `https://news.eastmoney.com/kuaixunlist.html?symbol=${secid}`;
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?fltt=2&secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f59,f60,f116,f117,f162,f167,f168,f169,f170,f171,f173,f177&_=${Date.now()}`;
    
    const response = await fetch(quoteUrl);
    const quoteData = await response.json();
    
    let stockInfo = {};
    if (quoteData.data) {
      const d = quoteData.data;
      stockInfo = {
        code: code.toUpperCase(),
        name: d.f58 || '',
        price: d.f43 / 100 || 0,
        change: (d.f44 - d.f43) / 100 || 0,
        changePercent: d.f45 / 100 || 0,
        volume: d.f47 || 0,
        amount: d.f48 || 0,
        high: d.f170 / 100 || 0,
        low: d.f168 / 100 || 0,
        open: d.f46 / 100 || 0,
        preClose: d.f60 / 100 || 0,
        time: new Date(d.f43 ? (d.f43 > 1e10 ? d.f43 : d.f43 * 1000) : Date.now()).toLocaleString('zh-CN')
      };
    }
    
    res.json({
      success: true,
      stockInfo,
      newsUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI股票分析师 已启动: http://localhost:${PORT}`);
});
