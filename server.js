
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
// Porta 3002 conforme solicitado para rodar no VPS
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Caminho da build do Vite
const distPath = path.join(__dirname, 'dist');

// SERVE STATIC FILES (React Build) obrigatoriamente sob o prefixo /corte
// Isso garante que gestaokavins.com.br/corte/assets/file.js seja encontrado em dist/assets/file.js
app.use('/corte', express.static(distPath));

// Configuração do Banco de Dados MariaDB/MySQL local
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Benvindo199380@',
    database: process.env.DB_NAME || 'corte',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Auxiliar para camelCase
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

// --- API ROUTES (Prefixo /corte/api) ---
const router = express.Router();

// Produtos
router.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        res.json(rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : r.default_colors
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Pedidos (Orders)
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

// Costureiras
router.get('/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tecidos
router.get('/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Aplica o roteador de API
app.use('/corte/api', router);

// FALLBACK PARA SPA
// Qualquer rota que comece com /corte/ e não seja estática ou API, devolve o index.html
app.get('/corte/*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Redirecionamento amigável da raiz (apenas local)
app.get('/', (req, res) => {
    res.redirect('/corte/');
});

app.listen(PORT, () => {
    console.log(`🚀 Projeto Corte rodando na porta ${PORT}`);
    console.log(`🔗 API disponível em: /corte/api`);
    console.log(`📂 Frontend servido em: /corte/`);
});
