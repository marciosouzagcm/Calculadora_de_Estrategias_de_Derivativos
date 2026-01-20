import { VercelRequest, VercelResponse } from '@vercel/node';
// Adicionada a extensão .js para garantir a resolução do módulo no motor ESM da Vercel
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração básica de CORS para permitir chamadas do Frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Inicializa a conexão com o TiDB se ainda não estiver ativa
    await DataOrchestrator.init();

    const { ticker } = req.query;

    if (!ticker) {
      return res.status(400).json({ error: 'O parâmetro ticker é obrigatório.' });
    }

    const tickerUpper = String(ticker).toUpperCase();
    const preco = await DataOrchestrator.getUnderlyingPrice(tickerUpper);

    if (preco === 0) {
      return res.status(404).json({ ticker: tickerUpper, error: 'Preço não encontrado ou ativo inexistente.' });
    }

    return res.status(200).json({ 
      ticker: tickerUpper, 
      preco,
      timestamp: new Date().toISOString() 
    });

  } catch (error: any) {
    console.error('❌ [API COTACAO ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}