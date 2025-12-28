import { initializeApp } from 'firebase/app';
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from 'firebase/firestore';

// Substitua pelos seus dados reais do console do Firebase
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializa o App do Firebase
const app = initializeApp(firebaseConfig);

/**
 * Inicializa o Firestore com a nova API de persistência (SDK v10+)
 * Esta abordagem substitui o enableIndexedDbPersistence() que será depreciado.
 * O persistentMultipleTabManager garante que o banco funcione em várias abas abertas.
 */
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Log para confirmar a ativação no ambiente de desenvolvimento
if (typeof window !== 'undefined') {
    console.log("🔥 [Firebase] Persistência Multi-Aba ativada via FirestoreSettings.");
}

export { db };