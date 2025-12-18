
/**
 * API DATABASE ADAPTER
 * 
 * Connects to the local Node.js/Express API (server.js).
 * The API in turn connects to MariaDB/MySQL.
 */

import { Fabric, ProductionOrder, ProductReference, Seamstress } from "../types";

// Base URL for the API (must match server config)
const API_BASE = '/corte/api';

// Generic Helper for API Calls
const API = {
    get: async <T>(endpoint: string): Promise<T[]> => {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
        return await response.json();
    },
    post: async <T>(endpoint: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Failed to create ${endpoint}`);
        return await response.json();
    },
    put: async <T>(endpoint: string, id: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Failed to update ${endpoint}`);
        return await response.json();
    },
    delete: async (endpoint: string, id: string) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`Failed to delete ${endpoint}`);
        return await response.json();
    }
};

// --- EXPORTED DB API ---

export const db = {
    orders: {
        getAll: () => API.get<ProductionOrder>('orders'),
        create: (order: ProductionOrder) => API.post('orders', order),
        update: (order: ProductionOrder) => API.put('orders', order.id, order),
        delete: (id: string) => API.delete('orders', id)
    },
    products: {
        getAll: () => API.get<ProductReference>('products'),
        create: (product: ProductReference) => API.post('products', product),
        update: (product: ProductReference) => API.put('products', product.id, product),
        delete: (id: string) => API.delete('products', id)
    },
    seamstresses: {
        getAll: () => API.get<Seamstress>('seamstresses'),
        create: (seamstress: Seamstress) => API.post('seamstresses', seamstress),
        update: (seamstress: Seamstress) => API.put('seamstresses', seamstress.id, seamstress),
        delete: (id: string) => API.delete('seamstresses', id)
    },
    fabrics: {
        getAll: () => API.get<Fabric>('fabrics'),
        create: (fabric: Fabric) => API.post('fabrics', fabric),
        update: (fabric: Fabric) => API.put('fabrics', fabric.id, fabric),
        delete: (id: string) => API.delete('fabrics', id)
    }
};
