import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import {
  Briefcase,
  X,
  MessageSquare,
  Clock,
  Zap,
  Check,
  Plus,
  Trash2,
  Send,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface AutoMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestInChat?: (message: string) => void;
}

interface QuickReply {
  id: string;
  shortcut: string;
  text: string;
}

export default function AutoMessagesModal({ isOpen, onClose, onTestInChat }: AutoMessagesModalProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'greeting' | 'away' | 'quick'>('greeting');

  // Saudação
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [greetingText, setGreetingText] = useState(
    'Olá! Seja muito bem-vindo ao suporte oficial do Telegram Business. Como podemos ajudar você hoje?'
  );

  // Ausência
  const [awayEnabled, setAwayEnabled] = useState(false);
  const [awayText, setAwayText] = useState(
    'No momento nossa equipe está fora do horário comercial. Deixe sua dúvida que responderemos logo que retornarmos!'
  );
  const [awaySchedule, setAwaySchedule] = useState('always'); // 'always' | 'outside_hours'

  // Respostas Rápidas
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([
    { id: '1', shortcut: '/ola', text: 'Olá! Como posso ser útil hoje no Telegram Business?' },
    { id: '2', shortcut: '/estrelas', text: 'Você pode adquirir e resgatar Telegram Stars na aba Stars e Carteira com liquidação instantânea.' },
    { id: '3', shortcut: '/suporte', text: 'Nosso atendimento oficial está disponível 24 horas por dia, 7 dias por semana.' },
    { id: '4', shortcut: '/plano', text: 'Consulte os bots de rendimento e ferramentas VIP na aba Bots & Planos.' },
  ]);
  const [newShortcut, setNewShortcut] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [showAddQuick, setShowAddQuick] = useState(false);

  // Carregar dados do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tg_auto_messages');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.greetingEnabled !== undefined) setGreetingEnabled(data.greetingEnabled);
        if (data.greetingText) setGreetingText(data.greetingText);
        if (data.awayEnabled !== undefined) setAwayEnabled(data.awayEnabled);
        if (data.awayText) setAwayText(data.awayText);
        if (data.awaySchedule) setAwaySchedule(data.awaySchedule);
        if (data.quickReplies) setQuickReplies(data.quickReplies);
      }
    } catch {}
  }, []);

  // Salvar no localStorage
  const handleSave = () => {
    try {
      const payload = {
        greetingEnabled,
        greetingText,
        awayEnabled,
        awayText,
        awaySchedule,
        quickReplies,
      };
      localStorage.setItem('tg_auto_messages', JSON.stringify(payload));
      showToast('Configurações de Mensagens Automáticas salvas!', 'success');
      onClose();
    } catch {
      showToast('Erro ao salvar configurações', 'error');
    }
  };

  const handleAddQuickReply = () => {
    if (!newShortcut.trim() || !newReplyText.trim()) {
      showToast('Preencha o atalho e o texto da resposta rápida', 'info');
      return;
    }
    const cleanShortcut = newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`;
    const newEntry: QuickReply = {
      id: Date.now().toString(),
      shortcut: cleanShortcut.toLowerCase(),
      text: newReplyText.trim(),
    };
    setQuickReplies([...quickReplies, newEntry]);
    setNewShortcut('');
    setNewReplyText('');
    setShowAddQuick(false);
    showToast(`Atalho ${cleanShortcut} adicionado com sucesso!`, 'success');
  };

  const handleDeleteQuickReply = (id: string) => {
    setQuickReplies(quickReplies.filter(q => q.id !== id));
    showToast('Resposta rápida removida', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-[460px] bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* Header Oficial Telegram Business */}
        <div className="px-4 py-3.5 bg-[#517da2] dark:bg-[#242f3d] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[16px] leading-tight">Telegram Business</h3>
              <p className="text-[11.5px] text-white/80">Mensagens Automáticas & Respostas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex border-b border-gray-100 dark:border-[#202b36] bg-gray-50/50 dark:bg-[#121921] px-2 pt-2">
          <button
            onClick={() => setActiveTab('greeting')}
            className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'greeting'
                ? 'border-[#2481cc] text-[#2481cc]'
                : 'border-transparent text-[#707579] hover:text-black dark:hover:text-white'
            }`}
          >
            Saudação
          </button>
          <button
            onClick={() => setActiveTab('away')}
            className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'away'
                ? 'border-[#2481cc] text-[#2481cc]'
                : 'border-transparent text-[#707579] hover:text-black dark:hover:text-white'
            }`}
          >
            Ausência
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'quick'
                ? 'border-[#2481cc] text-[#2481cc]'
                : 'border-transparent text-[#707579] hover:text-black dark:hover:text-white'
            }`}
          >
            Respostas Rápidas
          </button>
        </div>

        {/* Conteúdo da Tab */}
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4 text-[#222222] dark:text-[#f0f2f5]">
          
          {/* TAB 1: SAUDAÇÃO */}
          {activeTab === 'greeting' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#202b36] p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <h4 className="font-semibold text-[14.5px]">Enviar Mensagem de Saudação</h4>
                  <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5]">
                    Envia automaticamente quando clientes enviarem a primeira mensagem.
                  </p>
                </div>
                <button
                  onClick={() => setGreetingEnabled(!greetingEnabled)}
                  className="cursor-pointer"
                >
                  {greetingEnabled ? (
                    <div className="w-11 h-6 bg-[#2481cc] rounded-full p-0.5 flex justify-end">
                      <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                    </div>
                  ) : (
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full p-0.5 flex justify-start">
                      <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                    </div>
                  )}
                </button>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-[#707579] uppercase block mb-1.5">
                  Texto da Mensagem de Boas-Vindas
                </label>
                <textarea
                  value={greetingText}
                  onChange={(e) => setGreetingText(e.target.value)}
                  rows={4}
                  className="w-full text-[14px] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202b36] text-black dark:text-white outline-none focus:border-[#2481cc] transition-colors resize-none"
                  placeholder="Digite sua mensagem de saudação comercial..."
                />
              </div>

              {/* Preview no balão do Telegram */}
              <div>
                <span className="text-[11.5px] text-[#707579] block mb-1">Pré-visualização do Balão:</span>
                <div className="bg-[#8cb0c9] dark:bg-[#0e1621] p-3 rounded-xl flex justify-start">
                  <div className="bg-white dark:bg-[#182533] text-black dark:text-white p-2.5 rounded-2xl rounded-bl-xs text-[13.5px] max-w-[90%] shadow-sm">
                    <span className="text-[11px] font-bold text-[#2481cc] block mb-0.5">Auto Resposta • Telegram Business</span>
                    {greetingText || "Mensagem de saudação..."}
                    <span className="text-[10px] text-gray-400 block text-right mt-1">12:00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUSÊNCIA */}
          {activeTab === 'away' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-[#202b36] p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <h4 className="font-semibold text-[14.5px]">Enviar Mensagem de Ausência</h4>
                  <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5]">
                    Responde quando você estiver offline ou fora de horário.
                  </p>
                </div>
                <button
                  onClick={() => setAwayEnabled(!awayEnabled)}
                  className="cursor-pointer"
                >
                  {awayEnabled ? (
                    <div className="w-11 h-6 bg-[#2481cc] rounded-full p-0.5 flex justify-end">
                      <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                    </div>
                  ) : (
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full p-0.5 flex justify-start">
                      <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                    </div>
                  )}
                </button>
              </div>

              <div>
                <label className="text-[12.5px] font-semibold text-[#707579] uppercase block mb-1.5">
                  Texto da Mensagem de Ausência
                </label>
                <textarea
                  value={awayText}
                  onChange={(e) => setAwayText(e.target.value)}
                  rows={4}
                  className="w-full text-[14px] p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202b36] text-black dark:text-white outline-none focus:border-[#2481cc] transition-colors resize-none"
                  placeholder="Digite sua mensagem de ausência..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12.5px] font-semibold text-[#707579] uppercase block">
                  Programação de Horário
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAwaySchedule('always')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      awaySchedule === 'always'
                        ? 'border-[#2481cc] bg-[#2481cc]/10 text-[#2481cc]'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Sempre Ativa
                  </button>
                  <button
                    onClick={() => setAwaySchedule('outside_hours')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      awaySchedule === 'outside_hours'
                        ? 'border-[#2481cc] bg-[#2481cc]/10 text-[#2481cc]'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Fora do Horário (18h às 09h)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESPOSTAS RÁPIDAS */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[14.5px]">Respostas Rápidas</h4>
                  <p className="text-[12px] text-[#707579] dark:text-[#8e9aa5]">
                    Digite atalhos como <code className="text-[#2481cc] font-mono">/ola</code> no chat para enviar instantaneamente.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddQuick(!showAddQuick)}
                  className="px-3 py-1.5 bg-[#2481cc] text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* Formulário Novo Atalho */}
              {showAddQuick && (
                <div className="p-3 bg-gray-50 dark:bg-[#202b36] rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 animate-in fade-in">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Atalho (ex: /preco)"
                      value={newShortcut}
                      onChange={(e) => setNewShortcut(e.target.value)}
                      className="w-1/3 text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#17212b] text-black dark:text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Texto completo que será enviado..."
                      value={newReplyText}
                      onChange={(e) => setNewReplyText(e.target.value)}
                      className="flex-1 text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#17212b] text-black dark:text-white outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowAddQuick(false)}
                      className="px-3 py-1 text-xs text-gray-500 hover:text-black dark:hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddQuickReply}
                      className="px-3 py-1 bg-[#2481cc] text-white text-xs font-semibold rounded-lg"
                    >
                      Gravar Atalho
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Atalhos */}
              <div className="space-y-2">
                {quickReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#202b36] border border-gray-100 dark:border-gray-800 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-bold text-xs text-[#2481cc] bg-[#2481cc]/10 px-2 py-0.5 rounded-md inline-block mb-1">
                        {reply.shortcut}
                      </span>
                      <p className="text-[13px] text-gray-700 dark:text-gray-200 leading-snug">
                        {reply.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onTestInChat && (
                        <button
                          onClick={() => {
                            onTestInChat(reply.text);
                            onClose();
                          }}
                          className="p-1.5 text-[#2481cc] hover:bg-[#2481cc]/10 rounded-lg transition-colors"
                          title="Enviar no chat agora"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQuickReply(reply.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Excluir atalho"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer com Botões */}
        <div className="p-3.5 border-t border-gray-100 dark:border-[#202b36] bg-gray-50 dark:bg-[#17212b] flex items-center justify-between">
          <span className="text-[11.5px] text-[#707579] flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-500" /> Sincronizado na Nuvem
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#707579] hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-[#2481cc] hover:bg-[#1f72b5] text-white rounded-lg shadow-sm cursor-pointer active:scale-95"
            >
              Salvar Alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
