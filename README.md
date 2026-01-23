# ⚡ BoardPRO V2026.1 | Institutional Options Intelligence

<div align="center">

![Status](https://img.shields.io/badge/Status-Production--Ready-green?style=for-the-badge)
![Engine](https://img.shields.io/badge/Eine-Risk--Audited--V2-blue?style=for-the-badge)
![Audit](https://img.shields.io/badge/Audit-Real--Time--Margin-red?style=for-the-badge)
![TRL](https://img.shields.io/badge/TRL-7--8-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-purple?style=for-the-badge)

**Plataforma Quantitativa de Derivativos para o Mercado Brasileiro (B3)**

[📊 Demo](#-quick-start) • [📖 Documentação](#-arquitetura-técnica) • [💼 Planos](#-modelo-de-negócio--saas) • [🗺️ Roadmap](#️-roadmap-2026-2028)

</div>

---

> **"A diferença entre um trader e um profissional não é a busca pelo lucro, mas o controle implacável do risco real."**

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [O Salto Tecnológico](#-o-salto-tecnológico-versão-20261-audited-edition)
- [Diferenciais Estratégicos](#-diferenciais-estratégicos--auditoria)
- [Estratégias Implementadas](#-estratégias-implementadas)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Arquitetura Técnica](#-arquitetura-técnica)
- [Motor Quantitativo](#-motor-quantitativo-black-scholes-merton)
- [Quick Start](#-quick-start)
- [Modelo de Negócio](#-modelo-de-negócio--saas)
- [Roadmap](#️-roadmap-2026-2028)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **BoardPRO** é uma calculadora institucional de estratégias de derivativos desenvolvida especificamente para o mercado brasileiro (B3). Combina precisão quantitativa com usabilidade profissional, oferecendo:

- 🧮 **Motor Black-Scholes-Merton** adaptado para Base 252 (dias úteis brasileiros)
- 🛡️ **Sistema Vigilante V2** para auditoria de risco em tempo real
- 📊 **11 estratégias** de opções completamente implementadas
- 📄 **Relatórios PDF** white-label para assessores de investimento
- ⚡ **Scanner inteligente** de oportunidades com filtros configuráveis

---

## 💎 O Salto Tecnológico: Versão 2026.1 (Audited Edition)

O **BoardPRO** consolidou sua arquitetura de defesa. Na versão 2026.1, introduzimos o **Protocolo de Auditoria de Risco Real**, uma camada de inteligência que desmascara lucros ilusórios e garante que cada operação selecionada caiba no capital disponível (LIMIT) do usuário.

### Principais Avanços

| Recurso | V1 (Legacy) | V2026.1 (Audited) |
|---------|-------------|-------------------|
| Cálculo de Margem | Estimativa fixa | Dinâmico B3 (20% spot) |
| Filtro de Risco | Manual | Automático (Vigilante V2) |
| Payoff Visual | Estático | Interativo com gradientes |
| Auditoria | Ausente | Real-time pré-trade |
| Base de Cálculo | 365 dias | 252 dias úteis (B3) |

---

## 🧠 Diferenciais Estratégicos & Auditoria

### Engine de Risco Auditado
Cálculo dinâmico de capital em risco que diferencia travas de crédito/débito de vendas a seco, estimando margem B3 (20% do ativo) em tempo real.

```typescript
// Exemplo: Cálculo de Margem Real
const calculateRealMargin = (strategy: Strategy, spotPrice: number): MarginResult => {
  if (strategy.type === 'CREDIT_SPREAD') {
    return { margin: strategy.maxLoss, type: 'defined' };
  }
  if (strategy.type === 'NAKED_SELL') {
    return { margin: spotPrice * 0.20, type: 'variable' }; // Margem B3
  }
  return { margin: strategy.debit, type: 'defined' };
};
```

### Filtro Vigilante (V2)ng
Algoritmo de descarte automático que remove estratégias cujo **Risco Real Auditado** excede o teto financeiro configurado (LIMIT), protegendo o trader de chamadas de margem inesperadas.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO VIGILANTE V2                           │
├─────────────────────────────────────────────────────────────────┤
│  Estratégia → Cálculo Margem → Comparação LIMIT → Aprovação    │
│      ↓              ↓                ↓               ↓          │
│   Scanner    →  B3 20% Rule   →  User Config  →  ✅ ou ❌       │
└─────────────────────────────────────────────────────────────────┘
```

### Interactive Payoff v2.0
Gráficos compostos de alta precisão com marcação dinâmica de Strikes, Breakevens e zonas de sombra (Green/Red Gradient) para visualização imediata da zona de lucro.

### Deep Seek Ticker Engine
Busca inteligente de séries e símbolos em múltiplos níveis de aninhamento de API, garantindo estabilidade nos dados de entrada.

---

## 📈 Estratégias Implementadas

O BoardPRO oferece **11 estratégias** de opções totalmente implementadas e auditadas:

### Estratégias de Alta (Bullish)
| Estratégia | Tipo | Risco | Complexidade |
|------------|------|-------|--------------|
| 🟢 **Bull Call Spread** | Débito | Definido | ⭐⭐ |
| 🟢 **Bull Put Spread** | Crédito | Definido | ⭐⭐ |
| 🟢 **Call Comprada** | Débito | Definido | ⭐ |

### Estratégias de Baixa (Bearish)
| Estratégia | Tipo | Risco | Complexidade |
|------------|------|-------|--------------|
| 🔴 **Bear Call Spread** | Crédito | Definido | ⭐⭐ |
| 🔴 **Bear Put Spread** | Débito | Definido | ⭐⭐ |
| 🔴 **Put Comprada** | Débito | Definido | ⭐ |

### Estratégias Neutras (Market Neutral)
| Estratégia | Tipo | Risco | Complexidade |
|------------|------|-------|--------------|
| ⚪ **Iron Condor** | Crédito | Definido | ⭐⭐⭐ |
| ⚪ **Iron Butterfly** | Crédito | Definido | ⭐⭐⭐ |
| ⚪ **Short Straddle** | Crédito | Ilimitado* | ⭐⭐⭐⭐ |
| ⚪ **Short Strangle** | Crédito | Ilimitado* | ⭐⭐⭐⭐ |

### Estratégias de Volatilidade
| Estratégia | Tipo | Risco | Complexidade |
|------------|------|-------|--------------|
| 🟣 **Long Straddle** | Débito | Definido | ⭐⭐ |
| 🟣 **Long Strangle** | Débito | Definido | ⭐⭐ |

> *Estratégias com risco ilimitado são automaticamente sinalizadas pelo **Vigilante V2** e requerem margem B3 de 20% do spot.

---

## 🛠️ Stack Tecnológica

<div align="center">

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18 • Vite • TypeScript • Recharts • TailwindCSS |
| **Backend** | Node.js • Express • TypeScript • Vercel Edge Functions |
| **Database** | TiDB Cloud (MySQL-compatible) • Firebase Auth |
| **Deploy** | Vercel (Frontend + Edge) • TiDB Serverless |
| **Qualidade** | ESLint • Prettier • Vitest • GitHub Actions |

</div>

### Arquitetura de Diretórios

```
BoardPRO/
├── src/
│   ├── components/         # Componentes React reutilizáveis
│   │   ├── ui/             # Design System (shadcn/ui)
│   │   ├── calculator/     # Módulos da calculadora
│   │   └── charts/         # Visualizações de payoff
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilitários e helpers
│   ├── pages/              # Páginas da aplicação
│   ├── services/           # Camada de serviços
│   │   ├── market/         # MarketDataService
│   │   ├── pricing/        # Black-Scholes Engine
│   │   └── risk/           # Vigilante V2
│   └── types/              # TypeScript definitions
├── api/                    # Vercel Edge Functions
├── docs/                   # Documentação técnica
└── tests/                  # Suítes de teste
```

---

## 🏗️ Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOARDPRO ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   React     │    │   Vite      │    │  Recharts   │    │  TailwindCSS│   │
│  │   Frontend  │◄──►│   Builder   │◄──►│   Charts    │◄──►│   Styling   │   │
│  └──────┬──────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      SERVICE LAYER (TypeScript)                      │    │
│  ├─────────────────┬─────────────────┬─────────────────────────────────┤    │
│  │ MarketDataSvc   │  PricingEngine  │     RiskAuditService            │    │
│  │ • Ticker Search │  • BSM Model    │     • Vigilante V2              │    │
│  │ • Quote Fetch   │  • Greeks Calc  │     • Margin Estimation         │    │
│  │ • Series Map    │  • IV Solver    │     • Position Validation       │    │
│  └────────┬────────┴────────┬────────┴──────────────┬──────────────────┘    │
│           │                 │                       │                        │
│           ▼                 ▼                       ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    EDGE FUNCTIONS (Vercel)                           │    │
│  │  /api/market  │  /api/calculate  │  /api/scan  │  /api/report       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              PERSISTENCE LAYER                                       │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │    │
│  │  │  TiDB Cloud │    │  Firebase   │    │   Cache     │              │    │
│  │  │  (MySQL)    │    │  Auth       │    │   (Edge)    │              │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Motor Quantitativo: Black-Scholes-Merton

O coração do BoardPRO é o motor de precificação **Black-Scholes-Merton** adaptado para as particularidades do mercado brasileiro:

### Fórmulas Implementadas

#### Precificação de Call
```
C = S₀ × N(d₁) - K × e^(-r×T) × N(d₂)
```

#### Precificação de Put
```
P = K × e^(-r×T) × N(-d₂) - S₀ × N(-d₁)
```

#### Parâmetros d₁ e d₂
```
d₁ = [ln(S₀/K) + (r + σ²/2) × T] / (σ × √T)
d₂ = d₁ - σ × √T
```

### Adaptação Base 252

O mercado brasileiro opera com **252 dias úteis** anuais. O BoardPRO converte automaticamente:

```typescript
// Conversão para Base 252
const calculateTimeToExpiry = (expirationDate: Date): number => {
  const businessDays = countBusinessDays(new Date(), expirationDate);
  return businessDays / 252; // Base 252 brasileira
};
```

### Greeks Calculados

| Greek | Símbolo | Descrição | Uso |
|-------|---------|-----------|-----|
| **Delta** | Δ | Sensibilidade ao preço | Hedge ratio |
| **Gamma** | Γ | Taxa de mudança do Delta | Risco de gap |
| **Theta** | Θ | Decaimento temporal | Time decay |
| **Vega** | ν | Sensibilidade à volatilidade | Vol trading |
| **Rho** | ρ | Sensibilidade à taxa de juros | Rate risk |

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta TiDB Cloud (opcional para persistência)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/marciosouzagcm/Calculadora_de_Estrategias_de_Derivativos.git

# Entre no diretório
cd Calculadora_de_Estrategias_de_Derivativos

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

```env
# API Keys
VITE_MARKET_API_KEY=your_market_data_key
VITE_FIREBASE_API_KEY=your_firebase_key

# Database
TIDB_HOST=your_tidb_host
TIDB_USER=your_tidb_user
TIDB_PASSWORD=your_tidb_password

# Features
VITE_ENABLE_VIGILANTE=true
VITE_ENABLE_PDF_EXPORT=true
```

### Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run test         # Executa testes
npm run lint         # Verifica linting
npm run type-check   # Verifica tipos TypeScript
```

---

## 💼 Modelo de Negócio & SaaS

O BoardPRO foi desenhado para ser escalado como uma plataforma de serviços profissionais:

### Estrutura de Planos

| Plano | Público | Preço/mês | Funcionalidades |
|-------|---------|-----------|-----------------|
| 🆓 **Free** | Entusiastas | R$ 0 | 3 cálculos/dia, estratégias básicas |
| 🟢 **Starter** | Traders iniciantes | R$ 47 | 50 cálculos/dia, 6 estratégias |
| 🔵 **Trader** | Day traders | R$ 97 | Ilimitado, todas estratégias, Vigilante V2 |
| 🟣 **Pro** | Profissionais | R$ 197 | + Scanner, PDF Export, Greeks avançados |
| 🟡 **AAI** | Assessores | R$ 497 | + White-label, Multi-cliente, API básica |
| 🔴 **Enterprise** | Institucionais | Sob consulta | API completa, SLA, Suporte dedicado |

### Projeção de Receita (Cenário Conservador)

```
┌────────────────────────────────────────────────────────────────┐
│                    PROJEÇÃO MRR (12 meses)                      │
├────────────────────────────────────────────────────────────────┤
│  Mês 1-3:   R$ 5.000 - R$ 15.000  (Early adopters)             │
│  Mês 4-6:   R$ 20.000 - R$ 40.000 (Crescimento orgânico)       │
│  Mês 7-9:   R$ 50.000 - R$ 80.000 (Parcerias AAI)              │
│  Mês 10-12: R$ 100.000+           (Escala + Enterprise)        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Roadmap 2026-2028

### Q1 2026 - Fundação ✅
- [x] Motor BSM Base 252
- [x] 11 estratégias implementadas
- [x] Sistema Vigilante V2
- [x] Geração de PDF

### Q2 2026 - Expansão 🔄
- [ ] Integração dados real-time (B3/Bloomberg)
- [ ] Sistema de pagamentos (Stripe)
- [ ] Dashboard de usuário
- [ ] Mobile-responsive completo

### Q3-Q4 2026 - Monetização
- [ ] Lançamento planos pagos
- [ ] Programa de afiliados AAI
- [ ] API pública v1.0
- [ ] Backtesting histórico

### 2027 - Escala
- [ ] Machine Learning para IV prediction
- [ ] Suporte a mercados internacionais
- [ ] App mobile nativo
- [ ] Certificação CVM/ANBIMA

### 2028 - Consolidação
- [ ] IPO ou M&A readiness
- [ ] Expansão LATAM
- [ ] Hedge fund partnerships

---

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia nosso guia de contribuição antes de submeter PRs.

### Como Contribuir

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- 80%+ code coverage

---

## 📞 Suporte & Contato

- 📧 **Email:** contato@boardpro.com.br
- 💬 **Discord:** [BoardPRO Community](https://discord.gg/boardpro)
- 📱 **LinkedIn:** [BoardPRO](https://linkedin.com/company/boardpro)
- 🐦 **Twitter:** [@BoardPRO_br](https://twitter.com/boardpro_br)

---

## 📄 Licença

Este projeto é proprietário e protegido por direitos autorais.

```
Copyright © 2026 BoardPRO - Marcio Souza
Todos os direitos reservados.

Este software é propriedade exclusiva de Marcio Souza.
Uso, cópia, modificação ou distribuição não autorizados
são estritamente proibidos.
```

---

<div align="center">

**Feito com 💚 para o mercado brasileiro de derivativos**

[![BoardPRO](https://img.shields.io/badge/BoardPRO-V2026.1-green?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+)](https://boardpro.com.br)

*Transformando dados em decisões. Desde 2026.*

</div>
