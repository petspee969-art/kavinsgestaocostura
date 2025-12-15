/**
 * LOCAL DATABASE ADAPTER
 * 
 * This file replaces the Supabase client. 
 * Currently, it persists data to localStorage.
 * 
 * TO MIGRATE TO MARIADB (VPS):
 * 1. Create a backend API (Node.js/Express/Python) that connects to your MariaDB.
 * 2. Replace the localStorage calls below with `fetch('http://your-vps-ip/api/...')`.
 */

import { Fabric, ProductionOrder, ProductReference, Seamstress } from "../types";

// Helper to simulate async delay (like a real DB)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic Helper for LocalStorage CRUD
const Storage = {
    get: <T>(key: string): T[] => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },
    set: <T>(key: string, data: T[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    },
    add: <T extends { id: string }>(key: string, item: T) => {
        const items = Storage.get<T>(key);
        // Ensure ID
        if (!item.id) item.id = Math.random().toString(36).substr(2, 9);
        items.unshift(item); // Add to top
        Storage.set(key, items);
        return item;
    },
    update: <T extends { id: string }>(key: string, item: T) => {
        const items = Storage.get<T>(key);
        const index = items.findIndex(i => i.id === item.id);
        if (index > -1) {
            items[index] = { ...items[index], ...item };
            Storage.set(key, items);
            return items[index];
        }
        return null;
    },
    delete: <T extends { id: string }>(key: string, id: string) => {
        const items = Storage.get<T>(key);
        const filtered = items.filter(i => i.id !== id);
        Storage.set(key, filtered);
    }
};

// Keys
const KEYS = {
    ORDERS: 'kavins_orders',
    PRODUCTS: 'kavins_products',
    SEAMSTRESSES: 'kavins_seamstresses',
    FABRICS: 'kavins_fabrics'
};

// --- EXPORTED DB API ---

export const db = {
    orders: {
        getAll: async () => {
            await delay(100);
            return Storage.get<ProductionOrder>(KEYS.ORDERS);
        },
        create: async (order: ProductionOrder) => {
            await delay(200);
            return Storage.add(KEYS.ORDERS, order);
        },
        update: async (order: ProductionOrder) => {
            await delay(200);
            return Storage.update(KEYS.ORDERS, order);
        },
        delete: async (id: string) => {
            await delay(100);
            Storage.delete(KEYS.ORDERS, id);
        }
    },
    products: {
        getAll: async () => {
            await delay(100);
            return Storage.get<ProductReference>(KEYS.PRODUCTS);
        },
        create: async (product: ProductReference) => {
            await delay(200);
            return Storage.add(KEYS.PRODUCTS, product);
        },
        update: async (product: ProductReference) => {
            await delay(200);
            return Storage.update(KEYS.PRODUCTS, product);
        },
        delete: async (id: string) => {
            await delay(100);
            Storage.delete(KEYS.PRODUCTS, id);
        }
    },
    seamstresses: {
        getAll: async () => {
            await delay(100);
            return Storage.get<Seamstress>(KEYS.SEAMSTRESSES);
        },
        create: async (seamstress: Seamstress) => {
            await delay(200);
            return Storage.add(KEYS.SEAMSTRESSES, seamstress);
        },
        update: async (seamstress: Seamstress) => {
            await delay(200);
            return Storage.update(KEYS.SEAMSTRESSES, seamstress);
        },
        delete: async (id: string) => {
            await delay(100);
            Storage.delete(KEYS.SEAMSTRESSES, id);
        }
    },
    fabrics: {
        getAll: async () => {
            await delay(100);
            return Storage.get<Fabric>(KEYS.FABRICS);
        },
        create: async (fabric: Fabric) => {
            await delay(200);
            return Storage.add(KEYS.FABRICS, fabric);
        },
        update: async (fabric: Fabric) => {
            await delay(200);
            return Storage.update(KEYS.FABRICS, fabric);
        },
        delete: async (id: string) => {
            await delay(100);
            Storage.delete(KEYS.FABRICS, id);
        }
    }
};