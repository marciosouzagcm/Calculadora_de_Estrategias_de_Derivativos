import { VercelRequest, VercelResponse } from '@vercel/node';
import { DataOrchestrator } from '../src/services/DataOrchestrator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await DataOrchestrator.init();
    const { ticker } = req.query;
    
    if (!ticker) {
      return res.status(400).json({ error: "Ticker é obrigatório" });
    }

    const opcoes = await DataOrchestrator.getOptionsData(String(ticker).toUpperCase());
    res.status(200).json(opcoes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}