
import React, { useState, useRef } from 'react';
import { 
  generateSpiritualCommentary, 
  generatePersonalDeclaration, 
  fetchVerseText,
  generateSpeech
} from './services/geminiService';
import { MeditationState } from './types';
import { jsPDF } from 'jspdf';

// Helper functions for audio processing
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Components
const Header: React.FC = () => (
  <header className="flex flex-col items-center mb-10 pt-12">
    <div className="w-20 h-20 mb-6 relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-primary/40 dark:border-primary/30 ring-4 ring-primary/5 dark:ring-primary/5"></div>
      <div className="absolute inset-0 rounded-full border border-accent-purple/40 dark:border-accent-purple/30 rotate-45"></div>
      <div className="w-16 h-16 bg-white/5 dark:bg-slate-900/40 rounded-full flex items-center justify-center backdrop-blur-sm">
        <span className="material-symbols-outlined text-primary dark:text-primary text-4xl font-light">menu_book</span>
      </div>
    </div>
    <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-white">
      Refletindo na Palavra
    </h1>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">Meditação guiada e espiritualidade</p>
  </header>
);

const App: React.FC = () => {
  const [state, setState] = useState<MeditationState & { fullVerseContent?: string }>({
    verse: '',
    commentary: '',
    aiCommentary: '',
    declaration: '',
    aiDeclaration: '',
    fullVerseContent: '',
  });

  const [loadingVerse, setLoadingVerse] = useState(false);
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [loadingDeclaration, setLoadingDeclaration] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const handleFetchVerse = async () => {
    if (!state.verse) {
      alert("Por favor, insira uma referência (ex: João 3:16)");
      return;
    }
    setLoadingVerse(true);
    const text = await fetchVerseText(state.verse);
    setState(prev => ({ ...prev, fullVerseContent: text }));
    setLoadingVerse(false);
  };

  const playAudio = async (text: string, id: string) => {
    if (loadingAudio) return;
    setLoadingAudio(id);

    const base64Audio = await generateSpeech(text);
    if (!base64Audio) {
      alert("Não foi possível gerar o áudio.");
      setLoadingAudio(null);
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    const ctx = audioContextRef.current;
    const audioData = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setLoadingAudio(null);
    source.start();
  };

  const handleAICommentary = async () => {
    if (!state.verse) {
      alert("Por favor, insira um versículo primeiro.");
      return;
    }
    setLoadingCommentary(true);
    const result = await generateSpiritualCommentary(state.verse, state.commentary);
    setState(prev => ({ ...prev, aiCommentary: result }));
    setLoadingCommentary(false);
  };

  const handleAIDeclaration = async () => {
    if (!state.verse) {
      alert("Por favor, insira um versículo para basear sua declaração.");
      return;
    }
    setLoadingDeclaration(true);
    const result = await generatePersonalDeclaration(state.verse);
    setState(prev => ({ ...prev, aiDeclaration: result }));
    setLoadingDeclaration(false);
  };

  const handleSavePDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let cursorY = 20;

    const addText = (text: string, size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, 170);
      
      if (cursorY + (lines.length * (size / 2)) > 280) {
        doc.addPage();
        cursorY = 20;
      }
      
      doc.text(lines, margin, cursorY);
      cursorY += (lines.length * (size / 2.5)) + 5;
    };

    addText("Refletindo na Palavra - Minha Meditação", 22, 'bold', [37, 140, 244]);
    addText(new Date().toLocaleDateString('pt-BR'), 10, 'normal', [100, 100, 100]);
    cursorY += 5;

    if (state.verse) {
      addText("Versículo:", 14, 'bold', [37, 140, 244]);
      addText(state.verse, 12, 'bold');
      if (state.fullVerseContent) {
        addText(`"${state.fullVerseContent}"`, 11, 'italic', [60, 60, 60]);
      }
      cursorY += 5;
    }

    if (state.commentary) {
      addText("Minhas Reflexões:", 14, 'bold', [37, 140, 244]);
      addText(state.commentary, 11);
      cursorY += 5;
    }

    if (state.aiCommentary) {
      addText("Reflexão da IA:", 14, 'bold', [168, 85, 247]);
      addText(state.aiCommentary, 11, 'italic');
      cursorY += 5;
    }

    if (state.declaration) {
      addText("Minha Declaração:", 14, 'bold', [37, 140, 244]);
      addText(state.declaration, 11);
      cursorY += 5;
    }

    if (state.aiDeclaration) {
      addText("Oração de Fé (IA):", 14, 'bold', [168, 85, 247]);
      addText(state.aiDeclaration, 11, 'italic');
    }

    const fileName = `Meditacao_${state.verse.replace(/[: ]/g, '_') || 'Diaria'}.pdf`;
    doc.save(fileName);
  };

  const handleShareOnWhatsApp = () => {
    let message = `📖 *Refletindo na Palavra - Minha Meditação*\n\n`;
    if (state.verse) {
      message += `*Versículo:* ${state.verse}\n`;
      if (state.fullVerseContent) message += `_"${state.fullVerseContent}"_\n`;
      message += `\n`;
    }
    if (state.aiCommentary) message += `✨ *Reflexão:* \n${state.aiCommentary}\n\n`;
    if (state.aiDeclaration) message += `🙏 *Oração de Fé:* \n${state.aiDeclaration}\n\n`;
    message += `Gerado no app *Refletindo na Palavra*`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 -z-10 opacity-20 pointer-events-none">
        <div className="w-64 h-64 bg-primary blur-[120px] rounded-full"></div>
      </div>
      <div className="fixed bottom-0 left-0 -z-10 opacity-10 pointer-events-none">
        <div className="w-96 h-96 bg-accent-purple blur-[150px] rounded-full"></div>
      </div>

      <main className="max-w-md mx-auto px-6 pb-12">
        <Header />

        {/* Search Verse */}
        <section className="mb-8">
          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
            Buscar Versículos
          </label>
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="material-icons text-slate-400 text-lg group-focus-within:text-primary transition-colors">search</span>
              </div>
              <input 
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="Ex: João 3:16"
                type="text"
                value={state.verse}
                onChange={(e) => setState(prev => ({ ...prev, verse: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchVerse()}
              />
            </div>
            <button 
              onClick={handleFetchVerse}
              disabled={loadingVerse}
              className="bg-primary hover:bg-primary/90 text-white px-5 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-md shadow-primary/20 disabled:opacity-50"
              title="Carregar texto do versículo"
            >
              <span className="material-icons">{loadingVerse ? 'sync' : 'auto_stories'}</span>
            </button>
          </div>

          {state.fullVerseContent && (
            <div className="mt-4 p-5 rounded-xl glass-panel border-l-4 border-primary animate-fade-in relative">
               <span className="absolute -top-3 left-6 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Texto Bíblico</span>
               <p className="text-slate-700 dark:text-slate-300 italic text-base leading-relaxed font-serif">
                "{state.fullVerseContent}"
               </p>
               <p className="text-right text-xs mt-2 font-bold text-primary">{state.verse}</p>
            </div>
          )}
        </section>

        {/* Commentary Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seu Comentário
            </label>
            <span className="text-[10px] text-slate-400">Opcional</span>
          </div>
          <div className="glass-panel rounded-xl overflow-hidden mb-3">
            <textarea 
              className="w-full bg-transparent border-none p-4 focus:ring-0 text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 min-h-[100px]"
              placeholder="O que esta palavra diz ao seu coração hoje?"
              rows={4}
              value={state.commentary}
              onChange={(e) => setState(prev => ({ ...prev, commentary: e.target.value }))}
            />
          </div>
          
          {state.aiCommentary && (
            <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-slate-700 dark:text-slate-300 italic animate-fade-in relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary text-xs">auto_awesome</span>
                  <span className="font-bold text-primary uppercase text-[10px] tracking-widest">Reflexão IA</span>
                </div>
                <button 
                  onClick={() => playAudio(state.aiCommentary, 'commentary')}
                  disabled={!!loadingAudio}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  <span className="material-icons text-lg">{loadingAudio === 'commentary' ? 'volume_up' : 'volume_down'}</span>
                </button>
              </div>
              {state.aiCommentary}
            </div>
          )}

          <button 
            onClick={handleAICommentary}
            disabled={loadingCommentary}
            className="w-full ai-gradient hover:opacity-90 active:scale-[0.98] transition-all py-4 rounded-xl flex items-center justify-center gap-2 text-white font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-icons text-lg">{loadingCommentary ? 'hourglass_empty' : 'psychology'}</span>
            {loadingCommentary ? 'Refletindo...' : 'Comentário com IA'}
          </button>
        </section>

        {/* Declaration Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Declaração Pessoal
            </label>
            <span className="text-[10px] text-slate-400">Reflexão</span>
          </div>
          <div className="glass-panel rounded-xl overflow-hidden mb-3 border-primary/10">
            <textarea 
              className="w-full bg-transparent border-none p-4 focus:ring-0 text-slate-700 dark:text-slate-300 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 min-h-[100px]"
              placeholder="Escreva sua oração ou declaração baseada na palavra..."
              rows={4}
              value={state.declaration}
              onChange={(e) => setState(prev => ({ ...prev, declaration: e.target.value }))}
            />
          </div>

          {state.aiDeclaration && (
            <div className="mb-4 p-4 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-sm text-slate-700 dark:text-slate-300 italic animate-fade-in relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-accent-purple text-xs">favorite</span>
                  <span className="font-bold text-accent-purple uppercase text-[10px] tracking-widest">Oração de Fé</span>
                </div>
                <button 
                  onClick={() => playAudio(state.aiDeclaration, 'declaration')}
                  disabled={!!loadingAudio}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 transition-colors disabled:opacity-50"
                >
                  <span className="material-icons text-lg">{loadingAudio === 'declaration' ? 'volume_up' : 'volume_down'}</span>
                </button>
              </div>
              {state.aiDeclaration}
            </div>
          )}

          <button 
            onClick={handleAIDeclaration}
            disabled={loadingDeclaration}
            className="w-full ai-gradient hover:opacity-90 active:scale-[0.98] transition-all py-4 rounded-xl flex items-center justify-center gap-2 text-white font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-icons text-lg">{loadingDeclaration ? 'hourglass_empty' : 'auto_fix_high'}</span>
            {loadingDeclaration ? 'Preparando...' : 'Declaração com IA'}
          </button>
        </section>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleSavePDF}
            className="flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl transition-colors font-medium text-sm shadow-sm"
          >
            <span className="material-icons text-lg">picture_as_pdf</span>
            Salvar em PDF
          </button>
          <button 
            onClick={handleShareOnWhatsApp}
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-xl transition-colors font-medium text-sm shadow-sm"
          >
            <span className="material-icons text-lg">share</span>
            WhatsApp
          </button>
        </div>

        {/* Home Indicator Mockup */}
        <div className="mt-12 flex justify-center no-print">
          <div className="w-32 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full"></div>
        </div>
      </main>
    </div>
  );
};

export default App;
