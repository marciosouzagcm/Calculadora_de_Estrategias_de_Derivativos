import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Serviço de exportação de relatórios profissionais em PDF
 * Otimizado para nitidez extrema e contraste de fontes (Solução para letras fracas)
 */
export const exportarPDF = async (nomeEstrategia: string) => {
  const input = document.getElementById('report-pdf-template');
  
  if (!input) {
    console.error("Erro: Template do relatório não encontrado no DOM.");
    return;
  }

  try {
    // 1. Preparação para captura: Scroll ao topo evita áreas pretas/cortadas
    const originalScroll = window.scrollY;
    window.scrollTo(0, 0);

    // 2. Captura com Alta Densidade (DPI)
    const canvas = await html2canvas(input, {
      scale: 3, // Aumentado para 3x para garantir que textos pequenos fiquem nítidos
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff', // Força fundo branco
      windowWidth: 800,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('report-pdf-template');
        if (el) {
          el.style.display = 'block';
          // Força o contraste de cor preta em todos os textos no clone
          el.style.color = '#000000';
          const texts = el.querySelectorAll('*');
          texts.forEach((node) => {
            (node as HTMLElement).style.color = '#000000';
          });
        }
      }
    });

    window.scrollTo(0, originalScroll);

    // 3. Conversão para Imagem (JPEG oferece melhor renderização de texto chapado em PDF que o PNG em alguns visualizadores)
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // 4. Configuração do PDF A4
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Adiciona a imagem garantindo que ocupe a folha toda
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');

    // 5. Nome do Arquivo e Download
    const dataHora = new Date().toISOString().split('T')[0];
    const fileName = `TBPRO_Backup_${nomeEstrategia.replace(/\s+/g, '_')}_${dataHora}.pdf`;
    
    // Salva no computador (Downloads)
    pdf.save(fileName);

    /**
     * NOTA SOBRE O BACKUP NA PASTA 'uploads/arquivosPDF':
     * Para salvar automaticamente nessa pasta, você precisaria de um backend Node.js.
     * Exemplo de como enviar para o seu servidor futuramente:
     * * const pdfBlob = pdf.output('blob');
     * const formData = new FormData();
     * formData.append('file', pdfBlob, fileName);
     * await fetch('/api/backup-pdf', { method: 'POST', body: formData });
     */

    return true;
  } catch (err) {
    console.error("Falha ao gerar o PDF:", err);
    return false;
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}%`;
};