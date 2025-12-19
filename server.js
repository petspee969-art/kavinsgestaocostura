
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
// Alterado para 3003 conforme Nginx
const PORT = process.env.PORT || 3003;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
    credentials: true
}));

app.use(express.json());

const distPath = path.resolve(__dirname, 'dist');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Benvindo199380@',
    database: process.env.DB_NAME || 'corte',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z' 
};

const pool = mysql.createPool(dbConfig);

// --- AUXILIARES ---
const cleanParams = (params) => params.map(p => p === undefined ? null : p);

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) { return null; }
};

const safeJson = (data) => {
    if (!data) return '[]';
    if (typeof data === 'string') return data;
    try { return JSON.stringify(data); } catch (e) { return '[]'; }
};

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

// --- ROTEADOR DE API ---
const router = express.Router();

router.use((req, res, next) => {
    console.log(`[API] ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
    next();
});

// PRODUTOS
router.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        res.json(rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : (r.default_colors || [])
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', async (req, res) => {
    try {
        const d = req.body;
        const sql = `INSERT INTO products (id, code, description, default_fabric, default_colors, default_grid, estimated_pieces_per_roll) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = cleanParams([d.id, d.code, d.description, d.defaultFabric, safeJson(d.defaultColors), d.defaultGrid, d.estimatedPiecesPerRoll]);
        await pool.query(sql, params);
        res.status(201).json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', async (req, res) => {
    try {
        const d = req.body;
        const sql = `UPDATE products SET code=?, description=?, default_fabric=?, default_colors=?, default_grid=?, estimated_pieces_per_roll=? WHERE id=?`;
        const params = cleanParams([d.code, d.description, d.defaultFabric, safeJson(d.defaultColors), d.defaultGrid, d.estimatedPiecesPerRoll, req.params.id]);
        await pool.query(sql, params);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// COSTUREIRAS
router.get('/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/seamstresses', async (req, res) => {
    try {
        const d = req.body;
        const sql = `INSERT INTO seamstresses (id, name, phone, specialty, active, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = cleanParams([d.id, d.name, d.phone, d.specialty, d.active, d.address, d.city]);
        await pool.query(sql, params);
        res.status(201).json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/seamstresses/:id', async (req, res) => {
    try {
        const d = req.body;
        const sql = `UPDATE seamstresses SET name=?, phone=?, specialty=?, active=?, address=?, city=? WHERE id=?`;
        const params = cleanParams([d.name, d.phone, d.specialty, d.active, d.address, d.city, req.params.id]);
        await pool.query(sql, params);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ORDENS
router.get('/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows.map(r => {
            const camel = toCamel(r);
            camel.items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []);
            camel.activeCuttingItems = typeof r.active_cutting_items === 'string' ? JSON.parse(r.active_cutting_items) : (r.active_cutting_items || []);
            camel.splits = typeof r.splits === 'string' ? JSON.parse(r.splits) : (r.splits || []);
            return camel;
        }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders', async (req, res) => {
    try {
        const d = req.body;
        const sql = `INSERT INTO orders (id, reference_id, reference_code, description, fabric, items, active_cutting_items, splits, grid_type, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = cleanParams([
            d.id, d.referenceId, d.referenceCode, d.description, d.fabric,
            safeJson(d.items), safeJson(d.activeCuttingItems), safeJson(d.splits),
            d.gridType, d.status, d.notes,
            formatDate(d.createdAt), formatDate(d.updatedAt)
        ]);
        await pool.query(sql, params);
        res.status(201).json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/orders/:id', async (req, res) => {
    try {
        const d = req.body;
        const sql = `UPDATE orders SET reference_id=?, reference_code=?, description=?, fabric=?, items=?, active_cutting_items=?, splits=?, grid_type=?, status=?, notes=?, updated_at=?, finished_at=? WHERE id=?`;
        const params = cleanParams([
            d.referenceId, d.referenceCode, d.description, d.fabric,
            safeJson(d.items), safeJson(d.activeCuttingItems), safeJson(d.splits),
            d.gridType, d.status, d.notes,
            formatDate(d.updatedAt), formatDate(d.finishedAt), req.params.id
        ]);
        await pool.query(sql, params);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// TECIDOS
router.get('/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(rows.map(toCamel));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/fabrics', async (req, res) => {
    try {
        const d = req.body;
        const sql = `INSERT INTO fabrics (id, name, color, color_hex, stock_rolls, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = cleanParams([d.id, d.name, d.color, d.colorHex, d.stockRolls, d.notes, formatDate(d.createdAt), formatDate(d.updatedAt)]);
        await pool.query(sql, params);
        res.status(201).json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.put('/fabrics/:id', async (req, res) => {
    try {
        const d = req.body;
        const sql = `UPDATE fabrics SET name=?, color=?, color_hex=?, stock_rolls=?, notes=?, updated_at=? WHERE id=?`;
        const params = cleanParams([d.name, d.color, d.colorHex, d.stockRolls, d.notes, formatDate(d.updatedAt), req.params.id]);
        await pool.query(sql, params);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

router.delete('/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const allowed = ['products', 'orders', 'seamstresses', 'fabrics'];
    if (!allowed.includes(table)) return res.status(403).json({ error: 'Proibido' });
    try {
        await pool.query(`DELETE FROM ${table} WHERE id=?`, [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MONTAGEM ---

// Rotas de API montadas em /api conforme Nginx
app.use('/api', router);

// Arquivos estáticos na raiz
app.use(express.static(distPath));

// Fallback SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.join(distPath, 'index.html'));
});

// Inicialização
async function initDatabase() {
    try {
        console.log('--- INICIALIZANDO SERVIDOR NA PORTA 3003 ---');
        const conn = await pool.getConnection();
        console.log('✅ MySQL Conectado.');
        conn.release();
    } catch (e) { 
        console.error('❌ ERRO AO CONECTAR NO BANCO:', e.message); 
    }
}

initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
});
