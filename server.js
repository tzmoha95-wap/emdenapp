const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const saveDir = rootDir;

function getLocalIPs() {
  const nic = os.networkInterfaces();
  const addresses = [];

  Object.values(nic).forEach((list) => {
    if (!list) return;
    list.forEach((item) => {
      if (item.family === 'IPv4' && !item.internal) {
        addresses.push(item.address);
      }
    });
  });

  return addresses;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sanitizeFilename(value) {
  return value
    .replace(/[^\w\-\u0600-\u06FF\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'record';
}

function sendStaticFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('الملف غير موجود');
      return;
    }

    const type = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function handleSave(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { name, code } = JSON.parse(body);

      if (!name || !code) {
        sendJson(res, { error: 'الاسم والكود مطلوبان.' }, 400);
        return;
      }

      const safeName = sanitizeFilename(name);
      const filename = `${Date.now()}-${safeName}.json`;
      const filePath = path.join(saveDir, filename);
      const content = {
        name,
        code,
        createdAt: new Date().toISOString(),
      };

      fs.writeFile(filePath, JSON.stringify(content, null, 2), (err) => {
        if (err) {
          sendJson(res, { error: 'فشل حفظ الملف.' }, 500);
          return;
        }

        sendJson(res, { message: `تم الحفظ في: ${filename}` });
      });
    } catch (error) {
      sendJson(res, { error: 'بيانات غير صحيحة.' }, 400);
    }
  });
}

function handleFind(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { code } = JSON.parse(body);
      const query = String(code || '').trim();

      if (!query) {
        sendJson(res, { error: 'الكود مطلوب للبحث.' }, 400);
        return;
      }

      fs.readdir(saveDir, (err, files) => {
        if (err) {
          sendJson(res, { error: 'فشل الوصول إلى البيانات.' }, 500);
          return;
        }

        const jsonFiles = files.filter((file) => path.extname(file).toLowerCase() === '.json');
        let found = null;

        for (const file of jsonFiles) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(saveDir, file), 'utf-8'));
            if (String(data.code || '').trim() === query) {
              found = data;
              break;
            }
          } catch (parseError) {
            continue;
          }
        }

        if (found) {
          sendJson(res, { name: found.name, code: found.code, createdAt: found.createdAt });
        } else {
          sendJson(res, { error: 'لم يتم العثور على أي اسم لهذا الكود.' }, 404);
        }
      });
    } catch (error) {
      sendJson(res, { error: 'بيانات غير صحيحة.' }, 400);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const safePath = path.normalize(path.join(rootDir, pathname));

  if (req.method === 'POST' && parsed.pathname === '/save') {
    handleSave(req, res);
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/find') {
    handleFind(req, res);
    return;
  }

  if (!safePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('غير مسموح');
    return;
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    sendStaticFile(res, safePath);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('الصفحة غير موجودة');
});

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log(`Server is running on http://localhost:${PORT}`);
  if (localIPs.length) {
    localIPs.forEach((ip) => {
      console.log(`يمكنك الدخول من الجهاز الآخر على: http://${ip}:${PORT}`);
    });
  } else {
    console.log('لم يتم اكتشاف عنوان IP محلي؛ تأكد من أنك متصل بشبكة Wi-Fi.');
  }
  console.log(`حفظ الملفات سيتم في مجلد المشروع: ${saveDir}`);
});
