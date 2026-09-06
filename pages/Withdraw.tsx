import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Send, Loader2, HelpCircle, ChevronDown } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;
const FEE_PERCENT = 10;
const CHAT_STORAGE_KEY = 'telegram_withdraw_bot_v1';

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/saldo', '/carteira',
  '/retirar', '/sacar', '/retirada', '/saque',
  '/banco', '/iban',
  '/horario',
  '/taxa', '/taxas', '/limites', '/regras',
  '/historico',
  '/limpar', '/reset', '/clear',
  '/cancelar',
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd);
}

const isWithdrawAllowed = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};

const getWithdrawScheduleText = (): string => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day >= 1 && day <= 5 && hour >= 9 && hour < 18) return 'Aberto agora — Seg a Sex, 09:00-18:00';
  const dayNames = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
  return `Fechado agora (${dayNames[day]}, ${String(hour).padStart(2,'0')}h) — Retorna Seg a Sex, 09:00-18:00`;
};

interface WithdrawInfo {
  balance: number;
  hasBank: boolean;
  bankId: string | null;
  bankName: string;
  iban: string;
  isVerified: boolean;
  hasPending: boolean;
  hasBots: boolean;
  totalDailyIncome: number;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text?: string;
  type: 'welcome' | 'text' | 'confirm_withdraw';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDay(): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
}

