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

// ----------------------------------------------------------------------
// 3. DETECÇÃO DINÂMICA DE AMBIENTE (BOARDPRO V2026.1)
// Injeta dinamicamente no objeto window se estamos rodando em localhost.
// Isso ajuda o App.tsx a decidir se usa o prefixo /app nas rotas.
// ----------------------------------------------------------------------
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
(window as any).__BOARDPRO_IS_LOCAL__ = isLocalhost;

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