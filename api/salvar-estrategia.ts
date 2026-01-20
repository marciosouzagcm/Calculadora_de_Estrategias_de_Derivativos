import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de CORS para permitir que o Frontend envie dados (POST)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Resposta para o pre-flight do CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Restrição de Método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }
  
  try {
    const estrategia = req.body;

    // Log para depuração no painel da Vercel
    console.log("📥 [SAVE] Estratégia recebida para processamento:", JSON.stringify(estrategia, null, 2));

    // Validação básica
    if (!estrategia || Object.keys(estrategia).length === 0) {
      return res.status(400).json({ error: "O corpo da requisição não pode estar vazio." });
    }

    /**
     * DICA: No futuro, você pode importar o DatabaseService.js 
     * e salvar este objeto 'estrategia' em uma tabela 'historico_operacoes' no TiDB.
     */

    // Retorno de Sucesso
    return res.status(200).json({ 
      success: true, 
      message: "Estratégia recebida com sucesso",
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ [SAVE ERROR]:", error.message);
    return res.status(500).json({ error: error.message });
  }
}