export default function Withdraw() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [info, setInfo] = useState<WithdrawInfo>({
    balance: 0, hasBank: false, bankId: null, bankName: '', iban: '',
    isVerified: false, hasPending: false, hasBots: false, totalDailyIncome: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)); } catch (e) {}
    }
  }, [messages]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_withdraw_info_mcpn');
      let loaded: WithdrawInfo = {
        balance: 0, hasBank: false, bankId: null, bankName: '', iban: '',
        isVerified: false, hasPending: false, hasBots: false, totalDailyIncome: 0,
      };
      if (!error && data && data.length > 0) {
        const d = data[0];
        loaded.balance = Number(d.balance) || 0;
        loaded.hasBank = Boolean(d.has_bank);
        loaded.bankId = d.bank_id || null;
        loaded.bankName = d.bank_name || '';
        loaded.iban = d.iban || '';
        loaded.isVerified = Boolean(d.is_verified);
        loaded.hasPending = Boolean(d.has_pending);
      }
      if (!loaded.hasBank) {
        const { data: bankAccounts } = await supabase.rpc('get_my_bank_accounts_mcpn');
        if (bankAccounts && bankAccounts.length > 0) {
          const first = bankAccounts[0];
          loaded.hasBank = true;
          loaded.bankId = first.id || null;
          loaded.bankName = first.bank_name || '';
          loaded.iban = first.iban || '';
        }
      }
      const { data: myBots } = await supabase.rpc('get_my_purchased_products_mcpn');
      if (myBots && Array.isArray(myBots)) {
        const activeBots = myBots.filter((b: any) => Boolean(b.ativo));
        loaded.hasBots = activeBots.length > 0;
        loaded.totalDailyIncome = activeBots.reduce((acc: number, b: any) => acc + (Number(b.renda_diaria) || 0), 0);
      }
      setInfo(loaded);
      return loaded;
    } catch (err) {
      console.error('Erro ao carregar dados de retirada:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    async function initChat() {
      await fetchData();
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) { setMessages(parsed); return; }
        }
      } catch (e) {}
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([{ id: 'welcome-withdraw', sender: 'bot', time: nowTime(), type: 'welcome' }]);
      }, 600);
    }
    initChat();
  }, [fetchData]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 700) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  const processWithdrawal = useCallback(async (amount: number) => {
    if (!info.bankId) {
      botReply(() => ({
        id: 'bot-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
        text: 'Banco nao vinculado. Cadastre o seu banco primeiro.',
      }));
      return;
    }
    setIsProcessing(true);
    setIsTyping(true);
    try {
      const { data, error } = await supabase.rpc('process_withdrawal_request', {
        p_amount: amount, p_bank_id: info.bankId, p_password: ''
      }) as { data: { success: boolean; message: string } | null; error: any };
      if (error) throw error;
      setIsTyping(false);
      if (data?.success) {
        const fee = Math.round(amount * FEE_PERCENT / 100);
        const net = amount - fee;
        showToast('Pedido de retirada submetido com sucesso!', 'success');
        setInfo((prev) => ({ ...prev, balance: prev.balance - amount, hasPending: true }));
        setMessages((prev) => [...prev, {
          id: 'success-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
          text: 'Pedido Enviado!\n\nValor solicitado: ' + formatCurrency(amount, 'KZ') + '\nTaxa (10%): -' + formatCurrency(fee, 'KZ') + '\nValor a receber: ' + formatCurrency(net, 'KZ') + '\nBanco: ' + info.bankName + '\nIBAN: ' + info.iban + '\n\nPagamento processado em ate 24 horas uteis.',
        }]);
        setPendingAmount(null);
      } else {
        const msg = data?.message || 'Falha ao processar retirada.';
        showToast(msg, 'error');
        setMessages((prev) => [...prev, {
          id: 'err-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
          text: msg + '\n\nEnvie /retirar para tentar novamente.',
        }]);
        setPendingAmount(null);
      }
    } catch (err: any) {
      setIsTyping(false);
      const msg = err.message || 'Erro de conexao.';
      showToast(msg, 'error');
      setMessages((prev) => [...prev, {
        id: 'err-catch-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
        text: 'Erro: ' + msg,
      }]);
      setPendingAmount(null);
    } finally {
      setIsProcessing(false);
    }
  }, [info, botReply, showToast]);

  const handleSendMessage = useCallback((textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(), sender: 'user', time: nowTime(), text: content, type: 'text',
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    const raw = content.toLowerCase().replace(/^\//, '').trim();

    if (pendingAmount !== null) {
      if (['sim','confirmar','confirma','yes','s'].includes(raw)) {
        processWithdrawal(pendingAmount); return;
      }
      if (['nao','nao','cancelar','n','no'].includes(raw)) {
        setPendingAmount(null);
        botReply(() => ({ id: 'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Retirada cancelada. Envie /retirar quando quiser tentar novamente.' }));
        return;
      }
      const newAmt = parseInt(raw.replace(/\D/g,''));
      if (!isNaN(newAmt) && newAmt > 0) {
        setPendingAmount(newAmt);
        const fee = Math.round(newAmt * FEE_PERCENT / 100);
        const net = newAmt - fee;
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'confirm_withdraw', payload:{ amount:newAmt, fee, net, bankName:info.bankName, iban:info.iban } }));
        return;
      }
    }

    const numericOnly = parseInt(raw.replace(/\D/g,''));

    if (['start','inicio','ajuda','help','menu','oi','ola'].includes(raw)) {
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'welcome' })); return;
    }

    if (['saldo','carteira','ver saldo','meu saldo'].some(k => raw === k || raw.includes(k))) {
      botReply(() => ({
        id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text',
        text: 'Saldo disponivel: ' + formatCurrency(info.balance,'KZ') + '\nRenda diaria: +' + formatCurrency(info.totalDailyIncome,'KZ') + ' / dia\nHorario: ' + getWithdrawScheduleText() + '\n\n' + (info.balance >= MIN_WITHDRAW ? 'Voce tem saldo para retirar. Envie /retirar para iniciar.' : 'Minimo de retirada: ' + formatCurrency(MIN_WITHDRAW,'KZ') + '. Continue acumulando com os seus robos!'),
      })); return;
    }

    if (['retirar','sacar','retirada','saque','quero retirar','fazer retirada'].some(k => raw === k || raw.includes(k))) {
      if (info.hasPending) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Voce ja tem um pedido pendente. Aguarde a aprovacao antes de solicitar outro.\n\nEnvie /historico para ver seus pedidos.' })); return;
      }
      if (!isWithdrawAllowed()) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Retiradas disponiveis apenas de Segunda a Sexta, das 09:00 as 18:00.\n\n' + getWithdrawScheduleText() })); return;
      }
      if (!info.hasBank) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Banco nao vinculado. Envie /banco para mais informacoes.' })); return;
      }
      if (!info.hasBots) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Nenhum robo ativo. Para retirar, e necessario ter pelo menos um robo ativo na sua conta.' })); return;
      }
      if (info.balance < MIN_WITHDRAW) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Saldo insuficiente: ' + formatCurrency(info.balance,'KZ') + '. Minimo: ' + formatCurrency(MIN_WITHDRAW,'KZ') + '.\n\nSeus robos geram +' + formatCurrency(info.totalDailyIncome,'KZ') + ' / dia.' })); return;
      }
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Verificacao concluida!\n\nRobos ativos: OK\nBanco: ' + info.bankName + '\nSaldo: ' + formatCurrency(info.balance,'KZ') + '\nHorario: ' + getWithdrawScheduleText() + '\n\nInforme o valor que deseja retirar:\n(Minimo: ' + formatCurrency(MIN_WITHDRAW,'KZ') + ' / Maximo: ' + formatCurrency(MAX_WITHDRAW,'KZ') + ')' })); return;
    }

    if (['banco','iban','meuiban'].some(k => raw === k || raw.includes(k))) {
      if (info.hasBank) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Conta bancaria vinculada:\nBanco: ' + info.bankName + '\nIBAN: ' + info.iban + '\n\nConta configurada para receber retiradas.' }));
      } else {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Nenhum banco vinculado. Acesse Configuracoes > Adicionar Banco.' }));
      }
      return;
    }

    if (['horario','horarios'].some(k => raw === k || raw.includes(k))) {
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Horario de Retiradas:\nDias: Segunda a Sexta\nHoras: 09:00 as 18:00\nStatus: ' + getWithdrawScheduleText() + '\n\nSuporte 24/7 pelo Telegram e WhatsApp.' })); return;
    }

    if (['taxa','taxas','limites','regras','instrucoes'].some(k => raw === k || raw.includes(k))) {
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Regras de Retirada:\nMinimo: ' + formatCurrency(MIN_WITHDRAW,'KZ') + '\nMaximo: ' + formatCurrency(MAX_WITHDRAW,'KZ') + '\nTaxa operacional: ' + FEE_PERCENT + '%\nPrazo: ate 24 horas uteis\n\nExemplo: Retirada de 1.000 Kz > Taxa: 100 Kz > Recebe: 900 Kz' })); return;
    }

    if (['historico','retiradas'].some(k => raw === k || raw.includes(k))) {
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Historico de Retiradas\n\n' + (info.hasPending ? 'Voce tem um pedido pendente no momento.' : 'Nenhum pedido pendente.') + '\n\nPara ver o historico completo, acesse Perfil > Registos de Retirada.' })); return;
    }

    if (raw === 'cancelar') {
      setPendingAmount(null);
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Operacao cancelada. Envie /ajuda para ver todos os comandos.' })); return;
    }

    if (['limpar','reset','clear'].includes(raw)) {
      try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
      setPendingAmount(null);
      setMessages([{ id:'welcome-'+Date.now(), sender:'bot', time:nowTime(), type:'welcome' }]);
      showToast('Conversa reiniciada.', 'success'); return;
    }

    if (!isNaN(numericOnly) && numericOnly >= 1 && raw.replace(/\D/g,'') === raw) {
      const amount = numericOnly;
      if (amount < MIN_WITHDRAW) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'O valor ' + formatCurrency(amount,'KZ') + ' e inferior ao minimo (' + formatCurrency(MIN_WITHDRAW,'KZ') + ').' })); return;
      }
      if (amount > MAX_WITHDRAW) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'O valor ' + formatCurrency(amount,'KZ') + ' excede o limite maximo (' + formatCurrency(MAX_WITHDRAW,'KZ') + ').' })); return;
      }
      if (amount > info.balance) {
        botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Saldo insuficiente. Voce tentou retirar ' + formatCurrency(amount,'KZ') + ' mas tem apenas ' + formatCurrency(info.balance,'KZ') + '.' })); return;
      }
      const fee = Math.round(amount * FEE_PERCENT / 100);
      const net = amount - fee;
      setPendingAmount(amount);
      botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'confirm_withdraw', payload:{ amount, fee, net, bankName:info.bankName, iban:info.iban } })); return;
    }

    botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Nao entendi. Envie /ajuda para ver os comandos, ou /retirar para iniciar uma retirada.' }));
  }, [inputText, info, pendingAmount, processWithdrawal, botReply, showToast]);

  const handleConfirmButton = useCallback(() => {
    if (pendingAmount == null) return;
    setMessages((prev) => [...prev, { id:'usr-confirm-'+Date.now(), sender:'user', time:nowTime(), text:'Confirmar Retirada', type:'text' }]);
    processWithdrawal(pendingAmount);
  }, [pendingAmount, processWithdrawal]);

  const handleCancelButton = useCallback(() => {
    setPendingAmount(null);
    setMessages((prev) => [...prev, { id:'usr-cancel-'+Date.now(), sender:'user', time:nowTime(), text:'Cancelar', type:'text' }]);
    botReply(() => ({ id:'bot-'+Date.now(), sender:'bot', time:nowTime(), type:'text', text:'Retirada cancelada. Envie /retirar quando quiser tentar novamente.' }));
  }, [botReply]);

  const renderBotText = (text: string) => {
    return text.split('\n').map((line, lIdx, arr) => {
      const parts = line.split(/(\*\*.*?\*\*|`[^`]+`|\/[-_a-zA-Z0-9]+)/g);
      return (
        <span key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={pIdx}>{part.slice(2,-2)}</strong>;
            if (part.startsWith('`') && part.endsWith('`')) return <code key={pIdx} className="font-mono text-[12.5px] bg-gray-100 px-1 py-0.5 rounded text-[#2481cc]">{part.slice(1,-1)}</code>;
            if (part.startsWith('/') && VALID_COMMANDS.has(part.toLowerCase())) {
              return <span key={pIdx} onClick={() => handleSendMessage(part)} className="text-[#3390ec] font-medium cursor-pointer hover:underline">{part}</span>;
            }
            return part;
          })}
          {lIdx < arr.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden select-none" style={{ fontFamily:"-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}>

      {/* HEADER */}
      <header className="w-full bg-white px-3 py-2 shrink-0 z-30 flex items-center justify-between border-b border-gray-200/60" style={{ boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-black hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer relative" aria-label="Voltar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#3390ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">1</span>
          </button>

          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ background:'linear-gradient(135deg,#2481cc,#1a5fa3)' }}>
            <span className="text-white text-[20px]">💸</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-black leading-tight">WithdrawBot</span>
              <svg className="w-4 h-4 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span onClick={() => handleSendMessage('/saldo')} className="text-[12px] text-[#707579] truncate cursor-pointer hover:text-[#3390ec] transition-colors">
              {loading ? 'Carregando...' : `Saldo: ${formatCurrency(info.balance,'KZ')}`}
            </span>
          </div>
        </div>

        <button className="p-1.5 text-[#707579] hover:bg-gray-100 rounded-full cursor-pointer">
          <MoreVertical className="w-5 h-5"/>
        </button>
      </header>

      {/* CHAT BODY */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 relative select-text"
        style={{
          backgroundColor:'#8ea78f',
          backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236f8a70' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        <div className="flex justify-center my-1 select-none">
          <span className="text-white text-[11.5px] font-medium px-3 py-0.5 rounded-full" style={{ background:'rgba(91,122,94,0.7)' }}>{getCurrentDay()}</span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          if (isUser) {
            const isCmd = msg.text?.trim().startsWith('/');
            const isValid = isCmd && isRecognizedCommand(msg.text || '');
            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div className="bg-[#effdde] rounded-[16px] rounded-br-[4px] px-3.5 py-1.5 max-w-[85%] relative select-text flex items-baseline gap-2" style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>
                  <p className={`text-[15px] leading-snug whitespace-pre-line ${isValid ? 'text-[#2481cc] font-medium' : 'text-black font-normal'}`}>{msg.text}</p>
                  <div className="flex items-center gap-1 shrink-0 text-[11px] text-[#537c3e] select-none ml-1">
                    <span>{msg.time}</span>
                    <span className="text-[#3ca3e8] font-bold text-[12px] leading-none">✓✓</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col items-start mb-2 max-w-[92%] sm:max-w-[85%]">
              <div className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2.5 text-gray-900 w-full relative select-text" style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>

                {msg.type === 'welcome' && (
                  <div className="text-[14.5px] text-gray-950 leading-relaxed font-normal">
                    <p className="mb-2">Ola! Sou o <strong>WithdrawBot</strong> 💸</p>
                    <p className="mb-2.5 text-gray-800">Sou o assistente de retiradas. Consulto saldo, verifico seu banco, informo horarios e processo sua retirada de forma conversacional.</p>
                    <p className="mb-1 font-bold text-gray-950">Comandos Disponiveis:</p>
                    <p className="mb-2.5">
                      • <span onClick={() => handleSendMessage('/saldo')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/saldo</span> — Ver saldo e renda diaria<br/>
                      • <span onClick={() => handleSendMessage('/retirar')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/retirar</span> — Iniciar pedido de retirada<br/>
                      • <span onClick={() => handleSendMessage('/banco')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/banco</span> — Ver banco e IBAN vinculado<br/>
                      • <span onClick={() => handleSendMessage('/horario')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/horario</span> — Horario e status<br/>
                      • <span onClick={() => handleSendMessage('/taxa')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/taxa</span> — Taxa, minimos e maximos<br/>
                      • <span onClick={() => handleSendMessage('/historico')} className="text-[#3390ec] font-semibold cursor-pointer hover:underline">/historico</span> — Historico de retiradas
                    </p>
                    <p className="text-[#707579] text-[13px] pt-1.5 border-t border-gray-100">
                      {isWithdrawAllowed() ? 'Retiradas abertas agora! Envie /retirar para comecar.' : 'Retiradas fechadas agora. Abrem Seg-Sex, 09:00-18:00.'}
                    </p>
                  </div>
                )}

                {msg.type === 'text' && msg.text && (
                  <div className="text-[14.5px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                {msg.type === 'confirm_withdraw' && msg.payload && (
                  <div className="text-[14.5px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">Resumo da Retirada</p>
                    <p className="text-[13.5px] text-gray-800">
                      • <strong>Valor solicitado:</strong> {formatCurrency(msg.payload.amount,'KZ')}<br/>
                      • <strong>Taxa operacional (10%):</strong> -{formatCurrency(msg.payload.fee,'KZ')}<br/>
                      • <strong>Valor a receber:</strong> <span className="text-[#25ae60] font-bold">{formatCurrency(msg.payload.net,'KZ')}</span><br/>
                      • <strong>Banco:</strong> {msg.payload.bankName}<br/>
                      • <strong>IBAN:</strong> <code className="font-mono text-[12px] text-[#2481cc] bg-gray-50 px-1 rounded">{msg.payload.iban}</code>
                    </p>
                    <p className="mt-2 text-[13px] text-gray-600">Confirma a retirada? Responda <strong>Sim</strong> ou <strong>Nao</strong>.</p>
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#707579] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>

              {msg.type === 'confirm_withdraw' && pendingAmount !== null && (
                <div className="w-full mt-1.5 flex gap-2 select-none">
                  <button onClick={handleConfirmButton} disabled={isProcessing}
                    className="flex-1 bg-white hover:bg-green-50 active:bg-green-100 rounded-[8px] py-2.5 px-3 text-[13.5px] font-semibold text-[#25ae60] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>
                    {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin"/><span>Processando...</span></> : <span>Confirmar Retirada</span>}
                  </button>
                  <button onClick={handleCancelButton} disabled={isProcessing}
                    className="flex-1 bg-white hover:bg-red-50 active:bg-red-100 rounded-[8px] py-2.5 px-3 text-[13.5px] font-semibold text-[#e53935] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                    style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>
                    Cancelar
                  </button>
                </div>
              )}

              {msg.type === 'welcome' && (
                <div className="w-full mt-1.5 select-none">
                  <button onClick={() => handleSendMessage('/retirar')}
                    className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2.5 px-3 text-[13.5px] font-bold text-[#2481cc] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>
                    Iniciar Pedido de Retirada
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5" style={{ boxShadow:'0 1px 2px rgba(16,35,47,0.15)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay:'0ms' }}/>
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay:'150ms' }}/>
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay:'300ms' }}/>
              <span className="text-[11.5px] text-[#707579] ml-1">WithdrawBot esta digitando...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef}/>
      </main>

      {showScrollDown && (
        <button onClick={() => chatBottomRef.current?.scrollIntoView({ behavior:'smooth' })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#707579] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer"
          style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }}>
          <ChevronDown className="w-5 h-5"/>
        </button>
      )}

      {/* FOOTER */}
      <footer className="bg-white px-2 py-2 shrink-0 z-30 flex items-center gap-2 border-t border-gray-200">
        <button onClick={() => handleSendMessage('/retirar')}
          className="h-[38px] px-3.5 rounded-[8px] bg-[#3390ec] hover:bg-[#2881dc] active:bg-[#1d6fae] text-white text-[13.5px] font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          style={{ boxShadow:'0 1px 4px rgba(51,144,236,0.3)' }}>
          <span>Retirar</span>
        </button>

        <div className="flex-1 flex items-center bg-transparent px-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              if (pendingAmount !== null && /^\d*$/.test(e.target.value)) { setInputText(e.target.value); }
              else if (pendingAmount === null) { setInputText(e.target.value); }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
            placeholder={pendingAmount !== null ? 'Novo valor ou Sim / Nao...' : 'Mensagem...'}
            className="w-full bg-transparent text-[15px] text-black placeholder-gray-400 outline-none"
          />
        </div>

        <button onClick={() => handleSendMessage('/ajuda')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] hover:text-[#3390ec] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Ajuda">
          <HelpCircle className="w-5 h-5"/>
        </button>

        <button onClick={() => handleSendMessage()}
          className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2881dc] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer"
          aria-label="Enviar mensagem"
          style={{ boxShadow:'0 1px 4px rgba(51,144,236,0.3)' }}>
          <Send className="w-4 h-4 -ml-0.5"/>
        </button>
      </footer>
    </div>
  );
}
