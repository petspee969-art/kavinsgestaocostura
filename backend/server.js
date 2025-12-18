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
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Servindo arquivos estáticos da pasta dist na raiz do projeto
app.use(express.static(path.join(__dirname, '..', 'dist')));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kavins_db',
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

app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        const products = rows.map(r => ({ ...toCamel(r), defaultColors: JSON.parse(r.default_colors) }));
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    try {
        const { id, code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, defaultColors } = req.body;
        const sql = `INSERT INTO products (id, code, description, default_fabric, default_grid, estimated_pieces_per_roll, default_colors) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [id, code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, JSON.stringify(defaultColors)]);
        res.status(201).json({ message: 'Created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(toCamel(rows));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(toCamel(rows));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = rows.map(r => {
            const camel = toCamel(r);
            camel.items = JSON.parse(r.items);
            camel.activeCuttingItems = JSON.parse(r.active_cutting_items);
            camel.splits = JSON.parse(r.splits);
            return camel;
        });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));