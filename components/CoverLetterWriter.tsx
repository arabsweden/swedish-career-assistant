import React, { useState } from 'react';
import type { CVData } from '../types';
import { writeCoverLetter } from '../services/geminiService';
import { generatePdfFromText } from '../services/pdfService';
import LoadingSpinner from './LoadingSpinner';
import { useI18n } from '../useI18n';
import type { Language } from '../translations';
import { DownloadIcon } from './Icon';


interface CoverLetterWriterProps {
  cvData: CVData;
  language: Language;
}

const CoverLetterWriter: React.FC<CoverLetterWriterProps> = ({ cvData, language }) => {
  const { t } = useI18n();
  const [jobDescription, setJobDescription] = useState('');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      setError(t('coverLetterValidationError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await writeCoverLetter(cvData, jobDescription, language);
      setGeneratedLetter(result);
    } catch (e) {
      setError(t('coverLetterError'));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedLetter) return;
    setIsDownloadingPdf(true);
    try {
      const candidateName = cvData.personalInfo.split('\n')[0].trim() || 'Candidate';
      const fileName = `Cover_Letter_${candidateName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      await generatePdfFromText(generatedLetter, fileName);
    } catch (err) {
      console.error('Error generating cover letter PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('coverLetterTitle')}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('coverLetterJobDescLabel')}
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={15}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
              placeholder={t('coverLetterJobDescPlaceholder')}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300 flex justify-center items-center"
          >
            {isLoading ? t('coverLetterGeneratingButton') : t('coverLetterGenerateButton')}
          </button>
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">{t('coverLetterGeneratedTitle')}</h2>
            <button 
                onClick={handleDownloadPdf}
                disabled={!generatedLetter || isLoading || isDownloadingPdf}
                title={!generatedLetter ? 'Generate a cover letter to enable download' : 'Download Cover Letter as PDF'}
                className="flex items-center gap-1.5 text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">
                {isDownloadingPdf ? (
                    <>
                        <span className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></span>
                        <span>{language === 'ar' ? 'جاري التحميل...' : language === 'sv' ? 'Laddar...' : 'Downloading...'}</span>
                    </>
                ) : (
                    <>
                        <DownloadIcon /> {t('downloadPdfButton')}
                    </>
                )}
            </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg h-full min-h-[400px] border border-gray-200 dark:border-gray-600">
          {isLoading && <LoadingSpinner />}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {generatedLetter || <p className="text-gray-500">{t('coverLetterGeneratedPlaceholder')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverLetterWriter;