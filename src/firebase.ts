import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
	apiKey: "SUA_API_KEY",
	authDomain: "SEU_AUTH_DOMAIN",
	projectId: "SEU_PROJECT_ID",
	storageBucket: "SEU_STORAGE_BUCKET",
	messagingSenderId: "SEU_MESSAGING_SENDER_ID",
	appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Chama a função de persistência dinamicamente (evita erro de named export durante bundling)
async function tryEnablePersistence() {
	if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
		console.warn('[Firebase] IndexedDB não disponível — pulando ativação de persistência.');
		return;
	}

	try {
		const firestoreModule: any = await import('firebase/firestore');
		// Tenta os nomes possíveis (enableIndexedDbPersistence no SDK modular, fallback para enablePersistence)
		const enableFn = firestoreModule.enableIndexedDbPersistence || firestoreModule.enablePersistence;
		if (typeof enableFn === 'function') {
			await enableFn(db);
			console.log("🔥 [Firebase] Persistência IndexedDB do Firestore ativada!");
		} else {
			console.warn("[Firebase] Nenhuma função de persistência disponível no módulo firestore importado.");
		}
	} catch (err: any) {
		// Tratamento de erros conhecidos
		if (err && err.code === 'failed-precondition') {
			console.warn("[Firebase] Persistência não ativada: múltiplas abas ou navegador não suportado.");
		} else if (err && err.code === 'unimplemented') {
			console.warn("[Firebase] Persistência não ativada: Recurso não suportado neste ambiente.");
		} else {
			console.error("[Firebase] Erro ao habilitar a persistência dinamicamente:", err);
		}
	}
}

tryEnablePersistence();

export { db };
