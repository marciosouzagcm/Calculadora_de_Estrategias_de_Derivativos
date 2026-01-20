import { VercelRequest, VercelResponse } from '@vercel/node';
/** * Adicionada a extensão .js. 
 * Sem isso, o motor do Node na Vercel não localiza o arquivo transpilado.
 */
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Headers de CORS (Essencial para integração com React/Vue/Next.js)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Preflight check para navegadores
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    /** * 2. Inicialização do Orquestrador:
     * Ele valida a conexão com o TiDB Cloud e desativa o 'Watcher' local
     * automaticamente por detectar que o ambiente é PRODUCTION/CLOUD.
     */
    await DataOrchestrator.init();
    
    const { ticker } = req.query;
    
    if (!ticker) {
      return res.status(400).json({ 
        status: "error", 
        message: "Ticker é obrigatório (ex: ?ticker=PETR4)" 
      });
    }

    const tickerUpper = String(ticker).toUpperCase().trim();
    
    // 3. Busca os dados brutos no banco de dados
    const opcoes = await DataOrchestrator.getOptionsData(tickerUpper);

    if (!opcoes || opcoes.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: `Nenhuma opção encontrada para o ativo ${tickerUpper}` 
      });
    }

    // 4. Resposta formatada para a grade de opções
    return res.status(200).json({
      status: "success",
      ticker: tickerUpper,
      total: opcoes.length,
      timestamp: new Date().toISOString(),
      results: opcoes
    });

  } catch (error: any) {
    console.error('❌ [API BUSCAR-OPCOES ERROR]:', error.message);
    return res.status(500).json({ 
      status: "error", 
      message: "Falha ao recuperar grade de opções do TiDB Cloud.",
      details: error.message 
    });
  }
}