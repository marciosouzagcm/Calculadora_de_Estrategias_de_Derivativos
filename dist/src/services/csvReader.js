export function parseOptionsDump(rawText) {
    // Divide o texto em linhas
    const lines = rawText.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => {
        // Regex para capturar os blocos de dados baseados no seu dump
        // O segredo está em separar o ID inicial do Ticker do Ativo
        const parts = line.trim().split(/\s+/);
        if (parts.length < 10)
            return null;
        // Limpeza do Ativo: Remove números iniciais (ID) do ticker BOVA11
        const rawAtivo = parts[0];
        const ativoBase = rawAtivo.replace(/^\d+/, ''); // Transforma "1BOVA11" em "BOVA11"
        const optionTicker = parts[1];
        const vencimento = parts[2];
        const diasUteis = parseInt(parts[3]);
        const tipo = parts[4];
        // Conversão Numérica com ajuste de escala para BOVA11
        const parseNum = (val) => parseFloat(val.replace(',', '.'));
        let strike = parseNum(parts[5]);
        const premio = parseNum(parts[6]);
        // Ajuste automático: strikes de BOVA11 no dump vêm como 15.30 (deveria ser 153.00)
        if (ativoBase.includes('BOVA11') && strike < 100) {
            strike = strike * 10;
        }
        const greeks = {
            delta: parseNum(parts[8]),
            gamma: parseNum(parts[9]),
            theta: parseNum(parts[10]),
            vega: parseNum(parts[11])
        };
        return {
            ativo_subjacente: ativoBase,
            option_ticker: optionTicker,
            vencimento,
            dias_uteis: diasUteis,
            tipo,
            strike,
            premio,
            vol_implicita: parseNum(parts[7]),
            gregas_unitarias: greeks,
            multiplicador_contrato: 100
        };
    }).filter((item) => item !== null);
}
