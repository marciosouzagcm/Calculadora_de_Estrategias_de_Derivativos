// src/services/BlackScholes.ts
export class BlackScholes {
    /**
     * Função de Distribuição Normal Acumulada (CND)
     * Aproximação de alta precisão para o modelo Black-Scholes
     */
    static cnd(x) {
        const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, a4 = -1.821255978, a5 = 1.330274429;
        const L = Math.abs(x);
        const K = 1.0 / (1.0 + 0.2316419 * L);
        let d = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
        return x < 0 ? 1.0 - d : d;
    }
    /**
     * Função de Densidade de Probabilidade (Normal)
     */
    static nd(x) {
        return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    }
    /**
     * Cálculo do d1 (Probabilidade de exercício no dinheiro)
     */
    static getD1(s, k, t, v, r) {
        if (v <= 0 || t <= 0 || s <= 0 || k <= 0)
            return 0;
        return (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    }
    /**
     * CÁLCULO DO PREÇO TEÓRICO (Essencial para a Fase 4)
     * @param s Spot Price (Preço da Ação)
     * @param k Strike Price
     * @param t Time to Maturity (em anos, ex: 20/252)
     * @param v Volatilidade (ex: 0.35 para 35%)
     * @param r Taxa Livre de Risco (Selic)
     */
    static calculatePrice(s, k, t, v, r = 0.1075, type) {
        // Se já venceu, retorna o valor intrínseco
        if (t <= 0) {
            return type === 'CALL' ? Math.max(0, s - k) : Math.max(0, k - s);
        }
        const d1 = this.getD1(s, k, t, v, r);
        const d2 = d1 - v * Math.sqrt(t);
        if (type === 'CALL') {
            return s * this.cnd(d1) - k * Math.exp(-r * t) * this.cnd(d2);
        }
        else {
            return k * Math.exp(-r * t) * this.cnd(-d2) - s * this.cnd(-d1);
        }
    }
    static calculateDelta(s, k, t, v, r = 0.1075, type) {
        if (t <= 0)
            return (type === 'CALL' && s > k) || (type === 'PUT' && s < k) ? 1 : 0;
        const d1 = this.getD1(s, k, t, v, r);
        return type === 'CALL' ? this.cnd(d1) : this.cnd(d1) - 1;
    }
    static calculateGamma(s, k, t, v, r = 0.1075) {
        if (s <= 0 || v <= 0 || t <= 0)
            return 0;
        const d1 = this.getD1(s, k, t, v, r);
        return this.nd(d1) / (s * v * Math.sqrt(t));
    }
    static calculateVega(s, k, t, v, r = 0.1075) {
        if (s <= 0 || v <= 0 || t <= 0)
            return 0;
        const d1 = this.getD1(s, k, t, v, r);
        return (s * Math.sqrt(t) * this.nd(d1)) / 100;
    }
    static calculateTheta(s, k, t, v, r = 0.1075, type) {
        if (s <= 0 || v <= 0 || t <= 0)
            return 0;
        const d1 = this.getD1(s, k, t, v, r);
        const d2 = d1 - v * Math.sqrt(t);
        const term1 = -(s * v * this.nd(d1)) / (2 * Math.sqrt(t));
        const term2 = r * k * Math.exp(-r * t);
        if (type === 'CALL') {
            const thetaAnual = term1 - term2 * this.cnd(d2);
            return thetaAnual / 252;
        }
        else {
            const thetaAnual = term1 + term2 * this.cnd(-d2);
            return thetaAnual / 252;
        }
    }
}
