import { VercelRequest, VercelResponse } from '@vercel/node';
// Adicionada a extensão .js para garantir a resolução do módulo no ambiente Linux da Vercel
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de CORS para permitir que o Frontend acesse esta rota
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Inicializa a conexão com o TiDB Cloud através do Orchestrator
    await DataOrchestrator.init();
    
    const { ticker } = req.query;
    
    if (!ticker) {
      return res.status(400).json({ error: "Ticker é obrigatório" });
    }

    const tickerUpper = String(ticker).toUpperCase();
    const opcoes = await DataOrchestrator.getOptionsData(tickerUpper);

    // Retorna a lista de opções encontrada no banco de dados
    return res.status(200).json(opcoes);

  } catch (error: any) {
    console.error('❌ [API BUSCAR-OPCOES ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}