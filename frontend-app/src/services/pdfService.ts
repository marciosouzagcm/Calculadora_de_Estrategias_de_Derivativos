import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * BOARDPRO V2026.1 - PDF Engine
 * Otimizado para nitidez institucional e suporte a relatórios de alta densidade.
 */
export const exportarPDF = async (nomeEstrategia: string) => {
  const input = document.getElementById('report-pdf-template');
  
  if (!input) {
    console.error("❌ [PDF_ERROR] Template do relatório não encontrado no DOM.");
    return;
  }

  try {
    // 1. Preparação: Scroll ao topo para evitar cortes de renderização
    const originalScroll = window.scrollY;
    window.scrollTo(0, 0);

    // 2. Captura com Ultra-Densidade
    const canvas = await html2canvas(input, {
      scale: 2.5, // Equilíbrio perfeito entre nitidez e peso de arquivo
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      windowWidth: 850, // Ajustado para o novo layout de 850px do Template
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('report-pdf-template');
        if (el) {
          el.style.display = 'block';
          el.style.position = 'relative';
          el.style.left = '0';
          
          // Reforço de renderização para fontes e bordas
          const allElements = el.querySelectorAll('*');
          allElements.forEach((node) => {
            const htmlNode = node as HTMLElement;
            // Garante que o antialiasing de texto seja o melhor possível
            htmlNode.style.webkitFontSmoothing = 'antialiased';
            htmlNode.style.textShadow = 'none'; // Remove sombras que borram no PDF
          });
        }
      }
    });

    window.scrollTo(0, originalScroll);

    // 3. Conversão para Imagem (PNG preserva melhor o contraste de textos finos)
    const imgData = canvas.toDataURL('image/png');
    
    // 4. Configuração do PDF A4 Institucional
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true,
      floatPrecision: 16 // Aumenta a precisão do posicionamento
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Adiciona a imagem com compressão "FAST" para manter a performance, mas com alta qualidade
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // 5. Geração de nome de arquivo padronizado
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const fileName = `RELATORIO_ESTRUTURADO_${nomeEstrategia.toUpperCase().replace(/\s+/g, '_')}_${dataFormatada}.pdf`;
    
    pdf.save(fileName);

    console.log(`✅ [PDF_SUCCESS] Gerado: ${fileName}`);
    return true;
  } catch (err) {
    console.error("❌ [PDF_CRITICAL_FAIL] Falha ao processar canvas:", err);
    return false;
  }
};

/**
 * Formata valores para moeda brasileira (R$)
 */
export const formatCurrency = (value: number): string => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

/**
 * Formata porcentagens com sinal de tendência (+/-)
 */
export const formatPercentage = (value: number): string => {
  if (isNaN(value)) return '0,00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}%`;
};