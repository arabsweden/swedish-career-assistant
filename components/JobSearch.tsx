import React, { useState, useEffect } from 'react';
import { findJobs, suggestJobsFromCV, getSalaryEstimation, getCompatibilityScore, getCompanyCultureMatch } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import type { GroundingChunk, JobFilters, CVData, SavedSearch, Application, SalaryEstimation } from '../types';
import { useI18n } from '../useI18n';
import type { Language, TranslationKey } from '../translations';
import Modal from './Modal';
import { BellIcon, TrashIcon, SaveIcon, CheckIcon } from './Icon';

interface JobSearchProps {
  language: Language;
  cvData: CVData;
}

interface JobPosting {
  title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
}

interface CompatibilityResult {
  score: number;
  explanation: string;
  matches: string[];
  missing: string[];
}

interface CultureMatchResult {
  score: number;
  companyValues: string;
  explanation: string;
  pros: string[];
  cons: string[];
}

const compTranslations = {
  en: {
    compatibilityScore: 'Compatibility Score',
    loading: 'Analyzing match...',
    error: 'Analysis failed',
    emptyCv: 'No CV data. Build CV first for compatibility matching.',
    matches: 'Matching Highlights',
    gaps: 'Areas to Improve',
    explanation: 'AI Assessment',
  },
  ar: {
    compatibilityScore: 'درجة التوافق',
    loading: 'جاري تحليل التوافق...',
    error: 'فشل تحليل التوافق',
    emptyCv: 'لا توجد بيانات سيرة ذاتية. قم ببناء سيرتك الذاتية أولاً.',
    matches: 'نقاط التوافق الممتازة',
    gaps: 'مجالات للتحسين والنقص',
    explanation: 'التقييم الذكي',
  },
  sv: {
    compatibilityScore: 'Matchningsbetyg',
    loading: 'Analyserar matchning...',
    error: 'Analys misslyckades',
    emptyCv: 'Ingen CV-data. Skapa ditt CV först för matchningsbetyg.',
    matches: 'Matchande höjdpunkter',
    gaps: 'Områden att förbättra',
    explanation: 'AI-bedömning',
  }
};

const cultureTranslations = {
  en: {
    cultureMatch: 'Company Culture Match',
    loading: 'Analyzing culture fit...',
    error: 'Culture analysis failed',
    inferredValues: 'Inferred Values',
    pros: 'Cultural Alignments',
    cons: 'Cultural Differences',
    headerTitle: 'My Work Culture Preferences',
    headerDesc: 'Customize your preferred work culture below. We will use this to analyze and rate how well any potential employer\'s environment aligns with your expectations.',
    placeholder: 'E.g., Flat hierarchy, remote flexibility, high trust, collaboration over competition, etc.',
    saveBtn: 'Save Preferences',
    savedMsg: 'Saved and updated live!',
  },
  ar: {
    cultureMatch: 'توافق ثقافة الشركة',
    loading: 'جاري تحليل التوافق الثقافي...',
    error: 'فشل تحليل الثقافة',
    inferredValues: 'القيم المستنتجة للشركة',
    pros: 'نقاط التوافق والانسجام',
    cons: 'نقاط الاختلاف والتباين',
    headerTitle: 'تفضيلات ثقافة العمل الخاصة بي',
    headerDesc: 'قم بتخصيص ثقافة العمل المفضلة لديك أدناه. سنستخدم هذه التفضيلات لتحليل وتقييم مدى توافق بيئة العمل لدى أي صاحب عمل محتمل مع توقعاتك.',
    placeholder: 'مثال: هيكل تنظيمي مسطح، مرونة العمل عن بعد، ثقة عالية، تعاون بدلاً من المنافسة، إلخ.',
    saveBtn: 'حفظ التفضيلات',
    savedMsg: 'تم الحفظ والتحديث المباشر!',
  },
  sv: {
    cultureMatch: 'Företagskultur-match',
    loading: 'Analyserar kulturmatch...',
    error: 'Kulturanalys misslyckades',
    inferredValues: 'Härledda värderingar',
    pros: 'Kulturella styrkor',
    cons: 'Kulturella skillnader',
    headerTitle: 'Mina kulturpreferenser för arbetsplatsen',
    headerDesc: 'Anpassa din föredragna företagskultur nedan. Vi använder detta för att analysera och betygsätta hur väl en potentiell arbetsgivares miljö matchar dina förväntningar.',
    placeholder: 'T.ex. platt organisation, distansflexibilitet, högt förtroende, samarbete före konkurrens, etc.',
    saveBtn: 'Spara preferenser',
    savedMsg: 'Sparad och uppdaterad live!',
  }
};

