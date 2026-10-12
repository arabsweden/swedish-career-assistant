import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdfFromHtmlElement = async (target: string | HTMLElement, fileName: string) => {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
        console.error(`Element not found for PDF generation.`);
        return;
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // High resolution scale for clean, sharp printed text
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Convert canvas height to PDF height matching A4 width
        const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;
        }

        pdf.save(fileName);
    } catch (error) {
        console.error('Error generating PDF from HTML element:', error);
    }
};

export const generatePdfFromText = async (text: string, fileName: string) => {
    // Create a temporary off-screen container styled exactly like an elegant A4 sheet
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '595px';
    container.style.minHeight = '842px';
    container.style.padding = '40px 48px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1f2937';
    container.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    container.style.lineHeight = '1.6';
    container.style.fontSize = '13px';
    // Match the layout direction of the content (auto detect Arabic RTL)
    const isArabic = /[\u0600-\u06FF]/.test(text);
    if (isArabic) {
        container.style.direction = 'rtl';
        container.style.textAlign = 'right';
    } else {
        container.style.direction = 'ltr';
        container.style.textAlign = 'left';
    }
    
    const lines = text.split('\n');
    let htmlContent = '';
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
            htmlContent += '<div style="height: 12px;"></div>';
        } else if (line.startsWith('# ')) {
            const cleanText = trimmed.substring(2).replace(/\*\*/g, '').trim();
            htmlContent += `<h1 style="font-size: 22px; font-weight: bold; color: #1e40af; margin-top: 16px; margin-bottom: 8px; tracking: -0.025em; line-height: 1.2;">${cleanText}</h1>`;
        } else if (line.startsWith('## ')) {
            const cleanText = trimmed.substring(3).replace(/\*\*/g, '').trim();
            htmlContent += `<div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">
                <h2 style="font-size: 12px; font-weight: bold; color: #1e40af; letter-spacing: 0.05em; text-transform: uppercase;">${cleanText}</h2>
            </div>`;
        } else if (line.startsWith('### ')) {
            const cleanText = trimmed.substring(4).replace(/\*\*/g, '').trim();
            htmlContent += `<h3 style="font-size: 11px; font-weight: bold; color: #1f2937; margin-top: 8px; margin-bottom: 4px;">${cleanText}</h3>`;
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            const cleanText = trimmed.replace(/^([-*•]\s+)/, '').replace(/\*\*/g, '').trim();
            htmlContent += `<div style="display: flex; align-items: start; gap: 6px; font-size: 10px; color: #374151; padding-left: 12px; margin-bottom: 4px;">
                <span style="color: #1e40af; select-none: none;">•</span>
                <span>${cleanText}</span>
            </div>`;
        } else {
            const isBold = trimmed.startsWith('**') && trimmed.endsWith('**');
            const cleanText = trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim();
            htmlContent += `<p style="font-size: 10px; color: #374151; margin: 0 0 4px 0; ${isBold ? 'font-weight: bold; color: #111827;' : ''}">${cleanText}</p>`;
        }
    });
    
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    
    try {
        await generatePdfFromHtmlElement(container, fileName);
    } finally {
        document.body.removeChild(container);
    }
};
