
/**
 * BRANDING CONFIGURATION (WHITE LABEL)
 * Change these values to adapt the system for different clients.
 */
export const BRAND = {
    appName: "Gestão de Produção",
    companyName: "Kavin's",
    shortName: "KVN",
    colors: {
        primary: "#4f46e5", // Indigo-600
        secondary: "#1e1b4b", // Indigo-950
    },
    footerText: "Sistema Whitelabel de Gestão Têxtil",
    version: "2.5.0 Mobile-Ready"
};

export const updateDocumentTitle = (subtitle?: string) => {
    document.title = subtitle 
        ? `${subtitle} | ${BRAND.companyName}` 
        : `${BRAND.companyName} - ${BRAND.appName}`;
};
