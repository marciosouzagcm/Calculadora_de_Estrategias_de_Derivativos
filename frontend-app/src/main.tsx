// src/main.tsx

// ----------------------------------------------------------------------
// 1. IMPORTAÇÃO CHAVE DO FIREBASE
//
// CORREÇÃO FINAL DE CAMINHO: Usamos './firebase'.
// O USUÁRIO DEVE MOVER o arquivo firebase.ts para dentro da pasta 'src/'.
import './firebase'; 
// ----------------------------------------------------------------------

// 2. IMPORTAÇÕES CRUCIAIS DO REACT (Necessárias para resolver o 'ReactDOM is not defined')
import React from 'react';
import ReactDOM from 'react-dom/client'; 

import App from './App.tsx'; 
import './index.css'; 

// Inicializa o aplicativo React
const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    // Se a div 'root' não for encontrada no index.html, exibe um erro
    console.error("Erro: Elemento com id 'root' não encontrado no HTML.");
}