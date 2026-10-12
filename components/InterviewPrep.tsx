import React, { useState } from 'react';
import { getInterviewPrep } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { useI18n } from '../useI18n';
import type { Language, TranslationKey } from '../translations';

interface InterviewPrepProps {
  language: Language;
}

const InterviewPrep: React.FC<InterviewPrepProps> = ({ language }) => {
  const { t } = useI18n();
  const [jobTitle, setJobTitle] = useState('');
  const [prepContent, setPrepContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>('general');

  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      setError(t('interviewPrepValidationError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getInterviewPrep(jobTitle, language);
      setPrepContent(result);
    } catch (e) {
      setError(t('interviewPrepError'));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const questionCategories = {
    general: {
      titleKey: 'categoryGeneralTitle' as TranslationKey,
      questions: [
        { q: 'q_tellMeAboutYourself' as TranslationKey, a: 'a_tellMeAboutYourself' as TranslationKey },
        { q: 'q_strengths' as TranslationKey, a: 'a_strengths' as TranslationKey },
        { q: 'q_weaknesses' as TranslationKey, a: 'a_weaknesses' as TranslationKey },
        { q: 'q_whySweden' as TranslationKey, a: 'a_whySweden' as TranslationKey },
        { q: 'q_whyThisCompany' as TranslationKey, a: 'a_whyThisCompany' as TranslationKey },
      ]
    },
    technical: {
      titleKey: 'categoryTechnicalTitle' as TranslationKey,
      questions: [
        { q: 'q_techChallenge' as TranslationKey, a: 'a_techChallenge' as TranslationKey },
        { q: 'q_projectProudOf' as TranslationKey, a: 'a_projectProudOf' as TranslationKey },
        { q: 'q_learningNewTech' as TranslationKey, a: 'a_learningNewTech' as TranslationKey },
        { q: 'q_codeReview' as TranslationKey, a: 'a_codeReview' as TranslationKey },
      ]
    },
    salesMarketing: {
      titleKey: 'categorySalesMarketingTitle' as TranslationKey,
      questions: [
        { q: 'q_salesProcess' as TranslationKey, a: 'a_salesProcess' as TranslationKey },
        { q: 'q_handleRejection' as TranslationKey, a: 'a_handleRejection' as TranslationKey },
        { q: 'q_marketingCampaign' as TranslationKey, a: 'a_marketingCampaign' as TranslationKey },
      ]
    },
    toAsk: {
        titleKey: 'categoryQuestionsToAskTitle' as TranslationKey,
        questions: [
            { q: 'q_ask_typicalDay' as TranslationKey, a: 'a_ask_typicalDay' as TranslationKey },
            { q: 'q_ask_challenges' as TranslationKey, a: 'a_ask_challenges' as TranslationKey },
            { q: 'q_ask_success' as TranslationKey, a: 'a_ask_success' as TranslationKey },
            { q: 'q_ask_teamCulture' as TranslationKey, a: 'a_ask_teamCulture' as TranslationKey },
        ]
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('interviewPrepTitle')}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('interviewPrepDescription')}</p>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder={t('interviewPrepJobTitlePlaceholder')}
          className="flex-grow p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300"
        >
          {isLoading ? t('interviewPrepRunningButton') : t('interviewPrepButton')}
        </button>
      </div>

      {error && <p className="text-red-500 text-center">{error}</p>}

      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg min-h-[200px]">
        {isLoading && <LoadingSpinner />}
        {!isLoading && !prepContent && <p className="text-gray-500 text-center mt-8">{t('interviewPrepPlaceholder')}</p>}
        {prepContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {prepContent}
          </div>
        )}
      </div>

      {/* New Question Bank section */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('questionBankTitle')}</h2>
          <div className="space-y-2">
              {Object.entries(questionCategories).map(([key, category]) => (
                  <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <button
                          onClick={() => setOpenCategory(openCategory === key ? null : key)}
                          className="w-full flex justify-between items-center p-4 text-left font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          aria-expanded={openCategory === key}
                          aria-controls={`category-${key}`}
                      >
                          <span>{t(category.titleKey)}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform ${openCategory === key ? 'rotate-180' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                      </button>
                      {openCategory === key && (
                          <div id={`category-${key}`} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                              <ul className="space-y-4">
                                  {category.questions.map((item, index) => (
                                      <li key={index}>
                                          <h4 className="font-semibold text-gray-900 dark:text-white">{t(item.q)}</h4>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 prose prose-sm dark:prose-invert max-w-none">{t(item.a)}</p>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
