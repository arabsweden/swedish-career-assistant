import React, { useState, useEffect } from 'react';
import { useI18n } from '../useI18n';
import type { Application, ApplicationStatus } from '../types';
import Modal from './Modal';
import { TrashIcon, EditIcon, BriefcaseIcon } from './Icon';

const ApplicationTracker: React.FC = () => {
    const { t } = useI18n();
    const [applications, setApplications] = useState<Application[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<Application | null>(null);
    const [appFormData, setAppFormData] = useState({
        companyName: '',
        jobTitle: '',
        dateApplied: new Date().toISOString().split('T')[0],
        url: '',
        notes: '',
    });

    useEffect(() => {
        try {
            const storedApps = localStorage.getItem('jobApplications');
            if (storedApps) {
                setApplications(JSON.parse(storedApps));
            }
        } catch (e) {
            console.error("Failed to parse applications from localStorage", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('jobApplications', JSON.stringify(applications));
    }, [applications]);

    const handleOpenModal = (app: Application | null = null) => {
        setEditingApp(app);
        if (app) {
            setAppFormData({
                companyName: app.companyName,
                jobTitle: app.jobTitle,
                dateApplied: app.dateApplied,
                url: app.url || '',
                notes: app.notes || '',
            });
        } else {
            setAppFormData({
                companyName: '',
                jobTitle: '',
                dateApplied: new Date().toISOString().split('T')[0],
                url: '',
                notes: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingApp(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAppFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveApplication = () => {
        if (!appFormData.companyName.trim() || !appFormData.jobTitle.trim()) {
            // Basic validation
            return;
        }

        if (editingApp) {
            // Update existing application
            setApplications(apps => apps.map(app =>
                app.id === editingApp.id ? { ...app, ...appFormData } : app
            ));
        } else {
            // Add new application
            const newApp: Application = {
                id: Date.now().toString(),
                status: 'Applied',
                ...appFormData,
            };
            setApplications(apps => [newApp, ...apps]);
        }
        handleCloseModal();
    };

    const handleDeleteApplication = (id: string) => {
        if (window.confirm(t('deleteApplicationConfirm'))) {
            setApplications(apps => apps.filter(app => app.id !== id));
        }
    };
    
    const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
        setApplications(apps => apps.map(app =>
            app.id === id ? { ...app, status: newStatus } : app
        ));
    };

    // FIX: Add 'Saved' status to the tracker to support saved jobs from the search page.
    const statuses: ApplicationStatus[] = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'];
    const statusColors: Record<ApplicationStatus, string> = {
        Saved: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300',
        Applied: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
        Interviewing: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300',
        Offer: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
        Rejected: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    };

    const renderApplicationCard = (app: Application) => (
        <div key={app.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-3">
            <div>
                <a href={app.url || '#'} target="_blank" rel="noopener noreferrer" className={`font-bold text-gray-800 dark:text-gray-100 ${app.url ? 'hover:underline' : 'pointer-events-none'}`}>
                    {app.jobTitle}
                </a>
                <p className="text-sm text-gray-600 dark:text-gray-400">{app.companyName}</p>
            </div>

            <div className="text-xs text-gray-500">{new Date(app.dateApplied).toLocaleDateString()}</div>
            
            {app.notes && (
                <p className="text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700/50 pt-2">{app.notes}</p>
            )}

            <div className="flex justify-between items-center pt-2">
                 <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border-none appearance-none cursor-pointer focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 focus:ring-primary-500 ${statusColors[app.status]}`}
                >
                    {statuses.map(s => <option key={s} value={s}>{t(`status${s}` as any)}</option>)}
                </select>

                <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenModal(app)} title="Edit" className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <EditIcon />
                    </button>
                    <button onClick={() => handleDeleteApplication(app.id)} title="Delete" className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">{t('trackerTitle')}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('trackerDescription')}</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-primary-700 transition-colors duration-300 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <BriefcaseIcon/>
                    {t('addApplicationButton')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statuses.map(status => (
                    <div key={status} className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl">
                        <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 px-2 py-1 rounded-md inline-block ${statusColors[status]}`}>
                            {t(`status${status}` as any)}
                        </h3>
                        <div className="space-y-4">
                            {applications.filter(app => app.status === status).length > 0 ? (
                                applications.filter(app => app.status === status).map(renderApplicationCard)
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">{t('noApplicationsInStatus')}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal title={editingApp ? t('editApplicationModalTitle') : t('addApplicationModalTitle')} isOpen={isModalOpen} onClose={handleCloseModal}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('companyNameLabel')}</label>
                        <input type="text" id="companyName" name="companyName" value={appFormData.companyName} onChange={handleFormChange} required className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('jobTitleLabel')}</label>
                        <input type="text" id="jobTitle" name="jobTitle" value={appFormData.jobTitle} onChange={handleFormChange} required className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="dateApplied" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('dateAppliedLabel')}</label>
                        <input type="date" id="dateApplied" name="dateApplied" value={appFormData.dateApplied} onChange={handleFormChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('applicationUrlLabel')}</label>
                        <input type="url" id="url" name="url" value={appFormData.url} onChange={handleFormChange} placeholder="https://..." className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('notesLabel')}</label>
                        <textarea id="notes" name="notes" rows={4} value={appFormData.notes} onChange={handleFormChange} className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={handleCloseModal} className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {t('cancelButton')}
                        </button>
                        <button onClick={handleSaveApplication} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                            {t('saveApplicationButton')}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ApplicationTracker;