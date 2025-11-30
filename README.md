# 📈 Calculadora de Estratégias de Derivativos

Uma aplicação robusta em **TypeScript** para cálculo, análise e otimização de estratégias com opções financeiras. Refatoração de um script Python com arquitetura modular e baseada em POO.

---

## 🎯 Objetivo do Projeto

Carregar dados de opções (arquivo CSV), identificar montagens válidas de estratégias e calcular métricas financeiras essenciais para suportar decisões de investimento.

**Estratégias suportadas:**
- Spreads Verticais (Bull/Bear Call/Put)
- Butterfly Spreads (Long Call/Put)
- Straddle Spreads (Long/Short)

---

## 📊 Métricas Financeiras Calculadas

| Métrica | Descrição |
|---------|-----------|
| **Prêmio Líquido** | Custo ou receita total da montagem |
| **Fluxo de Caixa** | P/L real no início, descontando taxas |
| **Lucro Máximo** | Ganho teórico máximo da estratégia |
| **Risco Máximo** | Prejuízo teórico máximo (drawdown) |
| **Breakevens** | Preços onde o P/L é zero |
| **Gregas Líquidas** | Delta, Gamma, Theta, Vega agregados (Black-Scholes) |
| **Score de Otimização** | Métrica Risco/Retorno ajustada por probabilidade |

---

## 📚 Conceitos Essenciais

### O que são Opções?

Derivativos que conferem ao titular o direito (não obrigação) de comprar ou vender um ativo subjacente a um preço predeterminado (Strike) em data específica (Vencimento).

- ** CALL **: Opção de compra
- ** PUT  **: Opção de venda

### Estratégias com Opções

Combinação de duas ou mais operações para atingir um perfil de risco/recompensa específico.

- **Spreads Verticais (Travas)**: Combinam compra e venda com Strikes diferentes. Risco e lucro limitados.
- **Butterfly**: Estratégia neutra para baixa volatilidade.
- **Straddle**: Estratégia para alta volatilidade (movimento esperado do preço).

---

## 🗂️ Arquitetura do Código

```
src/
├── interfaces/
│   ├── Derivative.ts       # Tipagens: OptionLeg, StrategyMetrics, Greeks
│   └── IStrategy.ts        # Interface base para estratégias
├── services/
│   ├── BlackScholesModel.ts     # Cálculo teórico de preço e Gregas
│   ├── StrategyFilter.ts        # Filtragem por critérios (Delta, Prêmio)
│   ├── OptionsDataProcessor.ts  # Leitura e limpeza do CSV
│   └── PayoffCalculator.ts      # Orquestração de cálculos
├── strategies/
│   ├── VerticalSpread.ts        # Bull/Bear Call/Put Spreads
│   ├── ButterflySpread.ts       # Long Call/Put Butterfly
│   └── StraddleSpread.ts        # Long/Short Straddle
├── utils/
│   └── FinancialUtils.ts        # Funções matemáticas e utilitárias
├── index.ts                     # Ponto de entrada
└── firebase.ts                  # Configuração Firebase (opcional)
tests/
└── strategies.test.ts           # Testes unitários com dados mockados
```

### Descrição dos Arquivos Chave

| Arquivo | Responsabilidade |
|---------|------------------|
| `Derivative.ts` | Define tipos: OptionLeg, StrategyMetrics, Greeks |
| `IStrategy.ts` | Interface base — todas as estratégias implementam `calculateMetrics(spotPrice)` |
| `BlackScholesModel.ts` | Preço teórico e Gregas (Delta, Gamma, Theta, Vega) de uma opção |
| `StrategyFilter.ts` | Refina estratégias por Delta líquido e prêmio máximo |
| `OptionsDataProcessor.ts` | I/O: lê `opcoes_final_tratado.csv` e valida dados |
| `PayoffCalculator.ts` | Orquestrador: busca montagens, calcula todas as estratégias, identifica breakevens |
| `FinancialUtils.ts` | Funções auxiliares (dias úteis, cálculos matemáticos) |
| `index.ts` | Fluxo principal, interação com usuário, relatório final |

---

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js (v16+)
- npm ou yarn

### Passo 1: Instalar Dependências

```bash
npm install
```

### Passo 2: Preparar Dados

Certifique-se de que o arquivo **`opcoes_final_tratado.csv`** está na raiz do projeto:

