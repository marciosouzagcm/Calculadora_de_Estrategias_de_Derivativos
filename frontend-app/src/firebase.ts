// src/config/firebase.ts (ou onde estiver seu arquivo)

// CORREÇÃO: Importar dos pacotes oficiais do Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, enablePersistence } from 'firebase/firestore';

// 1. Configurações do Firebase (adicione as suas chaves aqui)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    // ... outros dados ...
};

// 2. Inicializa o App
const app = initializeApp(firebaseConfig);

// 3. Obtém o serviço Firestore
const db = getFirestore(app);

// 4. FUNÇÃO CHAVE: Ativar Persistência
async function enableFirestorePersistence() {
    try {
        await enablePersistence(db);
        console.log("🔥 [Firebase] Persistência offline do Firestore ativada!");
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn("[Firebase] Persistência não ativada: Múltiplas abas ou navegador não suportado.");
        } else if (err.code === 'unimplemented') {
            console.warn("[Firebase] Persistência não ativada: Recurso não suportado neste ambiente.");
        } else {
            console.error("[Firebase] Erro ao habilitar a persistência:", err);
        }
    }
}

// 5. Chama a função de ativação
// Usa uma IIFE (Immediately Invoked Function Expression) para iniciar
// a ativação assim que o módulo for carregado.
(async () => {
    // Nota: A persistência deve ser ativada antes de qualquer chamada ao Firestore.
    await enableFirestorePersistence();
})();


// 6. Exporta a instância do banco de dados para que você possa usá-la nos seus componentes
export { db };