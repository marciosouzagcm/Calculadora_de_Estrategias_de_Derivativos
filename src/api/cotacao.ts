import { VercelRequest, VercelResponse } from '@vercel/node';
import { DataOrchestrator } from '../src/services/DataOrchestrator';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await DataOrchestrator.init();
    const { ticker } = req.query;
    const preco = await DataOrchestrator.getUnderlyingPrice(String(ticker).toUpperCase());
    res.status(200).json({ ticker, preco });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}