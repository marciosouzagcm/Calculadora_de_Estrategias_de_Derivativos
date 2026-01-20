import { VercelRequest, VercelResponse } from '@vercel/node';
// Importação opcional para futura persistência real
// import { pool } from '../src/config/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de CORS (Habilitando POST para o Frontend)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Resposta para o pre-flight do CORS (Browsers testam o POST antes de enviar)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Restrição de Método: Apenas POST é aceito para salvar dados
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: "error", 
      message: 'Método não permitido. Use POST para salvar estratégias.' 
    });
  }
  
  try {
    const estrategia = req.body;

    // 3. Validação de Payload
    if (!estrategia || Object.keys(estrategia).length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "O corpo da requisição está vazio ou é inválido." 
      });
    }

    // Log para depuração (visível no Vercel Dashboard logs)
    console.log("📥 [SAVE] Recebido:", estrategia.name || "Estratégia Sem Nome");

    /**
     * ESTRUTURA PARA PERSISTÊNCIA (Sugestão para próxima etapa):
     * * const query = 'INSERT INTO historico_operacoes (data, ticker, payload) VALUES (NOW(), ?, ?)';
     * await pool.execute(query, [estrategia.ticker, JSON.stringify(estrategia)]);
     */

    // 4. Retorno de Sucesso Simulado
    // O ID gerado aqui pode ser substituído pelo ID do banco de dados (auto-increment)
    return res.status(201).json({ 
      status: "success", 
      message: "Estratégia enviada para o servidor com sucesso",
      data: {
        id: `STR-${Date.now()}`,
        name: estrategia.name,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("❌ [API SAVE ERROR]:", error.message);
    return res.status(500).json({ 
      status: "error", 
      message: "Falha ao processar o salvamento da estratégia.",
      details: error.message 
    });
  }
}