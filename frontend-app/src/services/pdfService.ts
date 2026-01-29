import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * BOARDPRO PDF ENGINE - V2026.1
 * Estabilizado para captura de SVGs dinâmicos e múltiplas páginas.
 */
export const exportarPDF = async (nomeEstrategia: string) => {
  const elemento = document.getElementById('report-pdf-template');
  
  if (!elemento) {
    alert("Erro: Template de relatório não encontrado no sistema. Verifique se o componente está montado no DOM.");
    return false;
  }

  try {
    // 1. ESPERA DE RENDERIZAÇÃO
    // Aguarda um pequeno delay para garantir que os cálculos de useMemo 
    // e o SVG do gráfico tenham sido desenhados no DOM.
    await new Promise(resolve => setTimeout(resolve, 600));

    // 2. CAPTURA DO CANVAS
    const canvas = await html2canvas(elemento, {
      scale: 2,           // Aumenta a resolução para impressão
      useCORS: true,      // Permite carregar imagens/logos de outros domínios
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,   // Força a largura do template para o cálculo do canvas
      onclone: (clonedDoc) => {
        // Garante que o elemento clonado para o PDF esteja visível
        const el = clonedDoc.getElementById('report-pdf-template');
        if (el) el.style.display = 'block';
      }
    });

    // 3. CONFIGURAÇÃO DO PDF
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calcula a proporção da imagem capturada em relação à largura do A4
    const imgProps = pdf.getImageProperties(imgData);
    const totalContentHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = totalContentHeight;
    let position = 0;

    // 4. ADIÇÃO DE PÁGINAS (Loop de Clipping)
    // Adiciona a primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalContentHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Se o conteúdo for maior que uma página A4, adiciona as próximas
    while (heightLeft > 0) {
      position = heightLeft - totalContentHeight; 
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalContentHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    // 5. DOWNLOAD
    const fileName = `RELATORIO_${nomeEstrategia.toUpperCase().replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
    
    return true;
  } catch (err) {
    console.error("❌ [PDF_GENERATION_ERROR]:", err);
    alert("Ocorreu um erro técnico ao gerar o PDF. Verifique o console.");
    return false;
  }
};