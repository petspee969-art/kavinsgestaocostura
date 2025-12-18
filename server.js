
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Caminho absoluto para a pasta dist (frontend buildado)
// Se o server.js estiver na raiz do projeto 'corte', e a pasta dist estiver lá:
const distPath = path.resolve(__dirname, 'dist');

// Configuração do Banco de Dados
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Benvindo199380@',
    database: process.env.DB_NAME || 'corte',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const toCamel = (o) => {
    if (!o || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(toCamel);
    const n = {};
    Object.keys(o).forEach(k => {
        const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        n[camel] = o[k];
    });
    return n;
};

// API ROUTES - Devem vir ANTES do express.static para não serem confundidas com arquivos
const router = express.Router();

router.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        res.json(rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : r.default_colors
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows.map(r => {
            const camel = toCamel(r);
            camel.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items;
            camel.activeCuttingItems = typeof r.active_cutting_items === 'string' ? JSON.parse(r.active_cutting_items) : r.active_cutting_items;
            camel.splits = typeof r.splits === 'string' ? JSON.parse(r.splits) : r.splits;
            return camel;
        }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Registrar rotas da API sob /corte/api
app.use('/corte/api', router);

// Servir arquivos estáticos do frontend buildado
app.use('/corte', express.static(distPath));

// Redirecionamento da raiz (apenas se acessar direto a porta 3002)
app.get('/', (req, res) => {
    res.redirect('/corte/');
});

// Fallback para SPA (React Router) - Deve ser a última rota
app.get('/corte/*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Corte Ativo na porta ${PORT}`);
    console.log(`📁 Servindo arquivos de: ${distPath}`);
});
