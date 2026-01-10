import cors from 'cors';
import express, { Request, Response } from 'express';
import { pool } from './config/database'; 
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST'] })); 
app.use(express.json());

app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote } = req.query;
        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker é obrigatório." });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        const precoNum = (preco && preco !== 'undefined' && preco !== '') ? parseFloat(String(preco)) : undefined;

        // Busca as oportunidades no Service
        const resultados: any[] = await StrategyService.getOportunidades(tickerStr, loteNum, precoNum);

        console.log(`\n[API] 🔍 Oportunidades para ${tickerStr} | Lote: ${loteNum}`);
        console.log(`--------------------------------------------------------------------------------`);

        if (resultados && resultados.length > 0) {
            resultados.forEach((item: any, index: number) => {
                // 1. MAPEAMENTO DO NOME: Prioriza o nome da estratégia (Ex: Butterfly)
                const nomeEstrategia = item.strategyName || item.tipo || "OPÇÃO";
                
                // 2. MAPEAMENTO DO STRIKE: Tenta encontrar em todas as estruturas possíveis
                let strikeExibicao = 0;
                
                if (item.strike && item.strike !== 0) {
                    // Opção Seca
                    strikeExibicao = parseFloat(item.strike);
                } else if (item.legs && item.legs.length > 0) {
                    // Estratégia Estruturada (Array de Pernas)
                    strikeExibicao = parseFloat(item.legs[0].strike);
                } else if (item.pernaA && item.pernaA.strike) {
                    // Estratégia Estruturada (Objetos Nomeados)
                    strikeExibicao = parseFloat(item.pernaA.strike);
                } else if (item.strikeLong || item.strikeBuy) {
                    // Travas (Strike da ponta comprada)
                    strikeExibicao = parseFloat(item.strikeLong || item.strikeBuy);
                }

                // 3. MAPEAMENTO DO LUCRO: Tenta encontrar o valor líquido ou máximo
                const lucroVal = item.lucroLiquido || item.lucroMaximo || item.maxProfit || item.profit || 0;

                // 4. FORMATAÇÃO PARA O TERMINAL (PT-BR)
                const strikeFormatado = strikeExibicao.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });

                const lucroFormatado = lucroVal.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                });

                const roi = item.roi !== undefined ? item.roi.toFixed(1) : "0.0";

                // Log formatado e alinhado
                const idx = (index + 1).toString().padStart(2, '0');
                console.log(`[${idx}] ${nomeEstrategia.padEnd(25)} | STRIKE: ${strikeFormatado.padStart(6)} | ROI: ${roi.padStart(6)}% | LUCRO: ${lucroFormatado}`);
            });
            console.log(`--------------------------------------------------------------------------------`);
            console.log(`✅ [SUCESSO] ${resultados.length} estratégias enviadas ao Dashboard.\n`);
        }

        res.json({
            status: "success",
            info: { ticker: tickerStr, lote: loteNum },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        console.error(`\n[API ERROR] ❌ ${error.message}`);
        if (!res.headersSent) res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 TRADING BOARD PRO V38.5 ON`);
    console.log(`📡 Aguardando varredura de arquivos...`);
    DataOrchestrator.init();
});