import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Send,
  Loader2,
  HelpCircle,
  ChevronDown,
  Copy,
  Check,
  Paperclip,
  Building2,
  Wallet,
  Clock,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Camera,
  ArrowRight
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';

const MIN_RECHARGE = 3000;
const MAX_RECHARGE = 500000;
const CHAT_STORAGE_KEY = 'telegram_recharge_bot_v1';

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/depositar', '/recarregar', '/deposito', '/recarga',
  '/saldo', '/carteira',
  '/bancos', '/banco', '/contas',
  '/horario', '/horarios',
  '/limites', '/regras', '/taxa', '/taxas',
  '/historico', '/registos',
  '/limpar', '/reset', '/clear',
  '/cancelar'
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd) || /^\/\d+$/.test(cmd);
}

// Otimização ultra-rápida de imagem sem bloquear a thread principal
const compressImage = async (file: File): Promise<Blob> => {
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX = 1200;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
};

interface CollectionBank {
  id: string;
  nome_banco: string;
  nome_proprietario: string;
  iban: string;
  created_at?: string;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text?: string;
  imageUrl?: string;
  type: 
    | 'welcome' 
    | 'text' 
    | 'amount_selector' 
    | 'bank_selector' 
    | 'deposit_instructions' 
    | 'proof_success' 
    | 'history_list'
    | 'banks_list';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

export default function Recharge() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [userBalance, setUserBalance] = useState<number>(0);
  const [collectionBanks, setCollectionBanks] = useState<CollectionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  // Estados do fluxo de depósito ativo
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [selectedBank, setSelectedBank] = useState<CollectionBank | null>(null);
  const [activeRechargeId, setActiveRechargeId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  /* ── Carregar Dados Iniciais (Saldo e Bancos de Coleta) ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Saldo do usuário
      const { data: withdrawInfo } = await supabase.rpc('get_withdraw_info_mcpn');
      if (withdrawInfo && withdrawInfo.length > 0) {
        setUserBalance(Number(withdrawInfo[0].balance) || 0);
      }

      // 2. Bancos disponíveis para depósito
      const { data: banksData, error: banksError } = await supabase.rpc('get_collection_banks_mcpn');
      if (!banksError && banksData && Array.isArray(banksData)) {
        setCollectionBanks(banksData);
        return banksData;
      }
      return [];
    } catch (err) {
      console.error('Erro ao carregar dados de recarga:', err);
      return [];
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
            id: 'welcome-deposit',
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

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIban(true);
    showToast('IBAN copiado com sucesso!', 'success');
    setTimeout(() => setCopiedIban(false), 2000);
  };

  /* ── Criação do Pedido no Servidor ao Escolher Banco ── */
  const createRechargeOrder = useCallback(
    async (amount: number, bank: CollectionBank) => {
      try {
        setIsTyping(true);
        const { data, error } = (await supabase.rpc('request_recharge_kz_mcpn', {
          p_amount: amount,
          p_bank_id: bank.id,
        })) as { data: { success: boolean; recharge_id?: string; message?: string } | null; error: any };

        setIsTyping(false);

        if (error) throw error;

        const rechargeId = data?.recharge_id || null;
        setActiveRechargeId(rechargeId);
        setSelectedBank(bank);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'deposit_instructions',
          payload: {
            amount,
            bank,
            rechargeId,
          },
        }));
      } catch (err: any) {
        setIsTyping(false);
        showToast(err.message || 'Falha ao gerar dados de pagamento.', 'error');
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text:
            'Ops! Tivemos uma oscilação ao conectar com o banco. Por favor, tente clicar novamente no banco desejado 😊',
        }));
      }
    },
    [botReply, showToast]
  );

  /* ── Upload do Comprovativo Pelo Chat ── */
  const handleUploadProof = async (file: File) => {
    if (!file) return;

    // Adiciona a mensagem do usuário no chat com a imagem
    const previewUrl = URL.createObjectURL(file);
    const userImgMsg: ChatMessage = {
      id: 'usr-proof-' + Date.now(),
      sender: 'user',
      time: nowTime(),
      text: 'Comprovativo de depósito anexado 📸',
      imageUrl: previewUrl,
      type: 'text',
    };
    setMessages((prev) => [...prev, userImgMsg]);

    setIsUploading(true);
    setIsTyping(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão expirada. Faça login novamente.');

      const optimized = await compressImage(file);
      const fileName = `${userData.user.id}/${activeRechargeId || 'recarga'}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recargas')
        .upload(fileName, optimized, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: confirmData, error: confirmError } = (await supabase.rpc('confirm_recharge_mcpn', {
        p_recharge_id: activeRechargeId || '',
        p_bank_name: selectedBank?.nome_banco || 'Depósito Bancário',
        p_image_path: uploadData.path,
      })) as { data: { success: boolean; message: string } | null; error: any };

      if (confirmError) throw confirmError;

      setIsTyping(false);
      showToast('Comprovativo enviado com sucesso!', 'success');

      botReply(() => ({
        id: 'bot-proof-ok-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'proof_success',
        payload: {
          amount: depositAmount,
          bankName: selectedBank?.nome_banco,
        },
      }));

      // Reseta estado do fluxo
      setDepositAmount(null);
      setSelectedBank(null);
      setActiveRechargeId(null);
    } catch (err: any) {
      setIsTyping(false);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
      botReply(() => ({
        id: 'bot-err-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text:
          'Ops! Não consegui enviar o comprovativo: ' +
          (err.message || 'Falha de conexão.') +
          '\n\nVocê pode tentar anexar a foto novamente ou clicar no botão abaixo para abrir a tela de confirmação rápida! 😊',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  /* ── Consulta de Histórico de Recargas ── */
  const fetchRecentRecharges = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_recharges_mcpn');
      if (!error && Array.isArray(data)) {
        return data.slice(0, 4);
      }
      const { data: tableData } = await supabase
        .from('recargas_mcpn')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);
      return tableData || [];
    } catch {
      return [];
    }
  }, []);

  /* ── Processamento de Mensagens do Usuário ── */
  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const rawInput = (textToSend || inputText).trim();
      if (!rawInput) return;

      // REGRA PEDIDA PELO USUÁRIO:
      // "O usuário vai digitar o valor, automaticamente ao enviar é adicionado uma barra antes do valor para ser identificado como um comando."
      let displayContent = rawInput;
      const isPureNumeric = /^\d+$/.test(rawInput.replace(/\s+/g, ''));
      if (isPureNumeric && !rawInput.startsWith('/')) {
        displayContent = '/' + rawInput;
      }

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: displayContent,
        type: 'text',
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');

      const cleanCmd = displayContent.toLowerCase().replace(/^\//, '').trim();

      // CANCELAR FLUXO ATIVO
      if (['cancelar', 'cancela', 'sair', 'deixa'].includes(cleanCmd)) {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text:
            'Tudo bem! Cancelei o processo de depósito. Quando quiser recarregar, é só me enviar /depositar. Estou sempre por aqui! 😊',
        }));
        return;
      }

      // COMANDOS DE BOAS-VINDAS E AJUDA
      if (['start', 'inicio', 'ajuda', 'help', 'menu', 'oi', 'ola'].includes(cleanCmd)) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'welcome',
        }));
        return;
      }

      // CONSULTAR SALDO
      if (['saldo', 'carteira', 'ver saldo', 'meu saldo'].some((k) => cleanCmd === k || cleanCmd.includes(k))) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text:
            'Opa! Seu saldo disponível na carteira é de **' +
            formatCurrency(userBalance, 'KZ') +
            '**, que bom! 🎉\n\n' +
            'Deseja adicionar mais saldo na sua conta? É só me enviar /depositar 😊',
        }));
        return;
      }

      // BANCOS DISPONÍVEIS
      if (['bancos', 'banco', 'contas', 'bancos disponiveis'].some((k) => cleanCmd === k || cleanCmd.includes(k))) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'banks_list',
          payload: { banks: collectionBanks },
        }));
        return;
      }

      // HORÁRIOS DE DEPÓSITO (24/24)
      if (['horario', 'horarios', 'tempo', 'atendimento'].some((k) => cleanCmd === k || cleanCmd.includes(k))) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text:
            'Ótima notícia! Os depósitos e recargas funcionam **24 horas por dia, 7 dias por semana (24/24)**! ⏰🌟\n\n' +
            'Você pode fazer a sua transferência a qualquer hora do dia ou da noite que nossa equipe está sempre de plantão para liberar o seu saldo rapidinho! 😊',
        }));
        return;
      }

      // LIMITES E REGRAS
      if (['limites', 'regras', 'taxa', 'taxas', 'info'].some((k) => cleanCmd === k || cleanCmd.includes(k))) {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text:
            'Te explico rapidinho! As regras de depósito são super acessíveis: 💡\n\n' +
            '• **Valor Mínimo:** ' +
            formatCurrency(MIN_RECHARGE, 'KZ') +
            '\n' +
            '• **Valor Máximo:** ' +
            formatCurrency(MAX_RECHARGE, 'KZ') +
            ' por transação\n' +
            '• **Taxa de Depósito:** **0%** (Totalmente gratuito!)\n' +
            '• **Horário:** 24 horas por dia (24/24)\n\n' +
            'Pronto para recarregar? Envie /depositar 😊',
        }));
        return;
      }

      // HISTÓRICO DE RECARGAS
      if (['historico', 'registos', 'depositos', 'recargas'].some((k) => cleanCmd === k || cleanCmd.includes(k))) {
        setIsTyping(true);
        const recentList = await fetchRecentRecharges();
        setIsTyping(false);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'history_list',
          payload: { list: recentList },
        }));
        return;
      }

      // LIMPAR CONVERSA
      if (['limpar', 'reset', 'clear'].includes(cleanCmd)) {
        try {
          localStorage.removeItem(CHAT_STORAGE_KEY);
        } catch (e) {}
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        setMessages([
          {
            id: 'welcome-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'welcome',
          },
        ]);
        showToast('Conversa reiniciada!', 'success');
        return;
      }

      // INICIAR FLUXO DE DEPÓSITO (/depositar ou /recarregar)
      if (
        ['depositar', 'recarregar', 'deposito', 'recarga', 'quero depositar', 'adicionar saldo'].some(
          (k) => cleanCmd === k || cleanCmd.includes(k)
        )
      ) {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'amount_selector',
          text:
            'Que maravilha que deseja recarregar! Estou aqui para te ajudar com todo prazer 😊\n\n' +
            'Por favor, qual é o valor que você gostaria de depositar?\n' +
            'Digite o valor no chat ou clique em uma das opções rápidas abaixo:\n' +
            '*(Mínimo: ' +
            formatCurrency(MIN_RECHARGE, 'KZ') +
            ' | Máximo: ' +
            formatCurrency(MAX_RECHARGE, 'KZ') +
            ')*',
        }));
        return;
      }

      // ESCOLHA DE BANCO (SE O USUÁRIO CLICOU OU DIGITOU O NOME DO BANCO)
      const matchedBank = collectionBanks.find(
        (b) =>
          cleanCmd === b.nome_banco.toLowerCase() ||
          cleanCmd.includes(b.nome_banco.toLowerCase()) ||
          cleanCmd === b.id.toLowerCase()
      );

      if (matchedBank && depositAmount !== null) {
        createRechargeOrder(depositAmount, matchedBank);
        return;
      }

      // VALOR DIGITADO OU SELECIONADO (ex: 5000, 10000, /5000)
      const numericVal = parseInt(cleanCmd.replace(/\D/g, ''), 10);

      if (!isNaN(numericVal) && numericVal > 0) {
        if (numericVal < MIN_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text:
              'Opa! O valor mínimo para recarga é de **' +
              formatCurrency(MIN_RECHARGE, 'KZ') +
              '**.\n\nPor favor, escolha um valor a partir desse, tá bem? 😊',
          }));
          return;
        }

        if (numericVal > MAX_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text:
              'Opa! O limite máximo por recarga é de **' +
              formatCurrency(MAX_RECHARGE, 'KZ') +
              '**.\n\nPor favor, escolha um valor dentro do limite para continuarmos 😊',
          }));
          return;
        }

        // Valor válido! Atualiza estado e pergunta o banco
        setDepositAmount(numericVal);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'bank_selector',
          text:
            'Vejo que deseja depositar **' +
            formatCurrency(numericVal, 'KZ') +
            '**, excelente escolha! 🎉\n\n' +
            'Por favor, qual banco você prefere usar?\n' +
            'Temos os seguintes bancos disponíveis para depósito. Clique no banco de sua preferência:',
          payload: {
            amount: numericVal,
            banks: collectionBanks,
          },
        }));
        return;
      }

      // COMANDO NÃO IDENTIFICADO
      botReply(() => ({
        id: 'bot-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text:
          'Ops, não entendi direitinho! 😅\n\n' +
          'Você pode me enviar /ajuda para ver o menu ou /depositar para fazer uma recarga. Estou à disposição! 😊',
      }));
    },
    [
      inputText,
      userBalance,
      collectionBanks,
      depositAmount,
      botReply,
      showToast,
      createRechargeOrder,
      fetchRecentRecharges,
    ]
  );

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
      {/* Input oculto para envio do comprovativo direto no chat */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadProof(file);
        }}
      />

      {/* ── HEADER OFICIAL DO BOTFATHER TELEGRAM ── */}
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

          {/* Avatar oficial do BotFather */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 shadow-xs">
            <img
              src="/botfather.png"
              alt="BotFather"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg';
              }}
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-black leading-tight">BotFather</span>
              <svg className="w-4 h-4 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span
              onClick={() => handleSendMessage('/saldo')}
              className="text-[12px] text-[#707579] truncate cursor-pointer hover:text-[#3390ec] transition-colors"
            >
              {loading ? 'Carregando...' : `Saldo: ${formatCurrency(userBalance, 'KZ')}`}
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
                  handleSendMessage('/depositar');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Send className="w-4 h-4 text-[#25ae60]" />
                <span>Iniciar Depósito</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/bancos');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#e67e22]" />
                <span>Bancos Disponíveis</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/horario');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-[#3498db]" />
                <span>Horários de Recarga (24/24)</span>
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/historico');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8e44ad]" />
                <span>Histórico de Depósitos</span>
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
              <div key={msg.id} className="flex flex-col items-end mb-1">
                <div
                  className="bg-[#effdde] rounded-[16px] rounded-br-[4px] px-3.5 py-1.5 max-w-[85%] relative select-text flex flex-col gap-1"
                  style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Comprovativo"
                      className="rounded-lg max-h-48 w-auto object-cover mt-1"
                    />
                  )}
                  <div className="flex items-baseline gap-2">
                    <p
                      className={`text-[14.5px] leading-snug whitespace-pre-line ${
                        isValid ? 'text-[#2481cc] font-semibold' : 'text-black font-normal'
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
                {/* APRESENTAÇÃO INICIAL / BOAS-VINDAS */}
                {msg.type === 'welcome' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="mb-2">
                      Olá! Seja muito bem-vindo! Sou o <strong>BotFather</strong>, seu assistente de depósitos e recargas 😊
                    </p>
                    <p className="mb-2.5 text-gray-800">
                      Estou aqui para tornar suas recargas super rápidas, fáceis e descontraídas! Você pode me perguntar:
                    </p>
                    <p className="mb-2.5">
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/depositar')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /depositar
                      </span>{' '}
                      — Fazer uma recarga agora
                      <br />
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
                        onClick={() => handleSendMessage('/bancos')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /bancos
                      </span>{' '}
                      — Bancos disponíveis para depósito
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/horario')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /horario
                      </span>{' '}
                      — Horários de atendimento (24/24!)
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/limites')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /limites
                      </span>{' '}
                      — Valor mínimo e máximo
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/historico')}
                        className="text-[#3390ec] font-semibold cursor-pointer hover:underline"
                      >
                        /historico
                      </span>{' '}
                      — Acompanhar seus depósitos
                    </p>
                    <p className="text-[#707579] text-[13px] pt-1.5 border-t border-gray-100">
                      🟢 Depósitos abertos 24 horas por dia (24/24)! Clique em /depositar para começar 😊
                    </p>
                  </div>
                )}

                {/* TEXTO BOT PADRÃO */}
                {msg.type === 'text' && msg.text && (
                  <div className="text-[14px] text-black leading-relaxed font-normal">
                    {renderBotText(msg.text)}
                  </div>
                )}

                {/* SELETOR DE VALORES RÁPIDOS */}
                {msg.type === 'amount_selector' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                    <div className="mt-3 flex flex-wrap gap-1.5 select-none">
                      {[3000, 5000, 10000, 20000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          onClick={() => handleSendMessage(String(val))}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[#2481cc] text-[13px] font-semibold hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
                        >
                          {formatCurrency(val, 'KZ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SELETOR DE BANCOS DISPONÍVEIS */}
                {msg.type === 'bank_selector' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                    <div className="mt-3 flex flex-col gap-1.5 select-none">
                      {msg.payload.banks && msg.payload.banks.length > 0 ? (
                        msg.payload.banks.map((b: CollectionBank) => (
                          <button
                            key={b.id}
                            onClick={() => createRechargeOrder(msg.payload.amount, b)}
                            className="w-full text-left p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 flex items-center justify-between text-[#2481cc] active:scale-[0.99] transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#3390ec] shrink-0" />
                              <span className="font-bold text-[14px] text-black">{b.nome_banco}</span>
                            </div>
                            <span className="text-[12px] font-medium text-[#3390ec] flex items-center gap-1">
                              Escolher <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-[13px] text-gray-600">Nenhum banco carregado no momento.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* INSTRUÇÕES FINAIS DE DEPÓSITO */}
                {msg.type === 'deposit_instructions' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                      Tudo pronto! Aqui estão os dados oficiais para você realizar o seu depósito: 🏦✨
                    </p>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[13.5px] space-y-1 my-2">
                      <p>
                        • <strong>Valor a depositar:</strong>{' '}
                        <span className="text-[#25ae60] font-bold">
                          {formatCurrency(msg.payload.amount, 'KZ')}
                        </span>
                      </p>
                      <p>
                        • <strong>Banco Destinatário:</strong> {msg.payload.bank?.nome_banco}
                      </p>
                      <p>
                        • <strong>Titular da Conta:</strong>{' '}
                        {msg.payload.bank?.nome_proprietario || 'Conta Oficial'}
                      </p>
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[12px] text-gray-500 block">IBAN:</span>
                          <code className="font-mono text-[13px] text-[#2481cc] font-bold select-all break-all">
                            {msg.payload.bank?.iban}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(msg.payload.bank?.iban)}
                          className="px-2.5 py-1.5 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all text-[12px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedIban ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-600" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-[13px] text-gray-800 leading-normal">
                      📝 <strong>Instruções simples:</strong>
                      <br />
                      Por favor, dirija-se a um <strong>ATM (Multicaixa)</strong>, use o aplicativo do seu banco ou vá a um <strong>Kiosk</strong> e faça a transferência ou depósito desse valor exato.
                      <br /><br />
                      Após fazer o depósito, volte aqui no chat para enviar a captura do comprovativo! Estarei te aguardando ansiosamente para liberar o seu saldo, tá bom? 😊
                    </p>
                  </div>
                )}

                {/* SUCESSO NO ENVIO DO COMPROVATIVO */}
                {msg.type === 'proof_success' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#25ae60] mb-1.5">
                      Recebido com muito sucesso! 🎉🥳
                    </p>
                    <p className="text-[13.5px] text-gray-800 leading-normal">
                      Já encaminhei o seu comprovativo para conferência da nossa equipe. O seu saldo no valor de{' '}
                      <strong>{formatCurrency(msg.payload.amount || 0, 'KZ')}</strong> será creditado na sua conta em instantes!
                      <br /><br />
                      Muito obrigado pela preferência e confiança! Estarei sempre por aqui para o que precisar 😊
                    </p>
                  </div>
                )}

                {/* LISTA DE BANCOS */}
                {msg.type === 'banks_list' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                      🏦 Nossos Bancos Disponíveis para Recarga:
                    </p>
                    <div className="space-y-2 my-2">
                      {msg.payload.banks && msg.payload.banks.length > 0 ? (
                        msg.payload.banks.map((b: CollectionBank) => (
                          <div key={b.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[13px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-black text-[14px]">{b.nome_banco}</span>
                              <span className="text-[11px] text-[#25ae60] font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                Disponível 24h
                              </span>
                            </div>
                            <p className="text-gray-600 text-[12.5px]">Titular: {b.nome_proprietario}</p>
                            <p className="text-[#2481cc] font-mono text-[12px] mt-0.5 select-all break-all">
                              IBAN: {b.iban}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[13px] text-gray-600">Nenhum banco cadastrado no momento.</p>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-700">
                      Quando quiser iniciar seu depósito, envie /depositar 😊
                    </p>
                  </div>
                )}

                {/* LISTA DE HISTÓRICO DE RECARGAS */}
                {msg.type === 'history_list' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-1.5">
                      📑 Seus Últimos Depósitos:
                    </p>
                    {msg.payload.list && msg.payload.list.length > 0 ? (
                      <div className="space-y-1.5 mt-2">
                        {msg.payload.list.map((item: any, idx: number) => {
                          const status = (item.status || 'pendente').toLowerCase();
                          const isApproved = status === 'aprovado' || status === 'concluido';
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
                        Você ainda não possui nenhum depósito registrado 😊
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#707579] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO: APÓS INSTRUÇÕES DE DEPÓSITO */}
              {msg.type === 'deposit_instructions' && msg.payload && (
                <div className="w-full mt-1.5 flex flex-col gap-1.5 select-none">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full bg-white hover:bg-green-50 active:bg-green-100 rounded-[8px] py-2.5 px-3 text-[13.5px] font-bold text-[#25ae60] transition-colors cursor-pointer flex items-center justify-center gap-2 border border-green-100"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#25ae60]" />
                        <span>Enviando Comprovativo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-[#25ae60]" />
                        <span>Enviar Captura do Comprovativo</span>
                      </>
                    )}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/payMoney?id=${msg.payload.rechargeId}&amount=${msg.payload.amount}&bankId=${msg.payload.bank?.id}`
                        )
                      }
                      className="flex-1 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-2.5 text-[12.5px] font-medium text-[#2481cc] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Tela de Pagamento</span>
                    </button>
                    <button
                      onClick={() => handleSendMessage('/cancelar')}
                      className="flex-1 bg-white hover:bg-red-50 active:bg-red-100 rounded-[8px] py-2 px-2.5 text-[12.5px] font-medium text-[#e53935] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BOTÃO DE AÇÃO NO WELCOME */}
              {msg.type === 'welcome' && (
                <div className="w-full mt-1.5 select-none flex flex-col gap-1.5">
                  <button
                    onClick={() => handleSendMessage('/depositar')}
                    className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2.5 px-3 text-[13.5px] font-bold text-[#2481cc] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    <Send className="w-4 h-4" />
                    <span>Fazer Depósito / Recarregar</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendMessage('/bancos')}
                      className="flex-1 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-3 text-[12.5px] font-medium text-gray-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#3390ec]" />
                      <span>Bancos</span>
                    </button>
                    <button
                      onClick={() => handleSendMessage('/saldo')}
                      className="flex-1 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-3 text-[12.5px] font-medium text-gray-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                    >
                      <Wallet className="w-3.5 h-3.5 text-[#3390ec]" />
                      <span>Ver Saldo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BOTÃO DE AÇÃO NO SUCESSO DO COMPROVATIVO */}
              {msg.type === 'proof_success' && (
                <div className="w-full mt-1.5 select-none">
                  <button
                    onClick={() => navigate('/registro-transacoes?tab=recarga')}
                    className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-3 text-[13px] font-semibold text-[#2481cc] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Acompanhar no Histórico</span>
                  </button>
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
              <span className="text-[11.5px] text-[#707579] ml-1">BotFather está digitando...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* BOTÃO FLUTUANTE DE ROLAGEM */}
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
        <button
          onClick={() => handleSendMessage('/depositar')}
          className="h-[38px] px-3.5 rounded-[8px] bg-[#3390ec] hover:bg-[#2881dc] active:bg-[#1d6fae] text-white text-[13.5px] font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          style={{ boxShadow: '0 1px 4px rgba(51,144,236,0.3)' }}
        >
          <span>Recarregar</span>
        </button>

        <div className="flex-1 flex items-center bg-transparent px-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              depositAmount !== null && !selectedBank
                ? 'Digite o nome do banco...'
                : 'Mensagem ou valor do depósito...'
            }
            className="w-full bg-transparent text-[15px] text-black placeholder-gray-400 outline-none"
          />
        </div>

        {/* Botão de anexar comprovativo a qualquer momento */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] hover:text-[#3390ec] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Anexar Comprovativo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

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
