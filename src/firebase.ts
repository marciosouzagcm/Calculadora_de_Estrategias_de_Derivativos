import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';


const firebaseConfig = {
	// ...substitua pelas suas credenciais do Firebase...
	apiKey: "SUA_API_KEY",
	authDomain: "SEU_AUTH_DOMAIN",
	projectId: "SEU_PROJECT_ID",
	storageBucket: "SEU_STORAGE_BUCKET",
	messagingSenderId: "SEU_MESSAGING_SENDER_ID",
	appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
	try {
		await enableIndexedDbPersistence(db);
		console.log("🔥 [Firebase] Persistência IndexedDB ativada!");
	} catch (err: any) {
		if (err && err.code === 'failed-precondition') {
			console.warn("[Firebase] Persistência não ativada: múltiplas abas abertas.");
		} else if (err && err.code === 'unimplemented') {
			console.warn("[Firebase] Persistência não suportada neste navegador/ambiente.");
		} else {
			console.error("[Firebase] Erro ao habilitar persistência:", err);
		}
	}
})();

export { db };