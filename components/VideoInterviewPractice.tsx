import React, { useState, useEffect } from 'react';
import { generateInterviewVideo } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { useI18n } from '../useI18n';
import type { Language } from '../translations';

// The type for `window.aistudio` is assumed to be declared globally elsewhere in the project.
interface VideoInterviewPracticeProps {
  language: Language;
}

const VideoInterviewPractice: React.FC<VideoInterviewPracticeProps> = ({ language }) => {
  const { t } = useI18n();
  const [jobTitle, setJobTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio) {
            const keySelected = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(keySelected);
        }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true); // Assume success to avoid race condition
    }
  };
  
  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      setError(t('videoInterviewValidationError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      setLoadingMessage(t('videoGenerationStatusPolling'));
      const downloadLink = await generateInterviewVideo(jobTitle, language);

      if (downloadLink) {
        setLoadingMessage(t('videoGenerationStatusFetching'));
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Fetch error:", errorBody);
            // FIX: Throw a specific error for API key issues so it can be caught below.
            if (errorBody.includes("Requested entity was not found")) {
              throw new Error("Requested entity was not found.");
            }
            throw new Error(`Failed to fetch video file. Status: ${response.status}`);
        }

        const videoBlob = await response.blob();
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
      } else {
        throw new Error('Video generation did not return a valid link.');
      }
    } catch (e: any) {
      if (e.message && e.message.includes("Requested entity was not found")) {
        setError(t('apiKeyError'));
        setHasApiKey(false);
      } else {
        setError(t('videoInterviewError'));
      }
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  if (!hasApiKey) {
    return (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-2">{t('apiKeySelectTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">{t('apiKeySelectDescription')}</p>
            <p className="mb-6">
                <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                    {t('apiKeyBillingLinkText')}
                </a>
            </p>
            <button
                onClick={handleSelectKey}
                className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300"
            >
                {t('apiKeySelectButton')}
            </button>
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300">{t('videoInterviewTitle')}</h2>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder={t('videoInterviewJobTitlePlaceholder')}
          className="flex-grow p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition"
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-300 disabled:bg-primary-300"
        >
          {isLoading ? t('videoInterviewGeneratingButton') : t('videoInterviewGenerateButton')}
        </button>
      </div>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[400px] flex justify-center items-center">
        {isLoading && (
            <div className="text-center">
                <LoadingSpinner />
                <p className="text-gray-500 mt-4 animate-pulse">{loadingMessage}</p>
            </div>
        )}
        {!isLoading && !videoUrl && <p className="text-gray-500 text-center">{t('videoInterviewPlaceholder')}</p>}
        {videoUrl && (
            <video
                src={videoUrl}
                controls
                autoPlay
                className="rounded-lg w-full max-w-2xl shadow-lg"
            >
                Your browser does not support the video tag.
            </video>
        )}
      </div>
    </div>
  );
};

export default VideoInterviewPractice;