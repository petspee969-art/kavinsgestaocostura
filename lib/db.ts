
/**
 * API DATABASE ADAPTER
 */

import { Fabric, ProductionOrder, ProductReference, Seamstress } from "../types";

// Base alterada para /api conforme configuração do Nginx
const API_BASE = '/api';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = `Erro ${response.status}`;
        
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            errorMessage = json.error || errorMessage;
        } catch (e) {
            if (response.status === 405) {
                errorMessage = "Erro 405: Método não permitido. O servidor bloqueou esta ação.";
            } else if (response.status === 404) {
                errorMessage = "Erro 404: API não encontrada.";
            } else {
                errorMessage = text.slice(0, 150) || errorMessage;
            }
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

const API = {
    get: async <T>(endpoint: string): Promise<T[]> => {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            headers: { 
                'Cache-Control': 'no-cache',
                'Accept': 'application/json'
            }
        });
        return handleResponse(response);
    },
    post: async <T>(endpoint: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    put: async <T>(endpoint: string, id: string, data: T) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },
    delete: async (endpoint: string, id: string) => {
        const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
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
