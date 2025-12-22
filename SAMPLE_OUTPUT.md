```text
C:\Users\DELL\Calculadora_de_Estrategias_de_Derivativos\src>ts-node index.ts

====================================================
    ANALISADOR DE ASSIMETRIA PROFISSIONAL V37.1
====================================================
Ativo: ITUB4
Preço Atual: 33,56
Risco Máximo: 0.20
Lote: 1000

>>> CATEGORIA: EXPLOSÃO

[#1] LONG STRADDLE (DÉBITO) | R:R Alvo: 0:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > O conjunto deve valorizar até: R$ 3.43/un

RESUMO FINANCEIRO:
  Vencimento: 2026-02-20 | ROI: ∞
  Lucro Máx Líq: ILIMITADO    | Risco Total: R$ 3.384,00
  Break-Even: 35.06 / 41.74

GREGAS (NET) & RISCO:
  Delta Net:   0.28 | Theta Net:  -0.0415
  STOP LOSS SUGERIDO: -R$ 1.736,00 (Incluindo reversão)

PERNAS:
  [C] | CALL  | ITUBB406   | STK:  38.40 | PRM: R$    2.49
  [C] | PUT   | ITUBN406   | STK:  38.40 | PRM: R$    0.85
--------------------------------------------------------------------------------

[#2] LONG STRADDLE (DÉBITO) | R:R Alvo: 0:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > O conjunto deve valorizar até: R$ 3.38/un

RESUMO FINANCEIRO:
  Vencimento: 2026-02-20 | ROI: ∞
  Lucro Máx Líq: ILIMITADO    | Risco Total: R$ 3.334,00
  Break-Even: 34.91 / 41.49

GREGAS (NET) & RISCO:
  Delta Net:   0.30 | Theta Net:  -0.0415
  STOP LOSS SUGERIDO: -R$ 1.711,00 (Incluindo reversão)

PERNAS:
  [C] | CALL  | ITUBB404   | STK:  38.20 | PRM: R$    2.57
  [C] | PUT   | ITUBN404   | STK:  38.20 | PRM: R$    0.72
--------------------------------------------------------------------------------

[#3] LONG STRANGLE (DÉBITO) | R:R Alvo: 0:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > O conjunto deve valorizar até: R$ 3.30/un

RESUMO FINANCEIRO:
  Vencimento: 2026-02-20 | ROI: ∞
  Lucro Máx Líq: ILIMITADO    | Risco Total: R$ 3.254,00
  Break-Even: 34.99 / 41.61

GREGAS (NET) & RISCO:
  Delta Net:   0.30 | Theta Net:  -0.0417
  STOP LOSS SUGERIDO: -R$ 1.671,00 (Incluindo reversão)

PERNAS:
  [C] | PUT   | ITUBN404   | STK:  38.20 | PRM: R$    0.72
  [C] | CALL  | ITUBB406   | STK:  38.40 | PRM: R$    2.49
--------------------------------------------------------------------------------

>>> CATEGORIA: ESTRUTURADAS

[#1] BULL PUT SPREAD (CRÉDITO) | R:R Alvo: 0.07:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > Recomprar a trava por no máximo: R$ 0.19/un

RESUMO FINANCEIRO:
  Vencimento: 2026-02-20 | ROI: 368.75%
  Lucro Máx Líq: R$ 236,00    | Risco Total: R$ 64,00
  Break-Even: 39.42

GREGAS (NET) & RISCO:
  Delta Net:   0.00 | Theta Net:  -0.0004
  STOP LOSS SUGERIDO: -R$ 280,00 (Incluindo reversão)

PERNAS:
  [V] | PUT   | ITUBN418   | STK:  39.70 | PRM: R$    1.50
  [C] | PUT   | ITUBN416   | STK:  39.40 | PRM: R$    1.22
--------------------------------------------------------------------------------

[#2] BEAR CALL SPREAD (CRÉDITO) | R:R Alvo: 0.11:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > Recomprar a trava por no máximo: R$ 0.09/un

RESUMO FINANCEIRO:
  Vencimento: 2026-02-20 | ROI: 212.50%
  Lucro Máx Líq: R$ 136,00    | Risco Total: R$ 64,00
  Break-Even: 38.88

GREGAS (NET) & RISCO:
  Delta Net:   0.00 | Theta Net:  -0.0001
  STOP LOSS SUGERIDO: -R$ 180,00 (Incluindo reversão)

PERNAS:
  [V] | CALL  | ITUBB409   | STK:  38.70 | PRM: R$    2.30
  [C] | CALL  | ITUBB411   | STK:  38.90 | PRM: R$    2.12
--------------------------------------------------------------------------------

[#3] BEAR CALL SPREAD (CRÉDITO) | R:R Alvo: 0.18:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão (Saída): R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > Recomprar a trava por no máximo: R$ 0.08/un

RESUMO FINANCEIRO:
  Vencimento: 2026-01-16 | ROI: 170.27%
  Lucro Máx Líq: R$ 126,00    | Risco Total: R$ 74,00
  Break-Even: 38.67

GREGAS (NET) & RISCO:
  Delta Net:  -0.01 | Theta Net:  -0.0004
  STOP LOSS SUGERIDO: -R$ 170,00 (Incluindo reversão)

PERNAS:
  [V] | CALL  | ITUBA407   | STK:  38.50 | PRM: R$    1.60
  [C] | CALL  | ITUBA409   | STK:  38.70 | PRM: R$    1.43
--------------------------------------------------------------------------------

=====================================================================================
             SUMÁRIO DE OPORTUNIDADES (RANKING DE ASSIMETRIA)
=====================================================================================
ESTRATÉGIA                  | R:R        | RISCO TOTAL     | LUCRO LÍQ
-------------------------------------------------------------------------------------
Bull Put Spread (Crédito)   | 0.07       | R$ 64,00        | R$ 236,00
Bear Call Spread (Crédito)  | 0.11       | R$ 64,00        | R$ 136,00
Bear Call Spread (Crédito)  | 0.18       | R$ 74,00        | R$ 126,00
Long Straddle (Débito)      | 0          | R$ 3.384,00     | ILIMITADO
Long Straddle (Débito)      | 0          | R$ 3.334,00     | ILIMITADO
Long Strangle (Débito)      | 0          | R$ 3.254,00     | ILIMITADO
=====================================================================================
Total de estratégias viáveis encontradas: 111
=====================================================================================
  ```