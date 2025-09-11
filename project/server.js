import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 2083;
const API_TARGET = 'http://localhost:8888';

app.use('/api', (req, res) => {
    const url = `${API_TARGET}${req.originalUrl}`;
    console.log(`[Proxy Manual] Encaminhando requisição para: ${url}`);

    const proxyReq = http.request(url, {
        method: req.method,
        headers: req.headers,
    }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('[Proxy Manual] Erro ao conectar com a API:', err);
        res.status(502).json({ error: 'Bad Gateway: Falha na comunicação com o serviço da API.' });
    });

    req.pipe(proxyReq, { end: true });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor do Portal (Frontend) rodando em http://localhost:${PORT}`);
});