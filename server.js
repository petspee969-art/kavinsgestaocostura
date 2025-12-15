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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kavins_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to convert DB rows (snake_case) to App types (camelCase)
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

// Helper to convert App types (camelCase) to DB cols (snake_case)
const toSnake = (o) => {
    if (!o || typeof o !== 'object') return o;
    const n = {};
    Object.keys(o).forEach(k => {
        const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        n[snake] = o[k];
    });
    return n;
};

// --- API ROUTES ---

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        // Parse JSON fields
        const products = rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : r.default_colors
        }));
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { id, code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, defaultColors } = req.body;
        const sql = `INSERT INTO products (id, code, description, default_fabric, default_grid, estimated_pieces_per_roll, default_colors) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [id, code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, JSON.stringify(defaultColors)]);
        res.status(201).json({ message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, defaultColors } = req.body;
        const sql = `UPDATE products SET code=?, description=?, default_fabric=?, default_grid=?, estimated_pieces_per_roll=?, default_colors=? WHERE id=?`;
        await pool.query(sql, [code, description, defaultFabric, defaultGrid, estimatedPiecesPerRoll, JSON.stringify(defaultColors), req.params.id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SEAMSTRESSES
app.get('/api/seamstresses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM seamstresses ORDER BY name ASC');
        res.json(toCamel(rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/seamstresses', async (req, res) => {
    try {
        const { id, name, phone, specialty, active, address, city } = req.body;
        const sql = `INSERT INTO seamstresses (id, name, phone, specialty, active, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [id, name, phone, specialty, active, address, city]);
        res.status(201).json({ message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/seamstresses/:id', async (req, res) => {
    try {
        const { name, phone, specialty, active, address, city } = req.body;
        const sql = `UPDATE seamstresses SET name=?, phone=?, specialty=?, active=?, address=?, city=? WHERE id=?`;
        await pool.query(sql, [name, phone, specialty, active, address, city, req.params.id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/seamstresses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM seamstresses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FABRICS
app.get('/api/fabrics', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM fabrics ORDER BY name ASC');
        res.json(toCamel(rows));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/fabrics', async (req, res) => {
    try {
        const { id, name, color, colorHex, stockRolls, notes, createdAt, updatedAt } = req.body;
        const sql = `INSERT INTO fabrics (id, name, color, color_hex, stock_rolls, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        // Ensure dates are formatted for MySQL or pass ISO string (MySQL handles ISO string usually)
        await pool.query(sql, [id, name, color, colorHex, stockRolls, notes, new Date(createdAt), new Date(updatedAt)]);
        res.status(201).json({ message: 'Created' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/fabrics/:id', async (req, res) => {
    try {
        const { name, color, colorHex, stockRolls, notes, updatedAt } = req.body;
        const sql = `UPDATE fabrics SET name=?, color=?, color_hex=?, stock_rolls=?, notes=?, updated_at=? WHERE id=?`;
        await pool.query(sql, [name, color, colorHex, stockRolls, notes, new Date(updatedAt), req.params.id]);
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/fabrics/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM fabrics WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ORDERS
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = rows.map(r => {
            const camel = toCamel(r);
            // Parse JSON columns back to objects
            camel.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items;
            camel.activeCuttingItems = typeof r.active_cutting_items === 'string' ? JSON.parse(r.active_cutting_items) : r.active_cutting_items;
            camel.splits = typeof r.splits === 'string' ? JSON.parse(r.splits) : r.splits;
            return camel;
        });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const o = req.body;
        const sql = `
            INSERT INTO orders 
            (id, reference_id, reference_code, description, fabric, grid_type, status, notes, items, active_cutting_items, splits, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            o.id, o.referenceId, o.referenceCode, o.description, o.fabric, o.gridType, o.status, o.notes,
            JSON.stringify(o.items || []), 
            JSON.stringify(o.activeCuttingItems || []), 
            JSON.stringify(o.splits || []),
            new Date(o.createdAt), new Date(o.updatedAt)
        ];
        
        await pool.query(sql, values);
        res.status(201).json({ message: 'Created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const o = req.body;
        const sql = `
            UPDATE orders SET 
            reference_id=?, reference_code=?, description=?, fabric=?, grid_type=?, status=?, notes=?, 
            items=?, active_cutting_items=?, splits=?, updated_at=?, finished_at=?
            WHERE id=?
        `;
        const values = [
            o.referenceId, o.referenceCode, o.description, o.fabric, o.gridType, o.status, o.notes,
            JSON.stringify(o.items || []), 
            JSON.stringify(o.activeCuttingItems || []), 
            JSON.stringify(o.splits || []),
            new Date(o.updatedAt),
            o.finishedAt ? new Date(o.finishedAt) : null,
            req.params.id
        ];

        await pool.query(sql, values);
        res.json({ message: 'Updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Fallback for SPA (Serve index.html for any other route)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database Host: ${process.env.DB_HOST}`);
});