```
c:\Users\DELL\Calculadora_de_Estrategias_de_Derivativos\
└── opcoes_final_tratado.csv
```

### Passo 3: Compilar TypeScript

```bash
npm run build
# ou
tsc
```

### Passo 4: Executar

```bash
node dist/index.js
```

O aplicativo solicitará:
1. **Ticker** do ativo (ex: PETR4)
2. **Tipo de estratégia** (VerticalSpread, ButterflySpread, StraddleSpread)

---

## 📦 Scripts Disponíveis

```json
{
  "build": "tsc",
  "dev": "ts-node src/index.ts",
  "test": "jest"
}
```

**Execução rápida (sem compilação):**
```bash
npm run dev
```

---

## 🧪 Testes

Testes unitários validam a precisão dos cálculos com dados mockados:

```bash
npm test
```

Arquivo de testes: `tests/strategies.test.ts`

---

## 📖 Exemplo de Saída

```
╔════════════════════════════════════════════╗
║   ANÁLISE DE ESTRATÉGIA - PETR4            ║
╚════════════════════════════════════════════╝

Estratégia: Bull Call Spread
Prêmio Líquido: R$ -150,00
Lucro Máximo: R$ 350,00
Risco Máximo: R$ 150,00
Breakevens: [101.50, 108.50]
Delta Líquido: 0.45
Score: 8.7/10
```

---

## 📝 Notas Importantes

- Os cálculos de Gregas utilizam o modelo **Black-Scholes** para precisão teórica.
- A aplicação assume **opções estilo europeu** (exercício apenas no vencimento).
- Taxas e custos operacionais são considerados no fluxo de caixa.
- O arquivo CSV deve conter colunas: `ticker`, `strike`, `type`, `price`, `expiration`.

---

## 🚀 Próximas Melhorias

- [ ] Suporte a mais estratégias (Iron Condor, Ratio Spread)
- [ ] Interface web com React/TypeScript
- [ ] Integração com APIs de cotações em tempo real
- [ ] Dashboard de análise interativa
- [ ] Exportação de relatórios (PDF/Excel)

---

## 📧 Suporte

Para dúvidas ou sugestões, abra uma issue ou entre em contato.

---

# Como executar (resumo rápido)

- Erro comum: "Cannot find module './optimization_core.js'" ocorre quando você tenta executar um arquivo .js que não existe. Soluções:
  1. Executar o TypeScript diretamente com ts-node (sem compilar):
     - npm run process-csv            # executa src/processador_opcoes.ts
     - npm run optimize-ts           # tenta executar src/optimization_core.ts (crie o arquivo .ts se necessário)
  2. Compilar e executar com node:
     - npm run build
     - node dist/processador_opcoes.js
     - node dist/optimization_core.js  (após criar/compilar)

- Se quiser abrir a interface HTML local (options_analyzer.html):
  - Sirva a pasta por HTTP (recomendado): npm i -g serve && serve . 
  - Ou use o botão "Carregar CSV" na UI para importar o arquivo opcoes_final_tratado.csv gerado localmente.

Notas:
- Se `src/optimization_core.ts` não existir, crie-o (ou altere o script "optimize-ts" para o caminho correto).
- Evite executar: `ts-node optimization_core.js` — chame o arquivo correto (com extensão .ts) ou use node em arquivos compilados em `dist/`.

---

## Comandos rápidos (execute a partir da raiz do projeto)

- Gerar o CSV usando o processador (sem compilar):
```bash
npm run process-csv
# equivalente a: npx ts-node src/processador_opcoes.ts
```

- Servir a pasta `src` por HTTP (para evitar problemas de CORS ao abrir options_analyzer.html):
```bash
npm run serve-src
# abre src/ em http://localhost:5174 (usa npx serve)
```

- Compilar e executar (opcional):
```bash
npm run build
node dist/processador_opcoes.js
```

Observações:
- Não execute `npm run ...` dentro de `src/`. Abra um terminal na raiz do projeto (`c:\Users\DELL\Calculadora_de_Estrategias_de_Derivativos`) antes de rodar os comandos.
- Se preferir carregar o CSV sem servidor, use o botão "Carregar CSV" na UI (input file) e selecione `opcoes_final_tratado.csv` gerado pelo processador.

---

**Licença:** ISC  
**Versão:** 1.0.0
