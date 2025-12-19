
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

const distPath = path.resolve(__dirname, 'dist');

// Configuração do Pool de Conexão
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Benvindo199380@',
    database: process.env.DB_NAME || 'corte',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Função de Inicialização das Tabelas
async function initDatabase() {
    try {
        console.log('--- DIAGNÓSTICO DE BANCO DE DADOS ---');
        console.log(`📍 Tentando conectar em: ${dbConfig.host}`);
        console.log(`👤 Usuário: ${dbConfig.user}`);
        console.log(`📦 Banco: ${dbConfig.database}`);

        const connection = await pool.getConnection();
        console.log('✅ Conexão estabelecida com sucesso!');
        connection.release();

        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(50) PRIMARY KEY,
                code VARCHAR(50),
                description TEXT,
                default_fabric VARCHAR(100),
                default_colors JSON,
                default_grid VARCHAR(20),
                estimated_pieces_per_roll INT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY, reference_id VARCHAR(50), reference_code VARCHAR(50),
                description TEXT, fabric VARCHAR(100), items JSON, active_cutting_items JSON,
                splits JSON, grid_type VARCHAR(20), status VARCHAR(50), notes TEXT,
                created_at DATETIME, updated_at DATETIME, finished_at DATETIME
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS seamstresses (
                id VARCHAR(50) PRIMARY KEY, name VARCHAR(100), phone VARCHAR(20),
                specialty VARCHAR(100), active BOOLEAN, address TEXT, city VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS fabrics (
                id VARCHAR(50) PRIMARY KEY, name VARCHAR(100), color VARCHAR(50),
                color_hex VARCHAR(7), stock_rolls DECIMAL(10,2), notes TEXT,
                created_at DATETIME, updated_at DATETIME
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('🚀 Tabelas verificadas/criadas.');
        console.log('-------------------------------------');
    } catch (err) {
        console.error('❌ ERRO NO BANCO DE DADOS:', err.code);
        console.error('Mensagem:', err.message);
        console.log('-------------------------------------');
        // Não encerramos o processo aqui para permitir que o endpoint de health mostre o erro no navegador
    }
}

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

// NOVO: Endpoint de Saúde para Testes
router.get('/health', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ 
            status: 'online', 
            database: 'connected', 
            message: 'O servidor está conseguindo falar com o MySQL!',
            env_host: process.env.DB_HOST,
            env_user: process.env.DB_USER
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected', 
            error_code: err.code,
            error_message: err.message,
            tip: 'Verifique se o usuário e senha no seu arquivo .env estão corretos.'
        });
    }
});

router.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY code ASC');
        res.json(rows.map(r => ({
            ...toCamel(r),
            defaultColors: typeof r.default_colors === 'string' ? JSON.parse(r.default_colors) : r.default_colors
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
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

app.use('/corte/api', router);
app.use('/corte', express.static(distPath));
app.get('/corte/*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.get('/', (req, res) => res.redirect('/corte/'));

initDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SERVIDOR RODANDO NA PORTA ${PORT}`);
    });
});
