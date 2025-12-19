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

// No VPS, o dist estará em /var/www/gestaokavins/corte/dist
const distPath = path.resolve(__dirname, 'dist');

// Conexão com Banco de Dados
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Benvindo199380@',
    database: process.env.DB_NAME || 'corte',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper para converter snake_case do DB para camelCase do React
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

const router = express.Router();

// --- PRODUTOS ---
router.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        res.json(rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : r.default_colors
        })));
    } catch (err) { 
        console.error('Erro GET products:', err);
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/products', async (req, res) => {
    const { id, code, description, defaultFabric, defaultColors, defaultGrid, estimatedPiecesPerRoll } = req.body;
    try {
        await pool.query(
            'INSERT INTO products (id, code, description, default_fabric, default_colors, default_grid, estimated_pieces_per_roll) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, code, description, defaultFabric, JSON.stringify(defaultColors), defaultGrid, estimatedPiecesPerRoll]
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', async (req, res) => {
    const { code, description, defaultFabric, defaultColors, defaultGrid, estimatedPiecesPerRoll } = req.body;
    try {
        await pool.query(
            'UPDATE products SET code=?, description=?, default_fabric=?, default_colors=?, default_grid=?, estimated_pieces_per_roll=? WHERE id=?',
            [code, description, defaultFabric, JSON.stringify(defaultColors), defaultGrid, estimatedPiecesPerRoll, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ORDENS ---
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
    } catch (err) { 
        console.error('Erro GET orders:', err);
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/orders', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            'INSERT INTO orders (id, reference_id, reference_code, description, fabric, items, active_cutting_items, splits, grid_type, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.id, data.referenceId, data.referenceCode, data.description, data.fabric, JSON.stringify(data.items), JSON.stringify(data.activeCuttingItems), JSON.stringify(data.splits), data.gridType, data.status, data.notes, data.createdAt, data.updatedAt]
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/orders/:id', async (req, res) => {
    const data = req.body;
    try {
        await pool.query(
            'UPDATE orders SET reference_id=?, reference_code=?, description=?, fabric=?, items=?, active_cutting_items=?, splits=?, grid_type=?, status=?, notes=?, updated_at=?, finished_at=? WHERE id=?',
            [data.referenceId, data.referenceCode, data.description, data.fabric, JSON.stringify(data.items), JSON.stringify(data.activeCuttingItems), JSON.stringify(data.splits), data.gridType, data.status, data.notes, data.updatedAt, data.finishedAt, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/orders/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM orders WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- COSTUREIRAS ---
router.get('/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/seamstresses', async (req, res) => {
    const { id, name, phone, specialty, active, address, city } = req.body;
    try {
        await pool.query(
            'INSERT INTO seamstresses (id, name, phone, specialty, active, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, name, phone, specialty, active, address, city]
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/seamstresses/:id', async (req, res) => {
    const { name, phone, specialty, active, address, city } = req.body;
    try {
        await pool.query(
            'UPDATE seamstresses SET name=?, phone=?, specialty=?, active=?, address=?, city=? WHERE id=?',
            [name, phone, specialty, active, address, city, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/seamstresses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM seamstresses WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TECIDOS ---
router.get('/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/fabrics', async (req, res) => {
    const { id, name, color, colorHex, stockRolls, notes, createdAt, updatedAt } = req.body;
    try {
        await pool.query(
            'INSERT INTO fabrics (id, name, color, color_hex, stock_rolls, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, color, colorHex, stockRolls, notes, createdAt, updatedAt]
        );
        res.status(201).json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/fabrics/:id', async (req, res) => {
    const { name, color, colorHex, stockRolls, notes, updatedAt } = req.body;
    try {
        await pool.query(
            'UPDATE fabrics SET name=?, color=?, color_hex=?, stock_rolls=?, notes=?, updated_at=? WHERE id=?',
            [name, color, colorHex, stockRolls, notes, updatedAt, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/fabrics/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM fabrics WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rotas da API sob /corte/api
app.use('/corte/api', router);

// Servir arquivos estáticos sob /corte
app.use('/corte', express.static(distPath));

// Fallback para SPA (React Router)
app.get('/corte/*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Redirecionamento da raiz da porta 3002
app.get('/', (req, res) => {
    res.redirect('/corte/');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Corte Ativo na porta ${PORT}`);
    console.log(`📂 Pasta Dist: ${distPath}`);
});