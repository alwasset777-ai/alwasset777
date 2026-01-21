
export type Language = 'ar' | 'fr' | 'en';

export interface Subsection {
  title: string;
  explanation: string;
}

export interface Section {
  title: string;
  content: string;
  subsections?: (string | Subsection)[];
}

export interface Resource {
  title: string;
  type: 'PDF' | 'CHECKLIST' | 'FICHE';
  url: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  content: Section[];
  resources: Resource[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export enum AppRoute {
  HOME = 'home',
  MODULE = 'module',
  RESOURCES = 'resources',
  ABOUT = 'about'
}
