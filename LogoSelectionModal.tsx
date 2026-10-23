import React, { useState } from 'react';
import { X, Check, Download, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

interface LogoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConcept?: (conceptId: number) => void;
}

export const LogoSelectionModal: React.FC<LogoSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectConcept
}) => {
  const [selected, setSelected] = useState<number | null>(null);

  if (!isOpen) return null;

  const concepts = [
    {
      id: 1,
      title: 'Konsept 1: Titanyum Kuantum Q',
      badge: 'ENDÜSTRİYEL & KESKİN ALGORİTMA',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      image: '/quant_concept_1.jpg',
      downloadName: 'AlfaQuant_Konsept_1_Titanyum_Q.jpg',
      desc: 'Fırçalanmış titanyumdan sekizgen gövde, iç kısımda parlayan elektrik mavisi neon lazer kanalı ve Q harfinin kuyruğu olarak yukarı yönlü sert piyasa kırılımını temsil eden keskin altın yükseliş oku.',
      highlights: ['Güçlü ve endüstriyel duruş', 'Doğrudan algoritmik quant kâr gücü', 'Kurumsal fintech görünümü']
    },
    {
      id: 2,
      title: 'Konsept 2: Sovereign Kalkan & Radar',
      badge: 'KURUMSAL FON & SERMAYE KORUMASI',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      image: '/quant_concept_2.jpg',
      downloadName: 'AlfaQuant_Konsept_2_Sovereign_Kalkan.jpg',
      desc: 'Sıfır zarar sermaye kalkanını simgeleyen altın zırh, merkezde yapay zekanın piyasayı taramasını temsil eden mavi kuantum radarı ve kalkanla bütünleşmiş asil altın Q amblemi.',
      highlights: ['Milyar dolarlık fon / Binance Labs prestiji', 'Maksimum güven ve zenginlik hissi', 'Asil altın ve siber mavi uyumu']
    },
    {
      id: 3,
      title: 'Konsept 3: Saf Kuantum Kristal Glif',
      badge: 'ULTRA-MODERN & İKONİK WEB3',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      image: '/quant_concept_3.jpg',
      downloadName: 'AlfaQuant_Konsept_3_Kristal_Glif.jpg',
      desc: 'İlk baştaki altıgen geometrinin dünya standartlarında kusursuz bir kristal forma evrilmiş hali! Elektrik mavisi fütüristik kristal altıgen, altın iç çerçeve ve keskin açılı kuantum Q kesiti.',
      highlights: ['Solana & Injective tarzı minimalist ikon', '32x32 cüzdanda da dev afişte de anında tanınır', 'Sıfır karmaşa, zamansız teknoloji markası']
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#090e1c] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/10 p-5 sm:p-8 space-y-6 my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESMİ MARKA KİMLİĞİ & LOGO SEÇİM PANELİ</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            AlfaQuant AI (<span className="text-amber-400">$QUANT</span>)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Aşağıdaki 3 profesyonel logo konseptini inceleyip projenizin ruhunu en iyi yansıtanı seçebilirsiniz.
          </p>
        </div>

        {/* Grid of 3 Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden bg-slate-900/90 group ${
                selected === concept.id 
                  ? 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/20' 
                  : 'border-slate-800 hover:border-slate-600 shadow-lg'
              }`}
            >
              <div>
                <div className="relative aspect-square bg-black overflow-hidden p-2">
                  <img
                    src={concept.image}
                    alt={concept.title}
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border backdrop-blur-md ${concept.badgeColor}`}>
                    KONSEPT {concept.id}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-base font-bold text-white flex items-center justify-between">
                    <span>{concept.title}</span>
                    {selected === concept.id && (
                      <span className="text-emerald-400 flex items-center gap-1 text-xs">
                        <Check className="w-4 h-4" /> Seçildi
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {concept.desc}
                  </p>
                  <ul className="space-y-1 pt-1 text-[11px] text-slate-400">
                    {concept.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 pt-0 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(concept.id);
                    if (onSelectConcept) onSelectConcept(concept.id);
                  }}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    selected === concept.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                >
                  {selected === concept.id ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{selected === concept.id ? 'Seçildi (Onaylandı)' : `${concept.id}. Konsepti Seç`}</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={concept.image}
                    download={concept.downloadName}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-mono flex items-center justify-center gap-1 border border-slate-700 transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>HD İndir</span>
                  </a>
                  <a
                    href={concept.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                    title="Büyük Boyut Aç"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>💡 Seçtiğiniz konsept BscScan SVG'si, sosyal medya avatarları ve web sitesi vitrinine otomatik uyarlanacaktır.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Pencereyi Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
