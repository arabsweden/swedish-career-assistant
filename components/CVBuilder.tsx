import React, { useState, useEffect, useRef } from 'react';
import { generateCV, parseCVFromText, analyzeResume, parseLinkedInProfile } from '../services/geminiService';
import { generatePdfFromHtmlElement } from '../services/pdfService';
import Markdown from 'react-markdown';
import type { CVData } from '../types';
import type { Language } from '../translations';
import { useI18n } from '../useI18n';
import { cvTemplates } from '../cvTemplates';
import LoadingSpinner from './LoadingSpinner';
import Modal from './Modal';
import { ClipboardIcon, CheckIcon, ShareIcon, SaveIcon, DownloadIcon, UndoIcon, RedoIcon, EmailIcon } from './Icon';
import PdfPreview from './PdfPreview';

interface CVBuilderProps {
  onCvDataChange: (data: CVData) => void;
  onCvGenerated: (cv: string) => void;
  initialCvData: CVData;
  generatedCv: string;
  language: Language;
}

const CVBuilder: React.FC<CVBuilderProps> = ({ onCvDataChange, onCvGenerated, initialCvData, generatedCv, language }) => {
  const { t } = useI18n();
  const [cvData, setCvData] = useState<CVData>(initialCvData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const [isLinkedInModalOpen, setLinkedInModalOpen] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const [isLinkedInParsing, setIsLinkedInParsing] = useState(false);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);
  const [linkedInSuccess, setLinkedInSuccess] = useState(false);
  
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'preview' | 'analysis'>('preview');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfProgressStep, setPdfProgressStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(() => {
    return localStorage.getItem('savedCvAnalysis');
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const history = useRef<CVData[]>([initialCvData]);
  const historyIndex = useRef<number>(0);
  const autoSaveTimeout = useRef<number | null>(null);

  useEffect(() => {
    setCvData(initialCvData);
  }, [initialCvData]);
  
  const pushToHistory = (data: CVData) => {
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }
    history.current.push(data);
    historyIndex.current = history.current.length - 1;
  };

  const handleUndo = () => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const previousState = history.current[historyIndex.current];
      setCvData(previousState);
      onCvDataChange(previousState);
    }
  };

  const handleRedo = () => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current++;
      const nextState = history.current[historyIndex.current];
      setCvData(nextState);
      onCvDataChange(nextState);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newData = { ...cvData, [name]: value };
    setCvData(newData);
    onCvDataChange(newData);

    if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
    autoSaveTimeout.current = window.setTimeout(() => {
      pushToHistory(newData);
      localStorage.setItem('autoSavedCvData', JSON.stringify(newData));
      setShowAutoSave(true);
      setTimeout(() => setShowAutoSave(false), 2000);
    }, 1000);
  };

  const handleGenerateClick = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateCV(cvData, language);
      onCvGenerated(result);
    } catch (e) {
      setError(t('cvGenerationError'));
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setActiveTab('analysis');
    try {
      const result = await analyzeResume(cvData, language);
      setAnalysisResult(result);
      localStorage.setItem('savedCvAnalysis', result);
    } catch (e) {
      setAnalysisError(t('resumeAnalysisError'));
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseTemplate = (templateData: CVData) => {
    setCvData(templateData);
    onCvDataChange(templateData);
    pushToHistory(templateData);
    setTemplateModalOpen(false);
  };

  const handleParseCV = async () => {
    if (!importText.trim()) return;
    setIsParsing(true);
    setError(null);
    try {
      const parsedData = await parseCVFromText(importText, language);
      setCvData(parsedData);
      onCvDataChange(parsedData);
      pushToHistory(parsedData);
      setImportModalOpen(false);
      setImportText('');
    } catch (e) {
      setError(t('importModalError'));
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleParseLinkedIn = async () => {
    if (!linkedInText.trim()) return;
    setIsLinkedInParsing(true);
    setLinkedInError(null);
    setLinkedInSuccess(false);
    try {
      const parsedData = await parseLinkedInProfile(linkedInText, language);
      setCvData(parsedData);
      onCvDataChange(parsedData);
      pushToHistory(parsedData);
      setLinkedInSuccess(true);
      setTimeout(() => {
        setLinkedInModalOpen(false);
        setLinkedInText('');
        setLinkedInSuccess(false);
      }, 1500);
    } catch (e: any) {
      setLinkedInError(e.message || t('importLinkedInError'));
      console.error(e);
    } finally {
      setIsLinkedInParsing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(t('copyFail'));
    }
  };

  const handleShare = async () => {
    const encodedCv = encodeURIComponent(btoa(generatedCv));
    const url = `${window.location.origin}${window.location.pathname}?cv=${encodedCv}`;
    try {
        await navigator.clipboard.writeText(url);
        alert('Shareable link copied to clipboard!');
    } catch (err) {
        alert('Failed to copy shareable link.');
    }
  }

  const handleSave = () => {
    localStorage.setItem('savedCV', generatedCv);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPdfProgress(5);
    setPdfProgressStep(1);

    // Simulate progress smoothly
    const interval = window.setInterval(() => {
      setPdfProgress((prev) => {
        if (prev < 25) {
          return prev + Math.floor(Math.random() * 5) + 2;
        } else if (prev < 60) {
          setPdfProgressStep(2);
          return prev + Math.floor(Math.random() * 4) + 1;
        } else if (prev < 85) {
          setPdfProgressStep(3);
          return prev + Math.floor(Math.random() * 3) + 1;
        } else if (prev < 95) {
          setPdfProgressStep(4);
          return prev + 1;
        }
        return prev;
      });
    }, 150);

    try {
      const candidateName = cvData.personalInfo.split('\n')[0].trim() || 'Candidate';
      const fileName = `CV_${candidateName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      await generatePdfFromHtmlElement('cv-preview-a4', fileName);
      setPdfProgress(100);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      window.clearInterval(interval);
      // Wait half a second at 100% so the user sees it finish, then close
      setTimeout(() => {
        setIsDownloadingPdf(false);
        setPdfProgress(0);
        setPdfProgressStep(1);
      }, 600);
    }
  };

  const handleEmail = () => {
    const candidateName = cvData.personalInfo.split('\n')[0].trim() || 'Candidate';
    const subject = `CV for ${candidateName}`;
    const body = generatedCv;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const formFields: { name: keyof CVData; label: string; placeholder: string }[] = [
    { name: 'personalInfo', label: t('personalInfoLabel'), placeholder: t('personalInfoPlaceholder') },
    { name: 'experience', label: t('experienceLabel'), placeholder: t('experiencePlaceholder') },
    { name: 'education', label: t('educationLabel'), placeholder: t('educationPlaceholder') },
    { name: 'skills', label: t('skillsLabel'), placeholder: t('skillsPlaceholder') },
  ];
  
  const isCvDataEmpty = Object.values(cvData).every(value => typeof value === 'string' && value.trim() === '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">{t('cvBuilderTitle')}</h2>
          <div className="flex items-center gap-2">
             {showAutoSave && <span className="text-xs text-gray-500 animate-pulse">{t('autoSaveNotification')}</span>}
            <button onClick={handleUndo} disabled={historyIndex.current <= 0} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"><UndoIcon /></button>
            <button onClick={handleRedo} disabled={historyIndex.current >= history.current.length - 1} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"><RedoIcon /></button>
          </div>
        </div>
        <div className="space-y-4">
          {formFields.map(field => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
              <textarea
                id={field.name}
                name={field.name}
                rows={5}
                value={cvData[field.name]}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
                placeholder={field.placeholder}
              />
            </div>
          ))}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => setTemplateModalOpen(true)} className="w-full border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 font-bold py-2.5 px-3 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors duration-300 shadow-sm text-xs sm:text-sm">
                  {t('useTemplateButton')}
              </button>
              <button onClick={() => setImportModalOpen(true)} className="w-full border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 font-bold py-2.5 px-3 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors duration-300 shadow-sm text-xs sm:text-sm">
                  {t('importFromTextButton')}
              </button>
              <button onClick={() => setLinkedInModalOpen(true)} className="w-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-bold py-2.5 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors duration-300 shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm">
                <svg className="w-4 h-4 fill-current shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                {t('importLinkedInButton')}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleGenerateClick} disabled={isLoading} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300 shadow-sm">
                {isLoading ? t('generatingCVButton') : t('generateCVButton')}
              </button>
              <button onClick={handleAnalyzeClick} disabled={isAnalyzing || isCvDataEmpty} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-300 disabled:bg-emerald-300 shadow-sm">
                {isAnalyzing ? t('analyzingResumeButton') : t('analyzeResumeButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">{t('generatedCVTitle')}</h2>
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 sm:p-1 rounded-lg border border-gray-200 dark:border-gray-700 select-none">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            activeTab === 'preview'
                                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('pdfPreviewTab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            activeTab === 'text'
                                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('textViewTab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                            activeTab === 'analysis'
                                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {t('analysisTab')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                {generatedCv && !isLoading && (
                    <>
                        <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {copied ? <CheckIcon /> : <ClipboardIcon />} {t('copyButton')}
                        </button>
                        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <ShareIcon /> {t('shareButton')}
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            {saved ? <CheckIcon/> : <SaveIcon />} {t('saveButton')}
                        </button>
                        <button onClick={handleEmail} className="flex items-center gap-1.5 text-sm p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <EmailIcon /> {t('emailButton')}
                        </button>
                    </>
                )}
                <button 
                    onClick={handleDownloadPdf}
                    disabled={(isCvDataEmpty && !generatedCv) || isDownloadingPdf}
                    title={isCvDataEmpty && !generatedCv ? 'Fill in your CV details or generate a CV to enable download' : 'Download CV as PDF'}
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
        </div>
        <div className="w-full">
          {isLoading ? (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg h-full min-h-[500px] border border-gray-200 dark:border-gray-600 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : error && !isImportModalOpen ? (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg h-full min-h-[500px] border border-gray-200 dark:border-gray-600">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* PDF Preview Container - stays mounted in DOM for html2canvas */}
              <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
                <PdfPreview cvData={cvData} generatedCv={generatedCv} language={language} />
              </div>
              
              {/* Text View Container */}
              <div className={`bg-gray-50 dark:bg-gray-700 p-4 rounded-lg h-full min-h-[500px] border border-gray-200 dark:border-gray-600 ${activeTab === 'text' ? 'block' : 'hidden'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-left">
                  {generatedCv || <p className="text-gray-500">{t('generatedCVPlaceholder')}</p>}
                </div>
              </div>

              {/* Analysis View Container */}
              <div className={`bg-gray-50 dark:bg-gray-700 p-6 rounded-lg h-full min-h-[500px] border border-gray-200 dark:border-gray-600 text-left ${activeTab === 'analysis' ? 'block' : 'hidden'}`}>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-primary-700 dark:text-primary-300 mb-4">{t('resumeAnalysisTitle')}</h3>
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <LoadingSpinner />
                      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{language === 'ar' ? 'جاري تحليل سيرتك الذاتية من قبل الذكاء الاصطناعي...' : language === 'sv' ? 'Analyserar ditt CV med AI...' : 'Analyzing your CV with AI...'}</p>
                    </div>
                  ) : analysisError ? (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm">
                      {analysisError}
                    </div>
                  ) : analysisResult ? (
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
                      <Markdown>{analysisResult}</Markdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        {t('resumeAnalysisPlaceholder')}
                      </p>
                      <button 
                        onClick={handleAnalyzeClick} 
                        disabled={isCvDataEmpty}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm"
                      >
                        {t('analyzeResumeButton')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Modal title={t('importModalTitle')} isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('importModalDescription')}</p>
        <textarea
          rows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
          placeholder={t('importModalPlaceholder')}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={handleParseCV}
          disabled={isParsing}
          className="w-full mt-4 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300"
        >
          {isParsing ? t('importModalParsingButton') : t('importModalParseButton')}
        </button>
      </Modal>
      <Modal title={t('templateModalTitle')} isOpen={isTemplateModalOpen} onClose={() => setTemplateModalOpen(false)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('templateDescription')}</p>
        <div className="space-y-3">
          {cvTemplates.map(template => (
            <button key={template.id} onClick={() => handleUseTemplate(template.data)} className="w-full text-left p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-primary-700 dark:text-primary-300">{t(template.nameKey)}</h4>
                {(template.id === 'stockholm' || template.id === 'malmo') && <span className="text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">Tech</span>}
                {(template.id === 'gothenburg' || template.id === 'uppsala') && <span className="text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">Formal</span>}
                {template.id === 'kiruna' && <span className="text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-full">Creative</span>}
                {template.id === 'lund' && <span className="text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">Sales</span>}
                {template.id === 'linkoping' && <span className="text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 rounded-full">Management</span>}
                {template.id === 'umea' && <span className="text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full">Junior</span>}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t(template.descriptionKey)}</p>
            </button>
          ))}
        </div>
      </Modal>

      <Modal title={t('importLinkedInModalTitle')} isOpen={isLinkedInModalOpen} onClose={() => setLinkedInModalOpen(false)}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('importLinkedInModalDescription')}</p>
        <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-semibold">{language === 'ar' ? '💡 نصائح للحصول على أفضل النتائج:' : language === 'sv' ? '💡 Tips för bäst resultat:' : '💡 Tips for best results:'}</p>
          <ul className="list-disc pl-4 space-y-0.5 text-left rtl:pr-4 rtl:pl-0">
            <li>{language === 'ar' ? 'افتح صفحة ملفك الشخصي في LinkedIn' : language === 'sv' ? 'Öppna din LinkedIn-profilsida' : 'Open your LinkedIn Profile page'}</li>
            <li>{language === 'ar' ? 'انسخ الأقسام الرئيسية (About، Experience، Education، Skills)' : language === 'sv' ? 'Kopiera huvudavsnitten (Om, Erfarenhet, Utbildning, Kompetenser)' : 'Copy the main sections (About, Experience, Education, Skills)'}</li>
            <li>{language === 'ar' ? 'أو انقر على More > Save to PDF، ثم افتح الملف المولد وانسخ كل النص' : language === 'sv' ? 'Eller klicka på Mer > Spara som PDF, öppna filen och kopiera all text' : 'Or click More > Save to PDF, open the file, and copy all the text'}</li>
            <li>{language === 'ar' ? 'الصق النص بالكامل هنا للتحليل التلقائي' : language === 'sv' ? 'Klistra in hela texten här för automatisk analys' : 'Paste the entire text here for automatic parsing'}</li>
          </ul>
        </div>
        <textarea
          rows={10}
          value={linkedInText}
          onChange={(e) => setLinkedInText(e.target.value)}
          className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition text-sm"
          placeholder={t('importLinkedInTextareaPlaceholder')}
        />
        {linkedInError && <p className="text-red-500 text-sm mt-2">{linkedInError}</p>}
        {linkedInSuccess && (
          <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2 font-medium flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('importLinkedInSuccess')}
          </p>
        )}
        <button
          onClick={handleParseLinkedIn}
          disabled={isLinkedInParsing || !linkedInText.trim() || linkedInSuccess}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLinkedInParsing ? (
            <>
              <LoadingSpinner />
              <span>{t('importingLinkedInButton')}</span>
            </>
          ) : (
            <span>{t('importLinkedInButton')}</span>
          )}
        </button>
      </Modal>

      {/* PDF Generation Progress Overlay */}
      {isDownloadingPdf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700/60 transform transition-all scale-100">
            <div className="text-center">
              {/* Circular progress with dynamic percentage */}
              <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100 dark:text-gray-700"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary-600 dark:text-primary-400 transition-all duration-300 stroke-current"
                    strokeDasharray={`${pdfProgress}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white">{pdfProgress}%</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
                {language === 'ar' ? 'جاري إنشاء مستند PDF...' : language === 'sv' ? 'Skapar PDF-dokument...' : 'Generating PDF Document...'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                {language === 'ar' 
                  ? 'يرجى الانتظار بينما نقوم بتجميع وتنسيق سيرتك الذاتية عالية الجودة.' 
                  : language === 'sv' 
                  ? 'Vänligen vänta medan vi sammanställer och formaterar ditt högupplösta CV.' 
                  : 'Please wait while we compile and format your high-resolution professional CV.'}
              </p>

              {/* Progress Checklist Steps */}
              <div className="space-y-3.5 text-left max-w-xs mx-auto mb-4">
                {[
                  {
                    id: 1,
                    label: language === 'ar' ? 'تحضير هيكل السيرة الذاتية...' : language === 'sv' ? 'Förbereder CV-struktur...' : 'Preparing CV structure...',
                  },
                  {
                    id: 2,
                    label: language === 'ar' ? 'تحويل التصاميم والخطوط بدقة عالية...' : language === 'sv' ? 'Renderar layouthögupplösning...' : 'Rendering high-resolution layouts...',
                  },
                  {
                    id: 3,
                    label: language === 'ar' ? 'تجميع وترتيب صفحات A4...' : language === 'sv' ? 'Sammanställer A4-sidor...' : 'Compiling A4 pages...',
                  },
                  {
                    id: 4,
                    label: language === 'ar' ? 'جاري إنهاء وتنزيل الملف...' : language === 'sv' ? 'Slutför och laddar ner fil...' : 'Finalizing and saving file...',
                  },
                ].map((step) => {
                  const isCompleted = pdfProgressStep > step.id || pdfProgress === 100;
                  const isActive = pdfProgressStep === step.id && pdfProgress < 100;
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : isActive 
                          ? 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-950/40 dark:border-primary-400 dark:text-primary-400' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-ping"></span>
                        ) : (
                          <span className="text-[10px] font-bold">{step.id}</span>
                        )}
                      </div>
                      <span className={`text-xs transition-colors duration-300 ${
                        isCompleted 
                          ? 'text-gray-400 dark:text-gray-500 line-through' 
                          : isActive 
                          ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Progress Indicator Line */}
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden mt-6">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pdfProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVBuilder;