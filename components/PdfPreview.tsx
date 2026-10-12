import React from 'react';
import type { CVData } from '../types';
import type { Language } from '../translations';
import { useI18n } from '../useI18n';

interface PdfPreviewProps {
  cvData: CVData;
  generatedCv: string;
  language: Language;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ cvData, generatedCv, language }) => {
  const { t } = useI18n();

  const renderFromText = (text: string) => {
    const rawLines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const trimmed = rawLine.trim();

      if (trimmed.length === 0) {
        elements.push(<div key={`empty-${i}`} className="h-3.5" />);
        continue;
      }

      // H1 Header (e.g. # Name)
      if (rawLine.startsWith('# ')) {
        const cleanText = trimmed.substring(2).replace(/\*\*/g, '').trim();
        elements.push(
          <h1 key={`h1-${i}`} className="text-[20px] font-bold text-[#1e40af] mt-4 mb-2 tracking-tight">
            {cleanText}
          </h1>
        );
        continue;
      }

      // H2 Header (e.g. ## Experience)
      if (rawLine.startsWith('## ')) {
        const cleanText = trimmed.substring(3).replace(/\*\*/g, '').trim();
        elements.push(
          <div key={`h2-container-${i}`} className="w-full mt-4 mb-2">
            {elements.length > 0 && <hr className="border-t border-slate-300 my-2.5" />}
            <h2 className="text-[12px] font-bold text-[#1e40af] tracking-wide uppercase">
              {cleanText}
            </h2>
          </div>
        );
        continue;
      }

      // H3 Header (e.g. ### Senior Developer)
      if (rawLine.startsWith('### ')) {
        const cleanText = trimmed.substring(4).replace(/\*\*/g, '').trim();
        elements.push(
          <h3 key={`h3-${i}`} className="text-[11px] font-bold text-gray-800 mt-2 mb-1">
            {cleanText}
          </h3>
        );
        continue;
      }

      // Bullet Point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const cleanText = trimmed.replace(/^([-*•]\s+)/, '').replace(/\*\*/g, '').trim();
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-1.5 text-[10px] text-gray-700 pl-3 leading-normal">
            <span className="text-[#1e40af] mt-0.5 text-[10px] select-none">•</span>
            <span>{cleanText}</span>
          </div>
        );
        continue;
      }

      // Normal text / paragraph lines
      const isBoldLine = trimmed.startsWith('**') && trimmed.endsWith('**');
      const cleanText = trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      elements.push(
        <p
          key={`p-${i}`}
          className={`text-[10px] leading-relaxed ${
            isBoldLine ? 'font-bold text-gray-900' : 'text-gray-700'
          }`}
        >
          {cleanText}
        </p>
      );
    }

    return elements;
  };

  const renderFromCvData = () => {
    const { personalInfo, experience, education, skills } = cvData;
    
    // Parse personal info
    const personalLines = personalInfo.trim().split('\n');
    const name = personalLines.shift() || 'Your Name';

    let contactLines: string[] = [];
    let summary = '';

    const summaryIndex = personalLines.findIndex(line => line.trim().toLowerCase().startsWith('summary:'));
    const emptyLineIndex = personalLines.findIndex(line => line.trim() === '');
    
    let summaryStartIndex = -1;
    if (summaryIndex !== -1) {
        summaryStartIndex = summaryIndex;
    } else if (emptyLineIndex !== -1) {
        summaryStartIndex = emptyLineIndex;
    }

    if (summaryStartIndex !== -1) {
        contactLines = personalLines.slice(0, summaryStartIndex).filter(line => line.trim() !== '');
        summary = personalLines.slice(summaryStartIndex).join('\n').replace(/summary:/i, '').trim();
    } else {
        contactLines = personalLines.filter(line => line.trim() !== '');
    }

    const renderSection = (title: string, content: string) => {
      if (!content.trim()) return null;
      
      const lines = content.trim().split('\n');
      return (
        <div className="w-full mt-4">
          <hr className="border-t border-slate-300 my-2" />
          <h2 className="text-[12px] font-bold text-[#1e40af] tracking-wide uppercase mb-2">
            {title.toUpperCase()}
          </h2>
          <div className="space-y-1.5">
            {lines.map((line, idx) => {
              if (!line.trim()) {
                return <div key={idx} className="h-1.5" />;
              }
              const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
              const textStr = isBullet ? line.substring(1).trim() : line.trim();
              
              if (isBullet) {
                return (
                  <div key={idx} className="flex items-start gap-1.5 text-[10px] text-gray-700 pl-3 leading-normal">
                    <span className="text-[#1e40af] mt-0.5 select-none">•</span>
                    <span>{textStr}</span>
                  </div>
                );
              } else {
                return (
                  <p key={idx} className="text-[10px] font-bold text-gray-900 mt-1">
                    {textStr}
                  </p>
                );
              }
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="w-full space-y-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none">
            {name}
          </h1>
          {contactLines.length > 0 && (
            <p className="text-[10px] text-gray-600 mt-1.5 font-medium">
              {contactLines.join(' | ')}
            </p>
          )}
        </div>

        {summary.trim() && (
          <p className="text-[10px] text-gray-700 leading-relaxed">
            {summary}
          </p>
        )}

        {renderSection(t('experienceLabel'), experience)}
        {renderSection(t('educationLabel'), education)}
        {renderSection(t('skillsLabel'), skills)}
      </div>
    );
  };

  const isDataEmpty = Object.values(cvData).every(val => !val.trim()) && !generatedCv;

  return (
    <div className="w-full bg-slate-100 dark:bg-slate-900/30 p-4 sm:p-6 flex flex-col items-center justify-start overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 min-h-[500px]">
      <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400 self-start select-none">
        <span className="inline-block w-2.5 h-2.5 bg-[#1e40af] rounded-full"></span>
        <span>A4 Live Page Scale</span>
      </div>
      
      {isDataEmpty ? (
        <div className="flex flex-col items-center justify-center text-center h-full my-auto px-4">
          <div className="w-16 h-20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center mb-3">
            <span className="text-slate-400 text-lg">📝</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            {t('generatedCVPlaceholder')}
          </p>
        </div>
      ) : (
        <div 
          id="cv-preview-a4"
          className="w-full max-w-[595px] bg-white text-gray-900 border border-slate-300 shadow-xl p-8 sm:p-10 font-sans relative flex flex-col justify-start rounded-sm select-text transition-all duration-300 text-left"
          style={{ minHeight: '842px' }}
        >
          {generatedCv && generatedCv.trim() ? renderFromText(generatedCv) : renderFromCvData()}
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
