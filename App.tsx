import React, { useState, useEffect } from 'react';
import { CVData, SavedSearch, Job } from './types';
import { useI18n } from './useI18n';
import type { TranslationKey } from './translations';
import CVBuilder from './components/CVBuilder';
import JobSearch from './components/JobSearch';
import CoverLetterWriter from './components/CoverLetterWriter';
import InterviewPrep from './components/InterviewPrep';
import CultureTips from './components/CultureTips';
import VideoInterviewPractice from './components/VideoInterviewPractice';
import ApplicationTracker from './components/ApplicationTracker';
import { LogoIcon } from './components/Icon';
import { findJobs } from './services/geminiService';

type Tab = 'cv' | 'jobs' | 'letter' | 'interview' | 'video' | 'culture' | 'tracker';

const App: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('cv');
  const [cvData, setCvData] = useState<CVData>(() => {
    const autoSaved = localStorage.getItem('autoSavedCvData');
    try {
      if (autoSaved && autoSaved !== 'undefined') {
        const parsedData = JSON.parse(autoSaved);
        if (parsedData && typeof parsedData === 'object' && 'personalInfo' in parsedData) {
          return parsedData;
        }
      }
    } catch (e) {
      console.error("Failed to parse auto-saved CV data", e);
    }
    // Fallback to empty if nothing is saved or if parsing fails
    return {
      personalInfo: '',
      experience: '',
      education: '',
      skills: '',
    };
  });
  const [generatedCv, setGeneratedCv] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCvData = params.get('cv');
    if (sharedCvData) {
      try {
        const decodedCv = atob(decodeURIComponent(sharedCvData));
        setGeneratedCv(decodedCv);
        setActiveTab('cv');
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error("Failed to decode CV data from URL", e);
      }
    } else {
      // If no CV in URL, check localStorage for a saved one
      const savedCv = localStorage.getItem('savedCV');
      if (savedCv) {
        setGeneratedCv(savedCv);
      }
    }
  }, []); // Run only once on component mount

  useEffect(() => {
    const JOB_ALERT_INTERVAL = 60000; // 1 minute
    
    const checkJobAlerts = async () => {
      console.log("[Job Alert Service] Checking for new jobs...");
      const storedSearches = localStorage.getItem('savedJobSearches');
      const savedSearches: SavedSearch[] = storedSearches ? JSON.parse(storedSearches) : [];

      if (savedSearches.length === 0) {
        console.log("[Job Alert Service] No saved searches found.");
        return;
      }
      
      const storedAlerts = localStorage.getItem('sentJobAlerts');
      const sentAlerts: Record<string, string[]> = storedAlerts ? JSON.parse(storedAlerts) : {};

      for (const search of savedSearches) {
        try {
          const { jobs } = await findJobs(search.query, search.location, language, search.filters);
          
          const newJobs: Job[] = [];
          const sentForThisSearch = sentAlerts[search.id] || [];

          for (const job of jobs) {
            const jobIdentifier = job.url || `${job.title}|${job.company}`;
            if (!sentForThisSearch.includes(jobIdentifier)) {
              newJobs.push(job);
              sentForThisSearch.push(jobIdentifier);
            }
          }

          if (newJobs.length > 0) {
            console.log(`[Job Alert Simulation] Sending email to ${search.email} for search '${search.query}' with ${newJobs.length} new job(s):`, newJobs.map(j => j.title).join(', '));
            sentAlerts[search.id] = sentForThisSearch;
          }
        } catch (error) {
          console.error(`[Job Alert Service] Error fetching jobs for search '${search.query}':`, error);
        }
      }
      
      localStorage.setItem('sentJobAlerts', JSON.stringify(sentAlerts));
    };

    const intervalId = setInterval(checkJobAlerts, JOB_ALERT_INTERVAL);

    // Cleanup on component unmount
    return () => clearInterval(intervalId);
  }, [language]); // Rerun if language changes to fetch alerts in the correct language


  const handleCvUpdate = (data: CVData) => {
    setCvData(data);
  };
  
  const handleGeneratedCv = (cv: string) => {
    setGeneratedCv(cv);
  };

  const tabs: { id: Tab; labelKey: TranslationKey }[] = [
    { id: 'cv', labelKey: 'tabCVBuilder' },
    { id: 'jobs', labelKey: 'tabJobSearch' },
    { id: 'tracker', labelKey: 'tabApplicationTracker' },
    { id: 'letter', labelKey: 'tabCoverLetter' },
    { id: 'interview', labelKey: 'tabInterviewPrep' },
    { id: 'video', labelKey: 'tabVideoInterview' },
    { id: 'culture', labelKey: 'tabCultureTips' },
  ];

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="text-primary-500">
            <LogoIcon />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-primary-200">{t('appTitle')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm focus:ring-primary-500 focus:border-primary-500 transition"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="sv">Svenska</option>
          </select>
        </div>
      </header>

      <main>
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          {activeTab === 'cv' && <CVBuilder onCvDataChange={handleCvUpdate} onCvGenerated={handleGeneratedCv} initialCvData={cvData} generatedCv={generatedCv} language={language} />}
          {activeTab === 'jobs' && <JobSearch language={language} cvData={cvData} />}
          {activeTab === 'tracker' && <ApplicationTracker />}
          {activeTab === 'letter' && <CoverLetterWriter cvData={cvData} language={language} />}
          {activeTab === 'interview' && <InterviewPrep language={language} />}
          {activeTab === 'video' && <VideoInterviewPractice language={language} />}
          {activeTab === 'culture' && <CultureTips language={language} />}
        </div>
      </main>

       <footer className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
};

export default App;