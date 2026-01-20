import { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Adicionada a extensão .js para garantir a resolução do módulo 
 * no runtime de produção da Vercel.
 */
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração Robusta de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Preflight check para navegadores (necessário para APIs externas)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    /**
     * 2. Inicialização do Orquestrador:
     * Garante que o pool de conexões com o TiDB Cloud está pronto.
     */
    await DataOrchestrator.init();

    const { ticker } = req.query;

    if (!ticker) {
      return res.status(400).json({ 
        status: "error",
        message: 'O parâmetro ticker é obrigatório (ex: ?ticker=PETR4).' 
      });
    }

    const tickerUpper = String(ticker).toUpperCase().trim();
    
    // 3. Busca o preço "SPOT" no banco de dados (tabela ativos)
    const preco = await DataOrchestrator.getUnderlyingPrice(tickerUpper);

    // Validação de dados retornados
    if (preco === 0) {
      return res.status(404).json({ 
        status: "error",
        ticker: tickerUpper, 
        message: 'Preço não encontrado ou ativo não cadastrado na base de dados.' 
      });
    }

    // 4. Resposta de sucesso
    return res.status(200).json({ 
      status: "success",
      ticker: tickerUpper, 
      preco: Number(preco.toFixed(2)),
      timestamp: new Date().toISOString() 
    });

  } catch (error: any) {
    console.error('❌ [API COTACAO ERROR]:', error.message);
    return res.status(500).json({ 
      status: "error",
      message: 'Falha interna ao recuperar cotação.',
      details: error.message 
    });
  }
}