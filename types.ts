import type { TranslationKey } from "./translations";

export interface CVData {
  personalInfo: string;
  experience: string;
  education: string;
  skills: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface JobFilters {
  experienceLevel: string;
  employmentType: string;
  salaryRange: string;
}

export interface CVTemplate {
  id: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  data: CVData;
}

export interface SavedSearch {
  id: string;
  query: string;
  location: string;
  filters: JobFilters;
  email: string;
}

// FIX: Add 'Saved' to ApplicationStatus to allow saving jobs before applying.
export type ApplicationStatus = 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';

export interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  dateApplied: string;
  status: ApplicationStatus;
  url?: string;
  notes?: string;
}

export interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
}

export interface SalaryEstimation {
  jobTitle: string;
  averageSalary: number;
  salaryRangeMin: number;
  salaryRangeMax: number;
  factors: string[];
  experienceBreakdown: {
    entryLevel: number;
    midLevel: number;
    seniorLevel: number;
  };
  regionalBreakdown: {
    region: string;
    averageSalary: number;
  }[];
  taxAdvice: string;
}