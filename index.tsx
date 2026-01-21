
import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MODULES_DATA, UI_STRINGS } from './constants';
import { AppRoute, Module, Subsection, Language } from './types';
import AIChat from './components/AIChat';

const TESTIMONIALS: Record<Language, any[]> = {
  ar: [
    { name: "ياسين ب.", role: "وكيل عقاري متميز", quote: "طريقة 777 غيرت تماماً أسلوبي في التنقيب.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yassine" },
    { name: "نادية م.", role: "أخصائية Airbnb", quote: "الموحدة 7 هي منجم ذهب.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia" }
  ],
  fr: [
    { name: "Yassine B.", role: "Agent d'Élite", quote: "La méthode 777 a radicalement changé ma prospection.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yassine" },
    { name: "Nadia M.", role: "Experte Airbnb", quote: "Le module 7 est une mine d'or.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia" }
  ],
  en: [
    { name: "Yassine B.", role: "Elite Agent", quote: "The 777 method radically changed my prospecting.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yassine" },
    { name: "Nadia M.", role: "Airbnb Expert", quote: "Module 7 is a gold mine.", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nadia" }
  ]
};

const App = () => {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('alwasset_lang') as Language) || 'ar');
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.HOME);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const strings = UI_STRINGS[lang];
  const modules = MODULES_DATA[lang];

  useEffect(() => {
    localStorage.setItem('alwasset_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const saved = localStorage.getItem('alwasset777_progress');
    if (saved) setCompletedModules(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('alwasset777_progress', JSON.stringify(completedModules));
  }, [completedModules]);

  const selectedModule = useMemo(() => 
    modules.find(m => m.id === selectedModuleId), 
  [selectedModuleId, lang]);

  const navigateToModule = (id: string) => {
    setSelectedModuleId(id);
    setCurrentRoute(AppRoute.MODULE);
    if (!completedModules.includes(id)) setCompletedModules(prev => [...prev, id]);
    window.scrollTo(0, 0);
  };

  const progressPercentage = Math.round((completedModules.length / modules.length) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-red-100" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-24 items-center">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setCurrentRoute(AppRoute.HOME)}>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                <img src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/al-wasset-logo-sticker.png" alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-black text-slate-900 leading-none">الوسيط 777</span>
                <span className="text-[8px] uppercase tracking-[0.2em] text-red-600 font-black mt-1">{strings.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
                <button onClick={() => setCurrentRoute(AppRoute.HOME)} className={`${currentRoute === AppRoute.HOME ? 'text-red-600' : 'text-slate-500'} font-black text-xs uppercase tracking-widest`}>{strings.academy}</button>
                <button onClick={() => setCurrentRoute(AppRoute.RESOURCES)} className={`${currentRoute === AppRoute.RESOURCES ? 'text-red-600' : 'text-slate-500'} font-black text-xs uppercase tracking-widest`}>{strings.resources}</button>
              </div>

              {/* Language Switcher */}
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
                >
                  <span className="text-lg">🌐</span>
                  <span className="font-black text-xs uppercase">{lang}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute top-full mt-2 left-0 right-0 md:left-auto bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 z-50 min-w-[140px]">
                    <button onClick={() => { setLang('ar'); setShowLangMenu(false); }} className="w-full text-right px-6 py-4 hover:bg-slate-50 text-xs font-black border-b border-slate-50">🇲🇦 العربية</button>
                    <button onClick={() => { setLang('fr'); setShowLangMenu(false); }} className="w-full text-left px-6 py-4 hover:bg-slate-50 text-xs font-black border-b border-slate-50">🇫🇷 Français</button>
                    <button onClick={() => { setLang('en'); setShowLangMenu(false); }} className="w-full text-left px-6 py-4 hover:bg-slate-50 text-xs font-black">🇬🇧 English</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {currentRoute === AppRoute.HOME && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Banner */}
            <div className="relative w-full h-[350px] md:h-[450px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
              <img src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=2000" alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-transparent flex flex-col justify-center p-12 text-white">
                <h2 className="text-4xl md:text-6xl font-serif font-black mb-6 max-w-2xl leading-tight">{strings.bannerTitle}</h2>
                <p className="text-lg md:text-xl font-medium text-slate-100 max-w-xl">{strings.bannerDesc}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{strings.progress}</h3>
                  <span className="text-3xl font-black text-red-600">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>
              <button onClick={() => setCompletedModules([])} className="text-slate-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest transition-colors">{strings.reset}</button>
            </div>

            {/* Modules Grid */}
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <h1 className="text-5xl font-serif font-black text-slate-900 tracking-tight">{strings.moduleTitle}</h1>
              <p className="text-lg text-slate-500 font-medium italic">"{strings.moduleDesc}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {modules.map((module, idx) => {
                const isCompleted = completedModules.includes(module.id);
                return (
                  <div key={module.id} onClick={() => navigateToModule(module.id)} className={`bg-white rounded-[2.5rem] border ${isCompleted ? 'border-green-100 bg-green-50/10' : 'border-slate-200'} shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden group`}>
                    <div className="relative h-56 overflow-hidden">
                      <img src={module.imageUrl} alt={module.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-8 flex items-end">
                        <div className="flex items-center gap-4">
                          <span className="text-4xl bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">{module.icon}</span>
                          <div>
                            <p className="text-red-400 font-black text-[10px] uppercase tracking-widest mb-1">Module 0{idx + 1}</p>
                            <h3 className="text-white font-bold text-xl leading-tight">{module.title}</h3>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <p className="text-slate-500 text-sm mb-8 h-12 overflow-hidden italic leading-relaxed">"{module.description}"</p>
                      <div className="flex justify-between items-center border-t border-slate-50 pt-6">
                        <span className={`font-black text-[10px] uppercase tracking-widest ${isCompleted ? 'text-green-600' : 'text-slate-400'}`}>{isCompleted ? strings.completed : strings.enter}</span>
                        <div className={`w-8 h-8 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'} flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all`}>
                          <span className="font-black">{lang === 'ar' ? '←' : '→'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Testimonials */}
            <div className="pt-24 pb-12">
              <h2 className="text-center text-4xl font-serif font-black mb-16 uppercase tracking-tight">{strings.testimonials}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {TESTIMONIALS[lang].map((t, idx) => (
                  <div key={idx} className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
                    <p className="text-slate-600 text-xl italic mb-10 leading-relaxed font-serif">"{t.quote}"</p>
                    <div className="flex items-center gap-4 border-t pt-8 border-slate-50">
                      <img src={t.avatar} className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-slate-100" />
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{t.name}</h4>
                        <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentRoute === AppRoute.MODULE && selectedModule && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
            <button onClick={() => setCurrentRoute(AppRoute.HOME)} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-600 flex items-center gap-2 group transition-all">
              <span className="text-lg group-hover:scale-125 transition-transform">{lang === 'ar' ? '→' : '←'}</span> {strings.return}
            </button>
            <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100">
              <div className="h-64 relative">
                <img src={selectedModule.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-12">
                  <div className="flex items-center gap-6">
                    <span className="text-5xl bg-white p-4 rounded-3xl shadow-xl">{selectedModule.icon}</span>
                    <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight">{selectedModule.title}</h1>
                  </div>
                </div>
              </div>
              
              <div className="p-12 md:p-16">
                <div className="space-y-24">
                  {selectedModule.content.map((sec, sidx) => (
                    <div key={sidx} className="space-y-8 animate-in fade-in duration-700 delay-200">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black bg-red-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">Hour 0{sidx + 1}</span>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{sec.title}</h2>
                      </div>
                      <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                        <p className="text-2xl text-slate-700 leading-relaxed font-serif italic mb-10">"{sec.content}"</p>
                        <div className="grid gap-6">
                          {sec.subsections?.map((sub: any, subidx: number) => (
                            <div key={subidx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-red-200 transition-all group">
                              <div className="flex items-center gap-4 mb-3">
                                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                <h4 className="font-black text-lg uppercase tracking-tight group-hover:text-red-600 transition-colors">{sub.title || sub}</h4>
                              </div>
                              {sub.explanation && (
                                <p className="text-slate-500 text-base leading-relaxed pl-6 rtl:pl-0 rtl:pr-6 font-medium italic">{sub.explanation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedModule.resources.length > 0 && (
                  <div className="mt-32 pt-20 border-t border-slate-100">
                    <h3 className="text-3xl font-black mb-12 uppercase tracking-tight">{strings.resourcesExpert}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedModule.resources.map((res, ridx) => (
                        <div key={ridx} className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between group hover:bg-slate-800 transition-all shadow-xl">
                          <div className="mb-8">
                            <span className="bg-red-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-full mb-6 inline-block tracking-widest">{res.type}</span>
                            <h4 className="font-bold text-xl leading-tight">{res.title}</h4>
                          </div>
                          <button className="bg-white/10 hover:bg-red-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">{strings.download}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-20 p-12 bg-slate-50 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                   <h4 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Fin de session</h4>
                   <p className="text-slate-500 mb-8 italic">Vous avez validé vos 4 heures de cours pour ce module.</p>
                   <button onClick={() => setCurrentRoute(AppRoute.HOME)} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100 hover:scale-105 transition-all">Continuer le cursus</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-900 py-20 text-center text-white border-t-[12px] border-red-600 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl">777</div>
            <div className="text-right rtl:text-right ltr:text-left">
              <p className="font-serif font-black text-2xl uppercase tracking-tighter">الوسيط 777</p>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.3em] mt-1">{strings.location}</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">© 2024 AL WASSET 777 ACADEMY - PREMIER REAL ESTATE CURRICULUM</p>
            <div className="flex gap-4">
              <span className="w-8 h-1 bg-red-600/30"></span>
              <span className="w-8 h-1 bg-red-600/30"></span>
              <span className="w-8 h-1 bg-red-600/30"></span>
            </div>
          </div>
        </div>
      </footer>

      <AIChat language={lang} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
