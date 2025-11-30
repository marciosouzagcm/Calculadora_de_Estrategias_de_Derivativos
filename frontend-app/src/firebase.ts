// src/config/firebase.ts (ou onde estiver seu arquivo)

// CORREÇÃO: Importar dos pacotes oficiais do Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 1. Configurações do Firebase (adicione as suas chaves aqui)
const firebaseConfig = {
	apiKey: "SUA_API_KEY",
	authDomain: "SEU_AUTH_DOMAIN",
	projectId: "SEU_PROJECT_ID",
	storageBucket: "SEU_STORAGE_BUCKET",
	messagingSenderId: "SEU_MESSAGING_SENDER_ID",
	appId: "SEU_APP_ID"
};

// 2. Inicializa o App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. FUNÇÃO CHAVE: Ativar Persistência
async function tryEnablePersistenceFrontend() {
	if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
		console.warn('[Firebase][frontend] IndexedDB não disponível — pulando persistência.');
		return;
	}

	try {
		const firestoreModule: any = await import('firebase/firestore');
		const enableFn = firestoreModule.enableIndexedDbPersistence || firestoreModule.enablePersistence;
		if (typeof enableFn === 'function') {
			await enableFn(db);
			console.log("🔥 [Firebase][frontend] Persistência IndexedDB ativada!");
		} else {
			console.warn("[Firebase][frontend] Função de persistência não encontrada no módulo firestore.");
		}
	} catch (err: any) {
		if (err && err.code === 'failed-precondition') {
			console.warn("[Firebase][frontend] Persistência não ativada: múltiplas abas ou navegador não suportado.");
		} else if (err && err.code === 'unimplemented') {
			console.warn("[Firebase][frontend] Persistência não suportada neste ambiente.");
		} else {
			console.error("[Firebase][frontend] Erro ao habilitar persistência dinamicamente:", err);
		}
	}
}

// 4. Chama a função de ativação
// Usa uma IIFE (Immediately Invoked Function Expression) para iniciar
// a ativação assim que o módulo for carregado.
(async () => {
	// Nota: A persistência deve ser ativada antes de qualquer chamada ao Firestore.
	await tryEnablePersistenceFrontend();
})();


// 5. Exporta a instância do banco de dados para que você possa usá-la nos seus componentes
export { db };
