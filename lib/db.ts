
/**
 * API DATABASE ADAPTER
 */

import { Fabric, ProductionOrder, ProductReference, Seamstress } from "../types";

const API_BASE = '/corte/api';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        // Tenta ler como JSON, se falhar, lê como texto
        let errorMessage = `Erro ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {
            const textError = await response.text().catch(() => '');
            if (textError) {
                console.error("Erro bruto do servidor:", textError);
                errorMessage = `Erro do Servidor (veja console): ${textError.slice(0, 100)}...`;
            }
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

const API = {
    get: async <T>(endpoint: string): Promise<T[]> => {
        const response = await fetch(`${API_BASE}/${endpoint}`);
        return handleResponse(response);
    },
    post: async <T>(endpoint: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    put: async <T>(endpoint: string, id: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    delete: async (endpoint: string, id: string) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'DELETE'
        });
        return handleResponse(response);
    }
};

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
