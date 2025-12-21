```text
  C:\Users\DELL\Calculadora_de_Estrategias_de_Derivativos\src>ts-node index.ts

====================================================
   ANALISADOR DE ESTRATÉGIAS PROFISSIONAL V25
====================================================
Ativo (Ex: PETR4): ABEV3
Preço Atual do Ativo: 13,28
ROI Mínimo Desejado %: 30
Tamanho do Lote (Ex: 1000): 1000

[SUCESSO] Foram encontradas 6 estratégias para ABEV3:

[#1] LONG STRADDLE (DÉBITO) (STRADDLE)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: DÉBITO     | ROI: ∞ (ILIMITADO)
Delta Net:   0.00 | Theta Net:  -0.0145 | Taxa Total Operação: R$ 44,00
Break-Even Points: 11.85 / 13.55
Fluxo Inicial (Lote): -R$ 850,00 | Lucro Máx Líq: ILIMITADO
Risco Máximo Total:   R$ 894,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [C]     | CALL    | ABEVA134          |   12.70 |        0.76 | 0.00
  [C]     | PUT     | ABEVM134          |   12.70 |        0.09 | 0.00
--------------------------------------------------------------------------------

[#2] LONG STRANGLE (DÉBITO) (STRANGLE)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: DÉBITO     | ROI: ∞ (ILIMITADO)
Delta Net:   0.00 | Theta Net:  -0.0167 | Taxa Total Operação: R$ 44,00
Break-Even Points: 12.05 / 13.55
Fluxo Inicial (Lote): -R$ 650,00 | Lucro Máx Líq: ILIMITADO
Risco Máximo Total:   R$ 694,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [C]     | PUT     | ABEVM134          |   12.70 |        0.09 | 0.00
  [C]     | CALL    | ABEVA136          |   12.90 |        0.56 | 0.00
--------------------------------------------------------------------------------

[#3] BULL CALL SPREAD (DÉBITO) (VERTICAL CALL)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: DÉBITO     | ROI: 218.88%
Delta Net:  -0.04 | Theta Net:  -0.0066 | Taxa Total Operação: R$ 44,00
Break-Even Points: 13.44
Fluxo Inicial (Lote): -R$ 740,00 | Lucro Máx Líq: R$ 1.716,00
Risco Máximo Total:   R$ 784,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [C]     | CALL    | ABEVA134          |   12.70 |        0.76 | 0.00
  [V]     | CALL    | ABEVA158          |   15.20 |        0.02 | 0.04
--------------------------------------------------------------------------------

[#4] BULL PUT SPREAD (CRÉDITO) (VERTICAL PUT)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: CRÉDITO    | ROI: 141.78%
Delta Net:  -0.00 | Theta Net:  -0.0037 | Taxa Total Operação: R$ 44,00
Break-Even Points: 13.69
Fluxo Inicial (Lote): R$ 1.510,00 | Lucro Máx Líq: R$ 1.466,00
Risco Máximo Total:   R$ 1.034,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [V]     | PUT     | ABEVM158          |   15.20 |        1.60 | 0.00
  [C]     | PUT     | ABEVM134          |   12.70 |        0.09 | 0.00
--------------------------------------------------------------------------------

[#5] BEAR PUT SPREAD (DÉBITO) (VERTICAL PUT)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: DÉBITO     | ROI: 60.88%
Delta Net:   0.00 | Theta Net:   0.0037 | Taxa Total Operação: R$ 44,00
Break-Even Points: 13.69
Fluxo Inicial (Lote): -R$ 1.510,00 | Lucro Máx Líq: R$ 946,00
Risco Máximo Total:   R$ 1.554,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [C]     | PUT     | ABEVM158          |   15.20 |        1.60 | 0.00
  [V]     | PUT     | ABEVM134          |   12.70 |        0.09 | 0.00
--------------------------------------------------------------------------------

[#6] BEAR CALL SPREAD (CRÉDITO) (VERTICAL CALL)
--------------------------------------------------------------------------------
Vencimento: 2026-01-16   | Natureza: CRÉDITO    | ROI: 46.28%
Delta Net:   0.05 | Theta Net:   0.0058 | Taxa Total Operação: R$ 44,00
Break-Even Points: 13.44
Fluxo Inicial (Lote): R$ 740,00 | Lucro Máx Líq: R$ 696,00
Risco Máximo Total:   R$ 1.504,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [V]     | CALL    | ABEVA134          |   12.70 |        0.76 | 0.00
  [C]     | CALL    | ABEVA156          |   14.90 |        0.02 | 0.06
--------------------------------------------------------------------------------

C:\Users\DELL\Calculadora_de_Estrategias_de_Derivativos\src>
  ```