import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  try {
    const estrategia = req.body;
    // Aqui você pode integrar com seu Firebase ou uma tabela 'history' no TiDB
    console.log("Estratégia recebida:", estrategia);
    res.status(200).json({ success: true, id: Date.now().toString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}