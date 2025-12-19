
/**
 * API DATABASE ADAPTER
 */

import { Fabric, ProductionOrder, ProductReference, Seamstress } from "../types";

// Base URL for the API (must match server config)
const API_BASE = '/corte/api';

// Generic Helper for API Calls
const API = {
    get: async <T>(endpoint: string): Promise<T[]> => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
                throw new Error(errorData.error || `Erro ${response.status} em ${endpoint}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch GET ${endpoint} falhou:`, error);
            throw error;
        }
    },
    post: async <T>(endpoint: string, data: T) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro ao processar requisição' }));
                throw new Error(errorData.error || `Erro no Servidor: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch POST ${endpoint} falhou:`, error);
            throw error;
        }
    },
    put: async <T>(endpoint: string, id: string, data: T) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar' }));
                throw new Error(errorData.error || `Erro no Servidor: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch PUT ${endpoint} falhou:`, error);
            throw error;
        }
    },
    delete: async (endpoint: string, id: string) => {
        try {
            const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`Erro ao excluir em ${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch DELETE ${endpoint} falhou:`, error);
            throw error;
        }
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
