import { Router, Request, Response } from 'express';
import { DataOrchestrator } from '../services/DataOrchestrator.js';
import { StrategyService } from '../services/StrategyService.js';
import { analysisQuerySchema } from '../schemas/analysisSchema.js';

const router = Router();

// Rota: GET /api/
router.get('/', (req, res) => {
    res.json({ status: "online", message: "API BoardPro Ativa" });
});

// Rota: GET /api/analise
router.get('/analise', async (req: Request, res: Response) => {
    try {
        // 1. Validação Robusta com Zod
        const validation = analysisQuerySchema.safeParse(req.query);
        
        if (!validation.success) {
            return res.status(400).json({ 
                error: "Parâmetros inválidos", 
                details: validation.error.format() 
            });
        }

        const { ticker, preco, lote } = validation.data;

        // 2. Garante conexão com TiDB
        await DataOrchestrator.init();

        // 3. Executa Motor de Cálculo
        const resultados = await StrategyService.getOportunidades(ticker, lote, preco);

        // 4. Resposta JSON
        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            data: resultados
        });

    } catch (error: any) {
        console.error("❌ Erro no Endpoint /analise:", error);
        res.status(500).json({ 
            error: "Falha interna no motor de cálculo",
            message: error.message 
        });
    }
});

export default router;