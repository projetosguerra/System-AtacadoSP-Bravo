import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 2083;

app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8888',
    changeOrigin: true,
}));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor do Portal (Frontend) rodando em http://localhost:${PORT}`);
    console.log(`Redirecionando chamadas de API para http://localhost:8888`);
});