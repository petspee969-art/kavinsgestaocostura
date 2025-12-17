// White Label Configuration
export const BRAND = {
    appName: "Production Manager", // Nome genérico do sistema
    companyName: "Kavin's", // Nome do Cliente (Pode ser alterado para "Confecção X")
    shortName: "KVN",
    // Configurações visuais (usadas para consistência nos textos)
    footerText: "Sistema de Gestão de Confecção",
    version: "2.1.0 Mobile"
};

// Hook para injeção dinâmica de título (opcional)
export const updateDocumentTitle = () => {
    document.title = `${BRAND.companyName} - ${BRAND.appName}`;
};