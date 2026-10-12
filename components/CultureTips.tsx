import React, { useState, useEffect } from 'react';
import { getCultureTips } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { useI18n } from '../useI18n';
import type { Language } from '../translations';

interface CultureTipsProps {
  language: Language;
}

const CultureTips: React.FC<CultureTipsProps> = ({ language }) => {
  const { t } = useI18n();
  const [tips, setTips] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTips = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getCultureTips(language);
        setTips(result);
      } catch (e) {
        setError(t('cultureTipsError'));
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTips();
  }, [language, t]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('cultureTipsTitle')}</h2>
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg min-h-[400px] border border-gray-200 dark:border-gray-600">
        {isLoading && <LoadingSpinner />}
        {error && <p className="text-red-500 text-center">{error}</p>}
        {!isLoading && tips && (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {tips}
          </div>
        )}
      </div>
    </div>
  );
};

export default CultureTips;