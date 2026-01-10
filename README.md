# BoardPRO — Calculadora de Estratégias de Derivativos (V38.5)

> "A volatilidade não é um risco a ser evitado, mas uma variável a ser precificada. No BoardPRO, nós não adivinhamos o mercado; nós calculamos a probabilidade de vitória."

## Visão Geral

BoardPRO V38.5 traz foco em estabilidade e integridade na comunicação entre o motor de cálculo e o TiDB Serverless. Esta versão prioriza disponibilidade, seguimiento contínuo e precisão nos cálculos de grego e decaimento temporal.

## Diferenciais Implementados

- **Conectividade Blindada:** Pool de conexões com Keep-Alive e gestão de timeouts, otimizada para latência de bancos em nuvem.
- **Monitoramento Ativo (Health Check):** Autodiagnóstico que verifica integridade da API e do banco em tempo real.
- **Scanner de 11 Setups:** Processamento concorrente das principais estratégias, filtrando apenas assimetrias com *Score A+*.
- **Base 252 Real-Time:** Cálculo de gregas e decréscimo temporal (Theta) com base no calendário oficial de dias úteis da B3.

## Inventário de Estratégias Consolidadas

- **Butterfly (Borboleta)** — Alvo de preço cirúrgico; filtro de largura de asa para evitar ROI inflado por falta de liquidez.
- **Iron Condor** — Renda em lateralização; cálculo de margem por "Asa Dominante" para otimização de capital.
- **Calendar Spread** — Arbitragem de tempo; gestão de decaimento (Theta) em estruturas horizontais.
- **Travas (Alta/Baixa)** — Direcional com risco definido; cálculo automático de break-even e lucro líquido pós-taxas.

## Engenharia de Proteção & UX

- **Logs Estruturados:** Rastreamento de erros com timestamps para auditoria e análise de performance.
- **Relatórios PDF Profissionais:** Geração de documentos técnicos detalhados para registro e compartilhamento.
- **Fricção Operacional Real:** Resultados descontam taxas e custos operacionais por perna, refletindo valores reais.

## Roadmap (resumo)

- v38.5 — Estabilidade TiDB & Scanner 11 (atual)
- v39.0 — Expansão de estratégias (Booster/Rochedo)
- v40.0 — Automação de Market Data Streaming
- vX.Y — Superfície de Volatilidade Dinâmica (projetado)

## Exemplo de Output

```text
[API] 🔍 Buscando Top 11 para: PETR4 (Lote: 1000)
[DB]  ✅ Conexão TiDB: OK | Monitoramento Ativo
------------------------------------------------------
ESTRATÉGIA: BUTTERFLY (BORBOLETA)
STATUS: ● SCORE A+ (ASSIMETRIA VALIDADA)
ROI LÍQUIDO: 719.5% | LUCRO LÍQUIDO: R$ 1.698,00
VENCIMENTO: 20/02/2026
------------------------------------------------------
```

## Disclaimer Técnico

Este software é uma ferramenta de suporte à decisão baseada em modelos estocásticos. Operar derivativos envolve riscos. O BoardPRO fornece a estatística; a decisão final e a gestão de risco são responsabilidade do operador.

---

© 2026 BoardPRO — Mantido com rigor matemático por Marcio Souza.