const JobSearch: React.FC<JobSearchProps> = ({ language, cvData }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(t('jobSearchDefaultLocation'));
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{jobs: JobPosting[], sources: GroundingChunk[]}| null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState('any');
  const [employmentType, setEmploymentType] = useState('any');
  const [salaryRange, setSalaryRange] = useState('');

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedJobs, setSuggestedJobs] = useState<{ jobs: JobPosting[]; sources: GroundingChunk[] } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [salaryJobTitle, setSalaryJobTitle] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [salaryEstimation, setSalaryEstimation] = useState<SalaryEstimation | null>(null);
  const [salaryEstimatorError, setSalaryEstimatorError] = useState<string | null>(null);

  const [compScores, setCompScores] = useState<Record<string, CompatibilityResult | 'loading' | 'error'>>({});
  const [showCulturePref, setShowCulturePref] = useState(false);
  const [prefWorkEnv, setPrefWorkEnv] = useState(() => {
    const saved = localStorage.getItem('prefWorkEnv');
    if (saved) return saved;
    if (language === 'sv') {
      return "Platt organisation, hög grad av självständighet, samarbetsvilligt och inkluderande team, lagom balans mellan arbete och fritid, flexibla arbetstider samt möjlighet till distansarbete.";
    } else if (language === 'ar') {
      return "هيكل تنظيمي مسطح، درجة عالية من الاستقلالية، فريق تعاوني وشامل، توازن ممتاز بين العمل والحياة، ساعات عمل مرنة، وخيار العمل عن بعد أو الهجين.";
    }
    return "Flat organizational hierarchy, high degree of autonomy, collaborative and inclusive team, lagom work-life balance, flexible working hours, and remote or hybrid work option.";
  });
  const [cultureScores, setCultureScores] = useState<Record<string, CultureMatchResult | 'loading' | 'error'>>({});

  const fetchCompatibilityForJobs = async (jobs: JobPosting[]) => {
    const isCvEmpty = Object.values(cvData).every(value => typeof value === 'string' && !value.trim());
    if (isCvEmpty) return;

    for (const job of jobs) {
      const jobKey = job.url || `${job.title}|${job.company}`;
      
      setCompScores(prev => {
        if (prev[jobKey]) return prev;

        // Trigger asynchronous fetch
        (async () => {
          try {
            const result = await getCompatibilityScore(cvData, job.title, job.company, job.description, language);
            setCompScores(p => ({ ...p, [jobKey]: result }));
          } catch (e) {
            console.error(`Failed to calculate compatibility for ${job.title}`, e);
            setCompScores(p => ({ ...p, [jobKey]: 'error' }));
          }
        })();

        return { ...prev, [jobKey]: 'loading' };
      });
    }
  };

  const fetchCultureMatchForJobs = async (jobs: JobPosting[]) => {
    if (!prefWorkEnv.trim()) return;

    for (const job of jobs) {
      const jobKey = job.url || `${job.title}|${job.company}`;
      
      setCultureScores(prev => {
        if (prev[jobKey]) return prev;

        // Trigger asynchronous fetch
        (async () => {
          try {
            const result = await getCompanyCultureMatch(job.company, job.title, job.description, prefWorkEnv, language);
            setCultureScores(p => ({ ...p, [jobKey]: result }));
          } catch (e) {
            console.error(`Failed to calculate culture match for ${job.company}`, e);
            setCultureScores(p => ({ ...p, [jobKey]: 'error' }));
          }
        })();

        return { ...prev, [jobKey]: 'loading' };
      });
    }
  };

  // Clear scores on changes so we evaluate them freshly
  useEffect(() => {
    setCompScores({});
  }, [cvData, language]);

  useEffect(() => {
    setCultureScores({});
  }, [prefWorkEnv, language]);

  // Recalculate whenever search results or suggested jobs are updated
  useEffect(() => {
    if (results?.jobs) {
      fetchCompatibilityForJobs(results.jobs);
      fetchCultureMatchForJobs(results.jobs);
    }
  }, [results, cvData, prefWorkEnv, language]);

  useEffect(() => {
    if (suggestedJobs?.jobs) {
      fetchCompatibilityForJobs(suggestedJobs.jobs);
      fetchCultureMatchForJobs(suggestedJobs.jobs);
    }
  }, [suggestedJobs, cvData, prefWorkEnv, language]);

  useEffect(() => {
    if (query && !salaryJobTitle) {
      setSalaryJobTitle(query);
    }
  }, [query]);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [emailForAlerts, setEmailForAlerts] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  const [savedJobIdentifiers, setSavedJobIdentifiers] = useState<Set<string>>(new Set());

  const filterKeyMap: Record<string, TranslationKey> = {
    'entry-level': 'experienceEntry',
    'mid-level': 'experienceMid',
    'senior-level': 'experienceSenior',
    'full-time': 'employmentFullTime',
    'part-time': 'employmentPartTime',
    'contract': 'employmentContract',
    'internship': 'employmentInternship',
  };

  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('savedJobSearches');
      if (storedSearches) {
        setSavedSearches(JSON.parse(storedSearches));
      }
      // Load saved job applications to check which ones are already saved
      const storedApps = localStorage.getItem('jobApplications');
      if (storedApps) {
        const currentApps: Application[] = JSON.parse(storedApps);
        const identifiers = new Set(currentApps.map(app => app.url || `${app.jobTitle}|${app.companyName}`));
        setSavedJobIdentifiers(identifiers);
      }
    } catch (e) {
      console.error("Failed to parse data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  React.useEffect(() => {
    setLocation(t('jobSearchDefaultLocation'));
  }, [t]);

  const runSearch = async (searchQuery: string, searchLocation: string, searchFilters: JobFilters) => {
    if (!searchQuery.trim()) {
      setError(t('jobSearchValidationError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await findJobs(searchQuery, searchLocation, language, searchFilters);
      setResults(response);
    } catch (e) {
      setError(t('jobSearchError'));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const filters: JobFilters = { experienceLevel, employmentType, salaryRange };
    runSearch(query, location, filters);
  };
  
  const handleSaveJob = (job: JobPosting) => {
    try {
      const storedApps = localStorage.getItem('jobApplications');
      const currentApps: Application[] = storedApps ? JSON.parse(storedApps) : [];

      const jobIdentifier = job.url || `${job.title}|${job.company}`;
      if (savedJobIdentifiers.has(jobIdentifier)) {
          return; // Already saved
      }

      const newApp: Application = {
          id: Date.now().toString(),
          companyName: job.company,
          jobTitle: job.title,
          dateApplied: new Date().toISOString().split('T')[0], // Represents date saved
          status: 'Saved',
          url: job.url,
          notes: job.description,
      };
      
      const updatedApps = [newApp, ...currentApps];
      localStorage.setItem('jobApplications', JSON.stringify(updatedApps));
      
      setSavedJobIdentifiers(prev => new Set(prev).add(jobIdentifier));
      setFeedbackMessage(t('jobSavedToTrackerSuccess'));
    } catch (e) {
        console.error("Failed to save job", e);
        setError("Could not save job to tracker.");
    }
  };

  const handleSaveSearchClick = () => {
    if (!query.trim()) {
        setError(t('jobSearchValidationError'));
        return;
    }
    setError(null);
    setSaveError(null);
    setEmailForAlerts('');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveSearch = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailForAlerts.trim() || !emailRegex.test(emailForAlerts)) {
        setSaveError(t('saveSearchModalValidationError'));
        return;
    }

    const newSearch: SavedSearch = {
        id: Date.now().toString(),
        query,
        location,
        filters: { experienceLevel, employmentType, salaryRange },
        email: emailForAlerts,
    };
    
    const updatedSearches = [...savedSearches, newSearch];
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedJobSearches', JSON.stringify(updatedSearches));
    
    setIsSaveModalOpen(false);
    setFeedbackMessage(t('searchSavedSuccess'));
  };

  const handleDeleteSearch = (id: string) => {
    const updatedSearches = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedJobSearches', JSON.stringify(updatedSearches));
    setFeedbackMessage(t('searchDeletedSuccess'));
  };

  const handleRunSavedSearch = (search: SavedSearch) => {
    setQuery(search.query);
    setLocation(search.location);
    setExperienceLevel(search.filters.experienceLevel);
    setEmploymentType(search.filters.employmentType);
    setSalaryRange(search.filters.salaryRange);
    runSearch(search.query, search.location, search.filters);
  };
  
  const handleSuggestJobs = async () => {
    const isCvDataEmpty = Object.values(cvData).every(value => typeof value === 'string' && !value.trim());
    if (isCvDataEmpty) {
      setSuggestionError(t('jobSearchSuggestionError'));
      return;
    }

    setIsSuggesting(true);
    setSuggestionError(null);
    setSuggestedJobs(null);

    try {
      const response = await suggestJobsFromCV(cvData, language);
      setSuggestedJobs(response);
    } catch (e) {
      setSuggestionError(t('jobSearchError'));
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleEstimateSalary = async () => {
    if (!salaryJobTitle.trim()) {
      setSalaryEstimatorError(language === 'ar' ? 'الرجاء إدخال مسمى وظيفي.' : language === 'sv' ? 'Vänligen ange en yrkestitel.' : 'Please enter a job title.');
      return;
    }
    setIsEstimating(true);
    setSalaryEstimatorError(null);
    setSalaryEstimation(null);
    try {
      const data = await getSalaryEstimation(salaryJobTitle, language);
      setSalaryEstimation(data);
    } catch (e) {
      console.error(e);
      setSalaryEstimatorError(t('salaryEstimatorError'));
    } finally {
      setIsEstimating(false);
    }
  };
  
  const renderJobCard = (job: JobPosting, index: number) => {
    const jobIdentifier = job.url || `${job.title}|${job.company}`;
    const isSaved = savedJobIdentifiers.has(jobIdentifier);
    return (
        <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between transition-all duration-300">
            <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                    <a 
                        href={job.url || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`text-lg font-bold text-gray-900 dark:text-white leading-snug ${job.url ? 'hover:text-primary-600 dark:hover:text-primary-400 hover:underline' : 'pointer-events-none'}`}
                    >
                        {job.title}
                    </a>
                    {job.url && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100/80 dark:border-emerald-900/30">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            {language === 'ar' ? 'مباشر' : language === 'sv' ? 'Direkt' : 'Direct'}
                        </span>
                    )}
                </div>
                <p className="text-md font-semibold text-primary-600 dark:text-primary-400 mb-1">{job.company}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25A7.5 7.5 0 1119.5 10.5z" />
                    </svg>
                    {job.location}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{job.description}</p>
                
                {/* Job Compatibility Score Section */}
                {(() => {
                  const isCvEmpty = Object.values(cvData).every(val => typeof val === 'string' && !val.trim());
                  const ct = compTranslations[language] || compTranslations.en;
                  
                  if (isCvEmpty) {
                    return (
                      <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-700/60 rounded-xl p-3 mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        {ct.emptyCv}
                      </div>
                    );
                  }

                  const scoreData = compScores[jobIdentifier];

                  if (scoreData === 'loading') {
                    return (
                      <div className="bg-gray-50/30 dark:bg-gray-900/20 border border-gray-100/50 dark:border-gray-800/40 rounded-xl p-3.5 mb-4 animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{ct.compatibilityScore}</span>
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden mb-2.5">
                          <div className="bg-gray-200 dark:bg-gray-700 h-full rounded-full w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    );
                  }

                  if (scoreData === 'error') {
                    return (
                      <div className="bg-red-50/30 dark:bg-red-950/20 border border-red-100/30 dark:border-red-900/20 rounded-xl p-3 mb-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>{ct.error}</span>
                      </div>
                    );
                  }

                  if (scoreData && typeof scoreData === 'object') {
                    return (
                      <div className="bg-gray-50/30 dark:bg-gray-950/5 border border-gray-100 dark:border-gray-800/80 rounded-xl p-3.5 mb-4 transition-all duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {ct.compatibilityScore}
                          </span>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                            scoreData.score >= 80 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' 
                              : scoreData.score >= 50 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30' 
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                          }`}>
                            {scoreData.score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              scoreData.score >= 80 ? 'bg-emerald-500' : scoreData.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`} 
                            style={{ width: `${scoreData.score}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic mb-2.5">
                          "{scoreData.explanation}"
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-gray-100/80 dark:border-gray-800/50">
                          {scoreData.matches && scoreData.matches.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                                ✓ {ct.matches}
                              </span>
                              <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                                {scoreData.matches.map((match, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-emerald-500 shrink-0 font-bold">•</span>
                                    <span>{match}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {scoreData.missing && scoreData.missing.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                ⚠ {ct.gaps}
                              </span>
                              <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                                {scoreData.missing.map((miss, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-amber-500 shrink-0 font-bold">•</span>
                                    <span>{miss}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Company Culture Match Section */}
                {(() => {
                  const ct = cultureTranslations[language] || cultureTranslations.en;
                  
                  if (!prefWorkEnv.trim()) {
                    return null; // Don't show if preference is completely empty
                  }

                  const scoreData = cultureScores[jobIdentifier];

                  if (scoreData === 'loading') {
                    return (
                      <div className="bg-gray-50/30 dark:bg-gray-900/20 border border-gray-100/50 dark:border-gray-800/40 rounded-xl p-3.5 mb-4 animate-pulse">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{ct.cultureMatch}</span>
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden mb-2.5">
                          <div className="bg-gray-200 dark:bg-gray-700 h-full rounded-full w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    );
                  }

                  if (scoreData === 'error') {
                    return (
                      <div className="bg-red-50/30 dark:bg-red-950/20 border border-red-100/30 dark:border-red-900/20 rounded-xl p-3 mb-4 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>{ct.error}</span>
                      </div>
                    );
                  }

                  if (scoreData && typeof scoreData === 'object') {
                    return (
                      <div className="bg-indigo-50/10 dark:bg-indigo-950/5 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl p-3.5 mb-4 transition-all duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 text-indigo-500 shrink-0">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                            </svg>
                            {ct.cultureMatch}
                          </span>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                            scoreData.score >= 80 
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30' 
                              : scoreData.score >= 50 
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30' 
                              : 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900/30'
                          }`}>
                            {scoreData.score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              scoreData.score >= 80 ? 'bg-indigo-500' : scoreData.score >= 50 ? 'bg-purple-500' : 'bg-pink-500'
                            }`} 
                            style={{ width: `${scoreData.score}%` }}
                          ></div>
                        </div>
                        
                        {scoreData.companyValues && (
                          <div className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 font-semibold">
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{ct.inferredValues}:</span> {scoreData.companyValues}
                          </div>
                        )}

                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic mb-2.5">
                          "{scoreData.explanation}"
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 pt-2.5 border-t border-gray-100/80 dark:border-gray-800/50">
                          {scoreData.pros && scoreData.pros.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                ✓ {ct.pros}
                              </span>
                              <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                                {scoreData.pros.map((pro, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-indigo-500 shrink-0 font-bold">•</span>
                                    <span>{pro}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {scoreData.cons && scoreData.cons.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider block mb-1">
                                ⚠ {ct.cons}
                              </span>
                              <ul className="space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                                {scoreData.cons.map((con, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-pink-500 shrink-0 font-bold">•</span>
                                    <span>{con}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/40 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button 
                    onClick={() => handleSaveJob(job)}
                    disabled={isSaved}
                    className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                    {isSaved ? <CheckIcon /> : <SaveIcon />}
                    {isSaved ? t('jobSavedButton') : t('saveJobButton')}
                </button>
                {job.url && (
                    <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center gap-1.5 text-sm font-bold py-2 px-4 rounded-lg transition-all duration-200 bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow"
                    >
                        <span>{t('applyDirectButton')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                    </a>
                )}
            </div>
        </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('jobSearchTitle')}</h2>
      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('jobSearchJobTitlePlaceholder')}
          className="flex-grow p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('jobSearchLocationPlaceholder')}
          className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300"
        >
          {isLoading ? t('jobSearchingButton') : t('jobSearchButton')}
        </button>
        <button
            onClick={handleSaveSearchClick}
            disabled={isLoading}
            title={t('jobSearchSaveButton')}
            className="border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 font-bold py-3 px-6 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors duration-300 disabled:opacity-50"
        >
            {t('jobSearchSaveButton')}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline" aria-expanded={showAdvanced}>
            {showAdvanced ? t('jobSearchHideAdvanced') : t('jobSearchShowAdvanced')}
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button onClick={() => setShowCulturePref(!showCulturePref)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5" aria-expanded={showCulturePref}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            {showCulturePref ? (language === 'sv' ? 'Dölj kulturpreferenser' : language === 'ar' ? 'إخفاء تفضيلات الثقافة' : 'Hide Culture Preferences') : (language === 'sv' ? 'Anpassa kulturpreferenser' : language === 'ar' ? 'تخصيص تفضيلات الثقافة' : 'Customize Culture Preferences')}
        </button>
      </div>

      {showAdvanced && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                  <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('jobSearchExperienceLevel')}</label>
                  <select id="experienceLevel" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500">
                      <option value="any">{t('experienceAny')}</option>
                      <option value="entry-level">{t('experienceEntry')}</option>
                      <option value="mid-level">{t('experienceMid')}</option>
                      <option value="senior-level">{t('experienceSenior')}</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('jobSearchEmploymentType')}</label>
                  <select id="employmentType" value={employmentType} onChange={e => setEmploymentType(e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500">
                      <option value="any">{t('employmentAny')}</option>
                      <option value="full-time">{t('employmentFullTime')}</option>
                      <option value="part-time">{t('employmentPartTime')}</option>
                      <option value="contract">{t('employmentContract')}</option>
                      <option value="internship">{t('employmentInternship')}</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="salaryRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('jobSearchSalaryRange')}</label>
                  <input
                      type="text"
                      id="salaryRange"
                      value={salaryRange}
                      onChange={e => setSalaryRange(e.target.value)}
                      placeholder={t('salaryPlaceholder')}
                      className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
              </div>
          </div>
      )}

      {showCulturePref && (
          <div className="mb-6 p-5 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 transition-all duration-300 animate-fadeIn">
              <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                  </div>
                  <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {(cultureTranslations[language] || cultureTranslations.en).headerTitle}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {(cultureTranslations[language] || cultureTranslations.en).headerDesc}
                      </p>
                  </div>
              </div>
              <textarea
                  rows={3}
                  value={prefWorkEnv}
                  onChange={e => {
                    setPrefWorkEnv(e.target.value);
                    localStorage.setItem('prefWorkEnv', e.target.value);
                  }}
                  placeholder={(cultureTranslations[language] || cultureTranslations.en).placeholder}
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <div className="flex justify-end mt-2">
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 italic">
                    {(cultureTranslations[language] || cultureTranslations.en).savedMsg}
                  </span>
              </div>
          </div>
      )}
      
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {feedbackMessage && (
        <div className="my-4 p-3 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700 rounded-lg text-center text-sm">
            {feedbackMessage}
        </div>
      )}

      <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg min-h-[300px]">
        {isLoading && <LoadingSpinner />}
        {!isLoading && !results && <p className="text-gray-500 text-center mt-8">{t('jobSearchResultsPlaceholder')}</p>}
        {results && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.jobs.map(renderJobCard)}
            </div>
            {results.sources.length > 0 && (
                <div className="mt-6 border-t border-gray-300 dark:border-gray-600 pt-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t('jobSearchSources')}</h4>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        {results.sources.map((source, index) => (
                           source.web && <li key={index}>
                                <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline dark:text-primary-400">
                                    {source.web.title || source.web.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Sweden Salary Estimator */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 p-6 rounded-2xl border border-primary-100 dark:border-gray-700 mb-6">
          <h3 className="text-xl font-bold text-primary-800 dark:text-primary-300 flex items-center gap-2">
            <span className="p-1.5 bg-primary-600 text-white rounded-lg text-sm">SEK</span>
            {t('salaryEstimatorTitle')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {t('salaryEstimatorDescription')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <input
              type="text"
              value={salaryJobTitle}
              onChange={(e) => setSalaryJobTitle(e.target.value)}
              placeholder={t('salaryEstimatorPlaceholder')}
              className="flex-grow p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
            <button
              onClick={handleEstimateSalary}
              disabled={isEstimating}
              className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300 whitespace-nowrap"
            >
              {isEstimating ? t('salaryEstimatorRunning') : t('salaryEstimatorButton')}
            </button>
          </div>
        </div>

        {salaryEstimatorError && (
          <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-xl text-center text-sm">
            {salaryEstimatorError}
          </div>
        )}

        {isEstimating && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner />
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">{t('salaryEstimatorRunning')}</p>
          </div>
        )}

        {salaryEstimation && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
            <div className="border-b border-gray-100 dark:border-gray-700 pb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-primary-600 dark:text-primary-400">Sweden Salary Insights</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{salaryEstimation.jobTitle}</h3>
              </div>
              <div className="text-left md:text-right bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-2xl border border-primary-100/60 dark:border-primary-900/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t('salaryEstimatorAvg')}</p>
                <p className="text-3xl font-black text-primary-700 dark:text-primary-300 mt-0.5">
                  {salaryEstimation.averageSalary.toLocaleString()} <span className="text-sm font-semibold">SEK / {language === 'ar' ? 'شهر' : language === 'sv' ? 'mån' : 'month'}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {t('salaryEstimatorRange')}: {salaryEstimation.salaryRangeMin.toLocaleString()} - {salaryEstimation.salaryRangeMax.toLocaleString()} SEK
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Experience Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary-600 rounded-full"></span>
                  {t('jobSearchExperienceLevel')}
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5 font-medium">
                      <span className="text-gray-600 dark:text-gray-300">{t('salaryEstimatorEntry')}</span>
                      <span className="text-gray-950 dark:text-white font-semibold">{salaryEstimation.experienceBreakdown.entryLevel.toLocaleString()} SEK</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (salaryEstimation.experienceBreakdown.entryLevel / Math.max(1, salaryEstimation.salaryRangeMax)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5 font-medium">
                      <span className="text-gray-600 dark:text-gray-300">{t('salaryEstimatorMid')}</span>
                      <span className="text-gray-950 dark:text-white font-semibold">{salaryEstimation.experienceBreakdown.midLevel.toLocaleString()} SEK</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (salaryEstimation.experienceBreakdown.midLevel / Math.max(1, salaryEstimation.salaryRangeMax)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1.5 font-medium">
                      <span className="text-gray-600 dark:text-gray-300">{t('salaryEstimatorSenior')}</span>
                      <span className="text-gray-950 dark:text-white font-semibold">{salaryEstimation.experienceBreakdown.seniorLevel.toLocaleString()} SEK</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (salaryEstimation.experienceBreakdown.seniorLevel / Math.max(1, salaryEstimation.salaryRangeMax)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regional Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary-600 rounded-full"></span>
                  {t('salaryEstimatorRegional')}
                </h4>
                <div className="space-y-4">
                  {salaryEstimation.regionalBreakdown.map((reg, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1.5 font-medium">
                        <span className="text-gray-600 dark:text-gray-300">{reg.region}</span>
                        <span className="text-gray-950 dark:text-white font-semibold">{reg.averageSalary.toLocaleString()} SEK</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (reg.averageSalary / Math.max(1, salaryEstimation.salaryRangeMax)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Factors and Taxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-3 bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary-600 rounded-full"></span>
                  {t('salaryEstimatorFactors')}
                </h4>
                <ul className="space-y-2.5">
                  {salaryEstimation.factors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-primary-600 dark:text-primary-400 font-bold mt-0.5">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 bg-primary-50/20 dark:bg-primary-950/10 p-5 rounded-2xl border border-primary-50 dark:border-gray-700/40">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-primary-600 rounded-full"></span>
                  {t('salaryEstimatorTax')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {salaryEstimation.taxAdvice}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4">{t('savedSearchesTitle')}</h2>
        <div className="space-y-3">
            {savedSearches.length > 0 ? (
                savedSearches.map(search => (
                    <div key={search.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <button onClick={() => handleRunSavedSearch(search)} className="text-left">
                                <h4 className="font-semibold text-primary-700 dark:text-primary-300 hover:underline">{search.query}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{search.location}</p>
                                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                                    {search.filters.experienceLevel && search.filters.experienceLevel !== 'any' && (
                                        <span className="text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">{t(filterKeyMap[search.filters.experienceLevel])}</span>
                                    )}
                                    {search.filters.employmentType && search.filters.employmentType !== 'any' && (
                                        <span className="text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">{t(filterKeyMap[search.filters.employmentType])}</span>
                                    )}
                                    {search.filters.salaryRange.trim() && (
                                        <span className="text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">{search.filters.salaryRange} SEK</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-2">
                                    <BellIcon />
                                    <span>{t('savedSearchAlertsOn')} ({search.email})</span>
                                </div>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                                onClick={() => handleDeleteSearch(search.id)}
                                title={t('deleteSearchButton')}
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-gray-500 text-center py-4">{t('noSavedSearches')}</p>
            )}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">{t('jobSearchSuggestedJobsTitle')}</h2>
          <button
            onClick={handleSuggestJobs}
            disabled={isSuggesting}
            className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300 mt-2 sm:mt-0"
          >
            {isSuggesting ? t('jobSearchSuggestingButton') : t('jobSearchSuggestButton')}
          </button>
        </div>
        
        {suggestionError && <p className="text-red-500 text-center">{suggestionError}</p>}
        
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg min-h-[300px]">
          {isSuggesting && <LoadingSpinner />}
          {!isSuggesting && !suggestedJobs && <p className="text-gray-500 text-center mt-8">{t('jobSearchSuggestedJobsPlaceholder')}</p>}
          {suggestedJobs && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {suggestedJobs.jobs.map(renderJobCard)}
              </div>
              {suggestedJobs.sources.length > 0 && (
                  <div className="mt-6 border-t border-gray-300 dark:border-gray-600 pt-4">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t('jobSearchSources')}</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                          {suggestedJobs.sources.map((source, index) => (
                             source.web && <li key={index}>
                                  <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline dark:text-primary-400">
                                      {source.web.title || source.web.uri}
                                  </a>
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Modal title={t('saveSearchModalTitle')} isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('saveSearchModalDescription')}</p>
        <input
            type="email"
            value={emailForAlerts}
            onChange={(e) => setEmailForAlerts(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
            placeholder={t('saveSearchModalEmailPlaceholder')}
        />
        {saveError && <p className="text-red-500 text-sm mt-2">{saveError}</p>}
        <button
            onClick={handleConfirmSaveSearch}
            className="w-full mt-4 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-300"
        >
            {t('saveSearchModalSaveButton')}
        </button>
      </Modal>
    </div>
  );
};

export default JobSearch;