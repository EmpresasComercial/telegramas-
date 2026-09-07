import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MoreVertical, 
  Send, 
  Loader2, 
  HelpCircle, 
  ChevronDown, 
  ExternalLink,
  PlusCircle,
  Clock,
  Wallet,
  Building2,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowDownLeft
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;
const FEE_PERCENT = 10;
const CHAT_STORAGE_KEY = 'telegram_withdraw_bot_v2';

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/saldo', '/carteira',
  '/retirar', '/sacar', '/retirada', '/saque',
  '/banco', '/iban', '/conta',
  '/horario', '/horarios',
  '/taxa', '/taxas', '/limites', '/regras',
  '/historico', '/registos',
  '/limpar', '/reset', '/clear',
  '/cancelar'
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

const getWithdrawScheduleStatus = (): { isOpen: boolean; text: string } => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  if (isOpen) {
    return { isOpen: true, text: 'Aberto agora — Seg a Sex, 09:00 às 18:00' };
  }
  const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return { 
    isOpen: false, 
    text: `Fechado agora (${dayNames[day]}, ${String(hour).padStart(2, '0')}h) — Retorna Seg a Sex, 09:00 às 18:00` 
  };
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
  type: 'welcome' | 'text' | 'confirm_withdraw' | 'amount_selector' | 'no_bank' | 'no_bots' | 'history_list';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export default function Withdraw() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [info, setInfo] = useState<WithdrawInfo>({
    balance: 0,
    hasBank: false,
    bankId: null,
    bankName: '',
    iban: '',
    isVerified: false,
    hasPending: false,
    hasBots: false,
    totalDailyIncome: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [lastBotResponse, setLastBotResponse] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {}
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
        balance: 0,
        hasBank: false,
        bankId: null,
        bankName: '',
        iban: '',
        isVerified: false,
        hasPending: false,
        hasBots: false,
        totalDailyIncome: 0,
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
        loaded.totalDailyIncome = activeBots.reduce(
          (acc: number, b: any) => acc + (Number(b.renda_diaria) || 0),
          0
        );
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {}

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: 'welcome-init',
            sender: 'bot',
            time: nowTime(),
            type: 'welcome',
          },
        ]);
      }, 500);
    }

    initChat();
  }, [fetchData]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 600) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  const processWithdrawal = useCallback(
    async (amount: number) => {
      if (!info.bankId) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'no_bank',
          text: 'Opa! Antes de prosseguir, você só precisa cadastrar sua conta bancária primeiro 🏦 É super rápido!',
        }));
        return;
      }

      setIsProcessing(true);
      setIsTyping(true);

      try {
        const { data, error } = (await supabase.rpc('process_withdrawal_request', {
          p_amount: amount,
          p_bank_id: info.bankId,
          p_password: '',
        })) as { data: { success: boolean; message: string } | null; error: any };

        if (error) throw error;
        setIsTyping(false);

        if (data?.success) {
          const fee = Math.round((amount * FEE_PERCENT) / 100);
          const net = amount - fee;
          showToast('Retirada enviada com sucesso!', 'success');

          setInfo((prev) => ({
            ...prev,
            balance: Math.max(0, prev.balance - amount),
            hasPending: true,
          }));

          setMessages((prev) => [
            ...prev,
            {
              id: 'success-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text:
                'Maravilha! Seu pedido de retirada foi enviado com sucesso! 🎉🥳\n\n' +
                '• **Valor solicitado:** ' + formatCurrency(amount, 'KZ') + '\n' +
                '• **Taxa operacional (10%):** -' + formatCurrency(fee, 'KZ') + '\n' +
                '• **Valor que vai cair na conta:** **' + formatCurrency(net, 'KZ') + '** 💵\n' +
                '• **Banco:** ' + info.bankName + '\n' +
                '• **IBAN:** `' + info.iban + '`\n\n' +
                'O pagamento será conferido e creditado em até **24 horas úteis**. Terei muito gosto em atendê-lo novamente sempre que precisar! 😊',
            },
          ]);
          setPendingAmount(null);
        } else {
          const msg = data?.message || 'Não foi possível concluir a solicitação.';
          showToast(msg, 'error');
          setMessages((prev) => [
            ...prev,
            {
              id: 'err-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: 'Ops! ' + msg + '\n\nQuando quiser tentar novamente, é só me enviar /retirar 😊',
            },
          ]);
          setPendingAmount(null);
        }
      } catch (err: any) {
        setIsTyping(false);
        const msg = err.message || 'Tivemos uma oscilação na conexão.';
        showToast(msg, 'error');
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-catch-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Ops! Ocorreu um pequeno erro: ' + msg + '\n\nPor favor, tente novamente em instantes 😊',
          },
        ]);
        setPendingAmount(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [info, botReply, showToast]
  );

  const fetchRecentHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_withdrawals_mcpn');
      if (error) throw error;
      const list = Array.isArray(data) ? data.slice(0, 4) : [];
      return list;
    } catch {
      return [];
    }
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: content,
        type: 'text',
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');
      const raw = content.toLowerCase().replace(/^\//, '').trim();

      const withCmds = (text: string) =>
        text +
        '\n\n─────────────────\n' +
        '/retirar  /saldo  /historico\n/banco  /taxa  /horario  /ajuda';

      if (pendingAmount !== null) {
        if (['sim', 'confirmar', 'confirma', 'yes', 's', 'ok', 'prosseguir', 'quero'].includes(raw)) {
          processWithdrawal(pendingAmount);
          return;
        }
        if (['nao', 'não', 'cancelar', 'cancela', 'n', 'no', 'deixa'].includes(raw)) {
          setPendingAmount(null);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: withCmds('Tudo bem! Cancelei a solicitação. Quando quiser realizar uma nova retirada, é só enviar /retirar 😊'),
          }));
          return;
        }
        const newAmt = parseInt(raw.replace(/\D/g, ''));
        if (!isNaN(newAmt) && newAmt >= MIN_WITHDRAW && newAmt <= MAX_WITHDRAW) {
          if (newAmt > info.balance) {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'text',
              text: withCmds(`Quase lá! Mas seu saldo disponível é de ${formatCurrency(info.balance, 'KZ')}. Escolha um valor até esse limite 😉`),
            }));
            return;
          }
          setPendingAmount(newAmt);
          const fee = Math.round((newAmt * FEE_PERCENT) / 100);
          const net = newAmt - fee;
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'confirm_withdraw',
            payload: { amount: newAmt, fee, net, bankName: info.bankName, iban: info.iban },
          }));
          return;
        }
      }

      const trimmedInput = content.toLowerCase();

      if (['/start', '/inicio', '/ajuda', '/help', '/menu', 'start', 'inicio', 'ajuda', 'help', 'menu', 'oi', 'olá', 'ola'].includes(trimmedInput)) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'welcome',
        }));
        return;
      }

      if (['/limpar', '/reset', '/clear', 'limpar', 'reset', 'clear'].includes(trimmedInput)) {
        try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
        setPendingAmount(null);
        setMessages([{ id: 'welcome-' + Date.now(), sender: 'bot', time: nowTime(), type: 'welcome' }]);
        showToast('Conversa reiniciada!', 'success');
        return;
      }

      if (trimmedInput === '/cancelar' || raw === 'cancelar') {
        setPendingAmount(null);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: withCmds('Tudo bem! Operação cancelada. Se precisar de algo, é só me chamar 😊'),
        }));
        return;
      }

      if (['/saldo', '/carteira', 'saldo', 'carteira', 'meu saldo', 'ver saldo'].includes(trimmedInput)) {
        const freshData = await fetchData();
        const bal = freshData?.balance ?? info.balance;
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: withCmds(
            `💰 **Seu saldo disponível:**\n\n**${formatCurrency(bal, 'KZ')}**\n\nPara realizar um saque, envie /retirar 😊`
          ),
        }));
        return;
      }

      if (['/historico', '/registos', '/extrato', 'historico', 'histórico', 'registos', 'extrato', 'historicos', 'históricos'].includes(trimmedInput)) {
        setIsTyping(true);
        const history = await fetchRecentHistory();
        setIsTyping(false);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'history_list',
          text: withCmds('📋 Aqui estão seus últimos pedidos de retirada:'),
          payload: { list: history },
        }));
        return;
      }

      if (['/banco', '/iban', '/conta', 'banco', 'iban', 'conta'].includes(trimmedInput)) {
        if (!info.hasBank) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bank',
            text: withCmds('🏦 Você ainda não tem uma conta bancária cadastrada. Cadastre agora para poder realizar saques:'),
          }));
        } else {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: withCmds(
              `🏦 **Sua conta bancária:**\n\n• **Banco:** ${info.bankName}\n• **IBAN:** \`${info.iban}\`\n\nPara sacar, envie /retirar 😊`
            ),
          }));
        }
        return;
      }

      if (['/horario', '/horarios', 'horario', 'horário', 'horarios', 'horários', 'horario de atendimento', 'horário de atendimento'].includes(trimmedInput)) {
        const sched = getWithdrawScheduleStatus();
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: withCmds(
            `🕐 **Horário de Retiradas:**\n\n• **Seg a Sex:** 09:00 às 18:00\n• **Sábado/Domingo:** Fechado\n\n${sched.isOpen ? '🟢 **Aberto agora!** Pode enviar /retirar 😊' : '🔴 **Fechado agora.** Retorne em horário comercial.'}`
          ),
        }));
        return;
      }

      if (['/taxa', '/taxas', '/limites', '/regras', 'taxa', 'taxas', 'limites', 'regras', 'taxa de saque', 'taxa de retirada'].includes(trimmedInput)) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: withCmds(
            `📋 **Regras e Taxas de Retirada:**\n\n• **Taxa operacional:** ${FEE_PERCENT}% sobre o valor solicitado\n• **Valor mínimo:** ${formatCurrency(MIN_WITHDRAW, 'KZ')}\n• **Valor máximo:** ${formatCurrency(MAX_WITHDRAW, 'KZ')} por operação\n• **Prazo de pagamento:** Até 24h úteis\n• **Horário:** Seg a Sex, 09:00 às 18:00\n\nPara sacar agora, envie /retirar 😊`
          ),
        }));
        return;
      }

      const withdrawKeywords = [
        '/retirar', '/sacar', '/retirada', '/saque',
        'retirar', 'sacar', 'retirada', 'saque',
        'quero retirar', 'quero sacar', 'quero levantar', 'quero fazer saque',
        'quero fazer retirada', 'fazer retirada', 'fazer saque',
        'levantar', 'levantamento', 'preciso sacar', 'preciso retirar',
        'como retirar', 'como sacar', 'vou retirar', 'vou sacar',
        'realizar retirada', 'realizar saque',
      ];
      const isWithdrawIntent =
        withdrawKeywords.includes(trimmedInput) ||
        withdrawKeywords.some((kw) => trimmedInput.includes(kw));

      if (isWithdrawIntent) {
        if (info.hasPending) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: withCmds('⏳ Você já tem uma retirada em análise. Aguarde a aprovação antes de solicitar um novo saque 😊'),
          }));
          return;
        }
        if (!isWithdrawAllowed()) {
          const sched = getWithdrawScheduleStatus();
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: withCmds(`🕒 As retiradas estão fechadas no momento.\n\n${sched.text}\n\nVolta no horário comercial! 😊`),
          }));
          return;
        }
        if (!info.hasBank) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bank',
            text: withCmds('🏦 Para sacar, você precisa primeiro cadastrar sua conta bancária:'),
          }));
          return;
        }
        if (!info.hasBots) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'no_bots',
            text: withCmds('🤖 Para liberar o saque, você precisa ter um robô de rendimento ativo:'),
          }));
          return;
        }
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'amount_selector',
          text: `💸 Ótimo! Seu saldo disponível é **${formatCurrency(info.balance, 'KZ')}**.\n\nQual valor deseja retirar?\n\n*(Mín: ${formatCurrency(MIN_WITHDRAW, 'KZ')} | Máx: ${formatCurrency(MAX_WITHDRAW, 'KZ')} | Taxa: ${FEE_PERCENT}%)*`,
        }));
        return;
      }

      const numericOnly = parseInt(raw.replace(/\D/g, ''), 10);
      if (!isNaN(numericOnly) && numericOnly >= 1 && raw.replace(/\D/g, '') === raw) {
        const amount = numericOnly;

        if (info.hasPending) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
          }));
          return;
        }

        if (amount < MIN_WITHDRAW) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Opa! O valor mínimo para saque é de ' + formatCurrency(MIN_WITHDRAW, 'KZ') + '. Por favor, escolha um valor a partir desse, tá bem? 😊',
          }));
          return;
        }

        if (amount > MAX_WITHDRAW) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Opa! O limite máximo por retirada é de ' + formatCurrency(MAX_WITHDRAW, 'KZ') + '. Por favor, escolha um valor dentro do limite 😊',
          }));
          return;
        }

        if (amount > info.balance) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Quase lá! Você possui ' + formatCurrency(info.balance, 'KZ') + ' disponível. Que tal escolher um valor até o seu saldo? 😉',
          }));
          return;
        }

        const fee = Math.round((amount * FEE_PERCENT) / 100);
        const net = amount - fee;
        setPendingAmount(amount);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'confirm_withdraw',
          payload: {
            amount,
            fee,
            net,
            bankName: info.bankName,
            iban: info.iban,
          },
        }));
        return;
      }

      // MOTOR CONVERSACIONAL DE RETIRADA (sys_t1000_retirada via RPC backend)
      setIsTyping(true);
      try {
        const { data: rawRpc, error: rpcErr } = await (supabase.rpc as any)(
          'classify_withdraw_message',
          {
            p_message: content,
            p_last_intent: lastIntent,
            p_last_response: lastBotResponse,
          }
        );

        setIsTyping(false);

        const intentData = (!rpcErr && rawRpc && rawRpc.response) ? rawRpc : null;

        if (intentData) {
          const { category, response, action } = intentData;
          setLastIntent(category);
          setLastBotResponse(response);

          // Ação: Seletor de Valor de Retirada
          if (action === 'TRIGGER_AMOUNT_SELECTOR') {
            if (!info.hasBank) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bank',
                text: response + '\n\nPara começar, cadastre sua conta bancária:',
              }));
              return;
            }
            if (!info.hasBots) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bots',
                text: response + '\n\nPara liberar o saque, ative um robô de rendimento:',
              }));
              return;
            }
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'amount_selector',
              text:
                response +
                '\n\n' +
                '*(Mínimo: ' +
                formatCurrency(MIN_WITHDRAW, 'KZ') +
                ' | Máximo: ' +
                formatCurrency(MAX_WITHDRAW, 'KZ') +
                ' | Taxa: ' +
                FEE_PERCENT +
                '%)*',
            }));
            return;
          }

          // Ação: Histórico de Saques
          if (action === 'TRIGGER_HISTORY') {
            setIsTyping(true);
            const history = await fetchRecentHistory();
            setIsTyping(false);
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'history_list',
              text: response,
              payload: { list: history },
            }));
            return;
          }

          // Ação: Configuração de Banco
          if (action === 'TRIGGER_BANK_CONFIG') {
            if (!info.hasBank) {
              botReply(() => ({
                id: 'bot-' + Date.now(),
                sender: 'bot',
                time: nowTime(),
                type: 'no_bank',
                text: response,
              }));
              return;
            }
          }

          // Resposta conversacional padrão
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: response,
          }));
          return;
        }
      } catch (err) {
        console.error('Erro na classificação de retirada:', err);
        setIsTyping(false);
      }

      botReply(() => ({
        id: 'bot-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text:
          'Quero te ajudar! 😊 Pode me explicar um pouco melhor o que você precisa sobre o seu saque? Se preferir, envie /retirar para sacar ou /ajuda para ver as opções.',
      }));
    },
    [inputText, info, pendingAmount, processWithdrawal, botReply, showToast, fetchRecentHistory, lastIntent, lastBotResponse]
  );

  const handleConfirmButton = useCallback(() => {
    if (pendingAmount == null) return;
    setMessages((prev) => [
      ...prev,
      {
        id: 'usr-confirm-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: 'Confirmar Retirada',
        type: 'text',
      },
    ]);
    processWithdrawal(pendingAmount);
  }, [pendingAmount, processWithdrawal]);

  const handleCancelButton = useCallback(() => {
    setPendingAmount(null);
    setMessages((prev) => [
      ...prev,
      {
        id: 'usr-cancel-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: 'Cancelar',
        type: 'text',
      },
    ]);
    botReply(() => ({
      id: 'bot-' + Date.now(),
      sender: 'bot',
      time: nowTime(),
      type: 'text',
      text: 'Sem problemas! Cancelei a operação. Quando quiser tentar novamente, é só me chamar com /retirar 😊',
    }));
  }, [botReply]);

  const renderBotText = (text: string) => {
    return text.split('\n').map((line, lIdx, arr) => {
      const parts = line.split(/(\*\*.*?\*\*|`[^`]+`|\/[-_a-zA-Z0-9]+)/g);
      return (
        <span key={lIdx}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={pIdx}
                  className="font-mono text-[12px] bg-gray-100 px-1 py-0.5 rounded text-[#2481cc]"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            if (part.startsWith('/') && VALID_COMMANDS.has(part.toLowerCase())) {
              return (
                <span
                  key={pIdx}
                  onClick={() => handleSendMessage(part)}
                  className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                >
                  {part}
                </span>
              );
            }
            return part;
          })}
          {lIdx < arr.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}
    >
      {/* ── HEADER OFICIAL DO WITHDRAWBOT TELEGRAM ── */}
      <header
        className="w-full bg-white px-3 py-2 shrink-0 z-30 flex items-center justify-between border-b border-gray-200/60 relative"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-black hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer relative"
            aria-label="Voltar"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#3390ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              1
            </span>
          </button>

          {/* Avatar WithdrawBot */}
          <div
            className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-xs text-white"
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.4]" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-sky-400 border-2 border-white rounded-full"></span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-black leading-tight">WithdrawBot</span>
              <svg className="w-4 h-4 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span
              onClick={() => handleSendMessage('/saldo')}
              className="text-[12px] text-[#707579] truncate cursor-pointer hover:text-[#3390ec] transition-colors"
            >
              {loading ? 'Carregando...' : `Saldo: ${formatCurrency(info.balance, 'KZ')}`}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenuDropdown((prev) => !prev)}
            className="p-1.5 text-[#707579] hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenuDropdown && (
            <div
              className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-[13.5px] text-gray-800 animate-in fade-in zoom-in-95 duration-100"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
            >
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/saldo');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-[#3390ec]" />
                <span>Consultar Saldo</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/retirar');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#25ae60]" />
                <span>Iniciar Retirada</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/banco');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#e67e22]" />
                <span>Minha Conta Bancária</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/historico');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8e44ad]" />
                <span>Histórico de Pedidos</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/horario');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-[#3498db]" />
                <span>Horários de Operação</span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/limpar');
                }}
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-red-500" />
                <span>Limpar Conversa</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── CORPO DO CHAT COM WALLPAPER VERDE DO TELEGRAM ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        onClick={() => setShowMenuDropdown(false)}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 relative select-text"
        style={{
          backgroundColor: '#8ea78f',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236f8a70' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="flex justify-center my-1 select-none">
          <span
            className="text-white text-[11.5px] font-medium px-3 py-0.5 rounded-full shadow-xs"
            style={{ background: 'rgba(91,122,94,0.7)' }}
          >
            {getCurrentDay()}
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          if (isUser) {
            const isCmd = msg.text?.trim().startsWith('/');
            const isValid = isCmd && isRecognizedCommand(msg.text || '');
            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div
                  className="bg-[#effdde] rounded-[16px] rounded-br-[4px] px-3.5 py-1.5 max-w-[85%] relative select-text flex items-baseline gap-2"
                  style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                >
                  <p
                    className={`text-[14.5px] leading-snug whitespace-pre-line ${
                      isValid ? 'text-[#2481cc] font-medium' : 'text-black font-normal'
                    }`}
                  >
                    {msg.text}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 text-[11px] text-[#537c3e] select-none ml-1">
                    <span>{msg.time}</span>
                    <span className="text-[#3ca3e8] font-bold text-[12px] leading-none">✓✓</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="flex flex-col items-start mb-2 max-w-[92%] sm:max-w-[85%]"
            >
              <div
                className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2.5 text-gray-900 w-full relative select-text"
                style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
              >
                {/* APRESENTAÇÃO / BOAS-VINDAS */}
                {msg.type === 'welcome' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="mb-2">
                      Olá! Que bom ver você por aqui! 😊 Sou o <strong>WithdrawBot</strong> 💸, seu assistente oficial de retiradas.
                    </p>
                    <p className="mb-2.5 text-gray-800">
                      Como posso te ajudar hoje? Você pode escolher uma das opções abaixo:
                    </p>
                    <p className="mb-2.5">
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/saldo')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /saldo
                      </span>{' '}
                      — Ver seu saldo disponível
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/retirar')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /retirar
                      </span>{' '}
                      — Fazer um saque agora
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/banco')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /banco
                      </span>{' '}
                      — Ver sua conta cadastrada
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/horario')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /horario
                      </span>{' '}
                      — Horários de atendimento
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/taxa')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /taxa
                      </span>{' '}
                      — Regras e taxas
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/historico')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /historico
                      </span>{' '}
                      — Seus últimos pedidos
                    </p>
                    <p className="text-[#707579] text-[13px] pt-1.5 border-t border-gray-100">
                      {isWithdrawAllowed()
                        ? '🟢 Retiradas abertas agora! Envie /retirar para começar 😊'
                        : '🔴 Retiradas fechadas agora. Atendimento de Seg a Sex, das 09:00 às 18:00.'}
                    </p>
                  </div>
                )}

                {/* TEXTO BOT PADRÃO COM FORMATAÇÃO */}
                {msg.type === 'text' && msg.text && (
                  <div className="text-[14px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                {/* RESUMO DE CONFIRMAÇÃO DE RETIRADA */}
                {msg.type === 'confirm_withdraw' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                      Perfeito! Dá uma conferida no seu resumo: 📋
                    </p>
                    <p className="text-[13.5px] text-gray-800">
                      • <strong>Valor a retirar:</strong> {formatCurrency(msg.payload.amount, 'KZ')}
                      <br />
                      • <strong>Taxa operacional (10%):</strong> -{formatCurrency(msg.payload.fee, 'KZ')}
                      <br />
                      • <strong>Você vai receber:</strong>{' '}
                      <span className="text-[#25ae60] font-bold">
                        {formatCurrency(msg.payload.net, 'KZ')}
                      </span> 💵
                      <br />
                      • <strong>Destino:</strong> {msg.payload.bankName}
                      <br />
                      • <strong>IBAN:</strong>{' '}
                      <code className="font-mono text-[12px] text-[#2481cc] bg-gray-50 px-1 rounded">
                        {msg.payload.iban}
                      </code>
                    </p>
                    <p className="mt-2 text-[13px] text-gray-600">
                      Está tudo certinho? É só clicar em <strong>Confirmar</strong> abaixo! 😊
                    </p>
                  </div>
                )}

                {/* SELETOR RÁPIDO DE VALORES */}
                {msg.type === 'amount_selector' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                    <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                      {[500, 1000, 2000, 5000, 10000].map((val) => (
                        <button
                          key={val}
                          disabled={val > info.balance}
                          onClick={() => handleSendMessage(String(val))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[#2481cc] text-[13px] font-semibold hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {formatCurrency(val, 'KZ')}
                        </button>
                      ))}
                      {info.balance >= MIN_WITHDRAW && (
                        <button
                          onClick={() => handleSendMessage(String(Math.floor(info.balance)))}
                          className="px-2.5 py-1.5 rounded-lg bg-[#3390ec]/10 border border-[#3390ec]/30 text-[#2481cc] text-[13px] font-bold hover:bg-[#3390ec]/20 active:scale-95 transition-all cursor-pointer"
                        >
                          Saldo Total ({formatCurrency(Math.floor(info.balance), 'KZ')})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ALERTA: SEM BANCO VINCULADO */}
                {msg.type === 'no_bank' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                  </div>
                )}

                {/* ALERTA: SEM ROBÔS COMPRADOS */}
                {msg.type === 'no_bots' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                  </div>
                )}

                {/* HISTÓRICO RECENTE */}
                {msg.type === 'history_list' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-1.5">
                      Aqui estão seus últimos pedidos: 📑
                    </p>
                    {msg.payload.list && msg.payload.list.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {msg.payload.list.map((item: any, idx: number) => {
                          const status = (item.status || 'pendente').toLowerCase();
                          const isApproved = status === 'concluido' || status === 'aprovado';
                          const isRejected = status === 'rejeitado' || status === 'cancelado';
                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-[13px]"
                            >
                              <div>
                                <span className="font-semibold text-black">
                                  {formatCurrency(Number(item.amount) || Number(item.valor) || 0, 'KZ')}
                                </span>
                                <span className="text-[11px] text-gray-500 block">
                                  {item.created_at
                                    ? new Date(item.created_at).toLocaleDateString('pt-AO', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Recente'}
                                </span>
                              </div>
                              <span
                                className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${
                                  isApproved
                                    ? 'bg-green-100 text-green-700'
                                    : isRejected
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {isApproved ? 'Aprovado' : isRejected ? 'Rejeitado' : 'Pendente'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[13px] text-gray-600">
                        Você ainda não realizou nenhum pedido de retirada por aqui 😊
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#707579] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>

              {/* INLINE KEYBOARD: CONFIRMAR RETIRADA */}
              {msg.type === 'confirm_withdraw' && pendingAmount !== null && (
                <div className="w-full mt-0.5 select-none overflow-hidden rounded-b-[12px]" style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}>
                  <div className="grid grid-cols-2">
                    <button
                      onClick={handleConfirmButton}
                      disabled={isProcessing}
                      className="py-2.5 px-3 text-[13.5px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center border-r border-white/20 disabled:opacity-60"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { if(!isProcessing) (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { if(!isProcessing) (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      {isProcessing ? '⏳  Processando...' : '✅  Confirmar'}
                    </button>
                    <button
                      onClick={handleCancelButton}
                      disabled={isProcessing}
                      className="py-2.5 px-3 text-[13.5px] font-semibold text-white/90 transition-all cursor-pointer flex items-center justify-center disabled:opacity-60"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { if(!isProcessing) (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { if(!isProcessing) (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      ✕  Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* INLINE KEYBOARD: CADASTRAR BANCO */}
              {msg.type === 'no_bank' && (
                <div className="w-full mt-0.5 select-none overflow-hidden rounded-b-[12px]" style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}>
                  <button
                    onClick={() => navigate('/adicionar-banco?redirect=/retirada')}
                    className="w-full py-2.5 px-3 text-[13.5px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center"
                    style={{ background: '#5288c1' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                  >
                    ➕  Cadastrar Conta Bancária
                  </button>
                </div>
              )}

              {/* BOTÃO DE AÇÃO: COMPRAR ROBÔ */}
              {msg.type === 'no_bots' && (
                <div className="w-full mt-0.5 select-none overflow-hidden rounded-b-[12px]" style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}>
                  <button
                    onClick={() => navigate('/bot-pay')}
                    className="w-full py-2.5 px-3 text-[13.5px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center"
                    style={{ background: '#5288c1' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                  >
                    🤖  Ir para o Catálogo de Robôs
                  </button>
                </div>
              )}

              {/* INLINE KEYBOARD: HISTÓRICO COMPLETO */}
              {msg.type === 'history_list' && (
                <div className="w-full mt-0.5 select-none overflow-hidden rounded-b-[12px]" style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}>
                  <button
                    onClick={() => navigate('/registro-retirada')}
                    className="w-full py-2.5 px-3 text-[13.5px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center"
                    style={{ background: '#5288c1' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                  >
                    📋  Ver Histórico Completo
                  </button>
                </div>
              )}

              {/* INLINE KEYBOARD WELCOME — WithdrawBot estilo BotFather */}
              {msg.type === 'welcome' && (
                <div className="w-full mt-0.5 select-none overflow-hidden rounded-b-[12px]" style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}>
                  {/* Linha 1 — largura total */}
                  <button
                    onClick={() => handleSendMessage('/retirar')}
                    className="w-full py-2.5 px-3 text-[13.5px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center border-b border-white/20"
                    style={{ background: '#5288c1' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                  >
                    💸  Iniciar Retirada
                  </button>
                  {/* Linha 2 — 2 colunas */}
                  <div className="grid grid-cols-2">
                    <button
                      onClick={() => handleSendMessage('/saldo')}
                      className="py-2.5 px-3 text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center border-r border-b border-white/20"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      💰  Ver Saldo
                    </button>
                    <button
                      onClick={() => handleSendMessage('/banco')}
                      className="py-2.5 px-3 text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center border-b border-white/20"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      🏦  Meu Banco
                    </button>
                  </div>
                  {/* Linha 3 — 2 colunas */}
                  <div className="grid grid-cols-2">
                    <button
                      onClick={() => handleSendMessage('/historico')}
                      className="py-2.5 px-3 text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center border-r border-white/20"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      📋  Histórico
                    </button>
                    <button
                      onClick={() => handleSendMessage('/horario')}
                      className="py-2.5 px-3 text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center justify-center"
                      style={{ background: '#5288c1' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#4278b1'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#5288c1'; }}
                    >
                      🕐  Horários
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
              <span className="text-[11.5px] text-[#707579] ml-1">WithdrawBot está digitando...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {showScrollDown && (
        <button
          onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#707579] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer shadow-md"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── FOOTER DE ENTRADA DO TELEGRAM ── */}
      <footer className="bg-white px-2 py-2 shrink-0 z-30 flex items-center gap-2 border-t border-gray-200">
        

        <div className="flex-1 flex items-center bg-[#f4f4f5] rounded-[20px] px-3.5 py-1.5 border border-transparent focus-within:border-[#3390ec]/40 focus-within:bg-white transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              if (pendingAmount !== null && /^\d*$/.test(e.target.value)) {
                setInputText(e.target.value);
              } else if (pendingAmount === null) {
                setInputText(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              pendingAmount !== null
                ? 'Digite novo valor ou Sim / Não...'
                : 'Mensagem ou comando (/saldo, /retirar)...'
            }
            className="w-full bg-transparent text-[15px] text-black placeholder-gray-400 outline-none"
          />
        </div>

        <button
          onClick={() => handleSendMessage('/ajuda')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] hover:text-[#3390ec] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Ajuda"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleSendMessage()}
          className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2881dc] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer"
          aria-label="Enviar mensagem"
          style={{ boxShadow: '0 1px 4px rgba(51,144,236,0.3)' }}
        >
          <Send className="w-4 h-4 -ml-0.5" />
        </button>
      </footer>
    </div>
  );
}
