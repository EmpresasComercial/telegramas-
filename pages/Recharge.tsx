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
  Camera,
  ArrowRight,
  ArrowDownToLine,
  BarChart3
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';

const MIN_RECHARGE = 3000;
const MAX_RECHARGE = 500000;
const CHAT_STORAGE_KEY = 'telegram_deposit_bot_v3';

const VALID_COMMANDS = new Set([
  '/start', '/inicio', '/ajuda', '/help', '/menu', '/oi', '/ola',
  '/depositar', '/recarregar', '/deposito', '/recarga',
  '/saldo', '/carteira',
  '/bancos', '/banco', '/contas',
  '/horario', '/horarios',
  '/limites', '/regras', '/taxa', '/taxas',
  '/historico', '/registos',
  '/total', '/total_deposito', '/total_depositos', '/meus_depositos', '/extrato', '/relatorio',
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

function parseDepositNaturalLanguage(rawInput: string): {
  intent: 'balance' | 'deposit' | 'history' | 'banks' | 'schedule' | 'limits' | 'help' | 'clear' | 'cancel' | 'total' | 'greeting' | 'unknown';
  amount?: number;
} {
  const clean = rawInput.trim();
  const lower = clean.toLowerCase();
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Cancelar
  if (['cancelar', 'cancela', 'cancelado', 'nao', 'abortar', 'deixa', 'deixa pra la', 'desistir', 'esquece', 'voltar', 'sair'].includes(norm))
    return { intent: 'cancel' };

  // Limpar
  if (['limpar', 'reset', 'clear', 'limpar chat', 'limpar conversa', 'apagar conversa', 'reiniciar'].includes(norm))
    return { intent: 'clear' };

  // Saudações conversacionais
  const greetings = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'e ai', 'tudo bem', 'tudo bom', 'como vai', 'fala', 'alo'];
  if (greetings.includes(norm) || greetings.some(g => norm.startsWith(g + ' ') || norm.endsWith(' ' + g))) {
    return { intent: 'greeting' };
  }

  // Saldo
  if (
    norm === '/saldo' || norm === '/carteira' ||
    norm.includes('saldo') || norm.includes('carteira') ||
    norm.includes('quanto tenho') || norm.includes('quanto eu tenho') ||
    norm.includes('meu dinheiro') || norm.includes('dinheiro na conta') ||
    norm.includes('ver saldo') || norm.includes('consultar saldo') ||
    norm.includes('quanto posso') || norm.includes('quanto sobrou') ||
    norm.includes('meu saldo') || norm.includes('saldo disponivel')
  ) return { intent: 'balance' };

  // Histórico
  if (
    norm === '/historico' || norm === '/registos' ||
    norm.includes('historico') || norm.includes('extrato') ||
    norm.includes('meus depositos') || norm.includes('minhas recargas') ||
    norm.includes('ver historico') || norm.includes('ultimos depositos') ||
    norm.includes('ultimas recargas') || norm.includes('depositos anteriores') ||
    norm.includes('registos') || norm.includes('status do meu deposito') ||
    norm.includes('comprovativo')
  ) return { intent: 'history' };

  // Total / Relatório
  if (
    norm === '/total' || norm === '/relatorio' ||
    norm.includes('total deposito') || norm.includes('total de deposito') ||
    norm.includes('relatorio') || norm.includes('resumo') || norm.includes('quanto depositei')
  ) return { intent: 'total' };

  // Bancos
  if (
    norm === '/bancos' || norm === '/banco' || norm === '/contas' ||
    norm.includes('qual banco') || norm.includes('bancos disponiveis') ||
    norm.includes('contas disponiveis') || norm.includes('lista de bancos') ||
    norm.includes('quais bancos') || norm.includes('metodos de pagamento') ||
    norm.includes('para onde transferir') || norm.includes('dados bancarios') ||
    norm.includes('onde depositar') || norm.includes('onde pagar')
  ) return { intent: 'banks' };

  // Horário
  if (
    norm === '/horario' || norm === '/horarios' ||
    norm.includes('horario') || norm.includes('que horas') ||
    norm.includes('ta aberto') || norm.includes('esta aberto') ||
    norm.includes('quando abre') || norm.includes('atendimento') || norm.includes('funciona') ||
    norm.includes('posso depositar agora')
  ) return { intent: 'schedule' };

  // Limites
  if (
    norm === '/limites' || norm === '/regras' || norm === '/taxa' ||
    norm.includes('taxa') || norm.includes('limite') ||
    norm.includes('valor minimo') || norm.includes('valor maximo') ||
    norm.includes('regras') || norm.includes('quanto posso depositar') ||
    norm.includes('qual o minimo') || norm.includes('minimo de deposito')
  ) return { intent: 'limits' };

  // Depósito com valor extraído
  const depositTriggers = ['depositar', 'recarregar', 'deposito', 'recarga', 'quero depositar', 'fazer deposito', 'enviar', 'transferir', 'por saldo', 'colocar dinheiro'];
  const hasDepositWord = depositTriggers.some(w => norm.includes(w)) || norm.startsWith('/depositar') || norm.startsWith('/recarregar');
  const numberMatch = norm.match(/(?:(?:kz|ao|akz)\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:kz|kwanza|reais|ao|akz))?/i);
  if (numberMatch && (hasDepositWord || /^\d+$/.test(clean.replace(/[\s.,]/g, '')))) {
    const rawVal = numberMatch[1].replace(/\./g, '').replace(',', '.');
    const parsedAmt = Math.floor(parseFloat(rawVal));
    if (!isNaN(parsedAmt) && parsedAmt > 0) return { intent: 'deposit', amount: parsedAmt };
  }
  if (hasDepositWord) return { intent: 'deposit' };

  // Ajuda
  if (
    norm === '/ajuda' || norm === '/help' || norm === '/menu' || norm === '/start' || norm === '/inicio' ||
    ['ajuda', 'help', 'menu', 'inicio', 'start', 'como funciona', 'comandos', 'o que voce faz'].includes(norm)
  ) return { intent: 'help' };

  return { intent: 'unknown' };
}

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
    | 'banks_list'
    | 'deposit_summary';
  payload?: any;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDay(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

function formatAccountDate(isoStr?: string | null): string {
  if (!isoStr) return 'data de adesão';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'data de adesão';
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

function formatDepositDateTime(isoStr?: string | null): string {
  if (!isoStr) return 'recente';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'recente';
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `dia ${day} de ${month} às ${hours}h${minutes}`;
}

const BotFormattedText = React.memo(function BotFormattedText({
  text,
  onCommandClick,
}: {
  text: string;
  onCommandClick: (cmd: string) => void;
}) {
  return (
    <>
      {text.split('\n').map((line, lIdx, arr) => {
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
                    onClick={() => onCommandClick(part)}
                    className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
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
      })}
    </>
  );
});

export default function Recharge() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalRecharges, setTotalRecharges] = useState<number>(0);
  const [collectionBanks, setCollectionBanks] = useState<CollectionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const [depositAmount, setDepositAmount] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('deposit_bot_current_amount');
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedBank, setSelectedBank] = useState<CollectionBank | null>(() => {
    try {
      const saved = localStorage.getItem('deposit_bot_current_bank');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeRechargeId, setActiveRechargeId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('deposit_bot_recharge_id');
    } catch {
      return null;
    }
  });

  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [lastBotResponse, setLastBotResponse] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const el = chatBottomRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(frame);
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
      setLoading(true);
      const { data: withdrawInfo } = await supabase.rpc('get_withdraw_info_mcpn');
      if (withdrawInfo && withdrawInfo.length > 0) {
        setUserBalance(Number(withdrawInfo[0].balance) || 0);
      }

      try {
        const { data: accData } = await supabase.rpc('get_my_account_data');
        if (accData && accData.length > 0) {
          setTotalRecharges(Number((accData[0] as any).total_recarregado ?? 0));
        } else {
          const { data: recData } = await supabase.from('recargas_mcpn').select('valor, status');
          if (recData) {
            const sum = recData
              .filter((r: any) => r.status === 'aprovado' || r.status === 'concluido')
              .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);
            setTotalRecharges(sum);
          }
        }
      } catch {
        // fallback
      }

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
      }, 100);
    }

    initChat();
  }, [fetchData]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 0) => {
    if (delay === 0) {
      setMessages((prev) => [...prev, builder()]);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [...prev, builder()]);
      }, delay);
    }
  }, []);

  const copyToClipboard = (text: string, isAmount = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isAmount) {
      setCopiedAmount(true);
      showToast('Valor copiado com sucesso!', 'success');
      setTimeout(() => setCopiedAmount(false), 2000);
    } else {
      setCopiedIban(true);
      showToast('IBAN copiado com sucesso!', 'success');
      setTimeout(() => setCopiedIban(false), 2000);
    }
  };

  const createRechargeOrder = useCallback(
    async (amount: number, bank: CollectionBank) => {
      try {
        setIsTyping(true);
        const { data, error } = (await supabase.rpc('request_recharge_kz_mcpn', {
          p_amount: amount,
          p_bank_id: bank.id,
        })) as { data: any; error: any };

        setIsTyping(false);

        let recId = data?.recharge_id || data?.id || (data && typeof data === 'string' ? data : null);

        if (!recId) {
          const { data: userAuth } = await supabase.auth.getUser();
          if (userAuth?.user) {
            const { data: latest } = await supabase
              .from('recargas_mcpn')
              .select('id')
              .eq('user_id', userAuth.user.id)
              .eq('status', 'pendente')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latest?.id) {
              recId = latest.id;
            }
          }
        }

        if (recId) {
          setActiveRechargeId(recId);
          try {
            localStorage.setItem('deposit_bot_recharge_id', recId);
            localStorage.setItem('deposit_bot_current_amount', String(amount));
            localStorage.setItem('deposit_bot_current_bank', JSON.stringify(bank));
          } catch (e) {}
        }

        setSelectedBank(bank);

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'deposit_instructions',
          payload: {
            amount,
            bank,
            rechargeId: recId,
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

  const handleUploadProof = async (file: File) => {
    if (!file) return;

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

      let targetRechargeId = activeRechargeId;
      if (!targetRechargeId) {
        try {
          targetRechargeId = localStorage.getItem('deposit_bot_recharge_id');
        } catch (e) {}
      }

      if (!targetRechargeId) {
        const { data: latestPending } = await supabase
          .from('recargas_mcpn')
          .select('id, valor')
          .eq('user_id', userData.user.id)
          .eq('status', 'pendente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestPending?.id) {
          targetRechargeId = latestPending.id;
        }
      }

      if (!targetRechargeId) {
        const amt = depositAmount || 3000;
        const bankId = selectedBank?.id || collectionBanks[0]?.id;

        const { data: newOrder } = (await supabase.rpc('request_recharge_kz_mcpn', {
          p_amount: amt,
          p_bank_id: bankId,
        })) as { data: any };

        targetRechargeId = newOrder?.recharge_id || newOrder?.id;

        if (!targetRechargeId) {
          const { data: directInsert } = await supabase
            .from('recargas_mcpn')
            .insert({
              user_id: userData.user.id,
              valor: amt,
              status: 'pendente',
              detalhes_transacao: {
                banco: selectedBank?.nome_banco || collectionBanks[0]?.nome_banco || 'Depósito Bancário',
                metodo: 'chat_bot'
              }
            })
            .select('id')
            .single();
          targetRechargeId = directInsert?.id || null;
        }
      }

      if (!targetRechargeId) {
        throw new Error('Não foi possível identificar o pedido de recarga. Por favor, envie /depositar para reiniciar.');
      }

      const optimized = await compressImage(file);
      const fileName = `${userData.user.id}/${targetRechargeId}_${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recargas')
        .upload(fileName, optimized, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const bankName = selectedBank?.nome_banco || collectionBanks[0]?.nome_banco || 'Depósito Bancário';
      const { data: confirmData, error: confirmError } = (await supabase.rpc('confirm_recharge_mcpn', {
        p_recharge_id: targetRechargeId,
        p_bank_name: bankName,
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
          amount: depositAmount || 3000,
          bankName,
        },
      }));

      setDepositAmount(null);
      setSelectedBank(null);
      setActiveRechargeId(null);
      try {
        localStorage.removeItem('deposit_bot_recharge_id');
        localStorage.removeItem('deposit_bot_current_amount');
        localStorage.removeItem('deposit_bot_current_bank');
      } catch (e) {}
    } catch (err: any) {
      setIsTyping(false);
      showToast(err.message || 'Erro ao enviar comprovativo.', 'error');
      botReply(() => ({
        id: 'bot-err-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text: 'Erro ao enviar comprovativo: ' + (err.message || 'Falha de conexão.') + ' Tente anexar novamente ou envie /depositar.',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const fetchRecentRecharges = useCallback(async () => {
    try {
      // 1. Tenta buscar via RPC oficial de recargas do usuário
      const { data, error } = await supabase.rpc('get_my_recharges_mcpn');
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.slice(0, 10);
      }

      // 2. Busca pelo user_id autenticado na tabela recargas_mcpn
      const { data: userAuth } = await supabase.auth.getUser();
      if (userAuth?.user?.id) {
        const { data: tableData } = await supabase
          .from('recargas_mcpn')
          .select('*')
          .eq('user_id', userAuth.user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (Array.isArray(tableData) && tableData.length > 0) {
          return tableData;
        }
      }

      // 3. Fallback no histórico geral filtrando por 'recargas'
      const { data: genData } = await supabase.rpc('get_general_history_mcpn');
      if (Array.isArray(genData)) {
        const filtered = genData.filter((item: any) => item.type === 'recargas');
        if (filtered.length > 0) {
          return filtered.slice(0, 10);
        }
      }

      return [];
    } catch {
      return [];
    }
  }, []);

  const fetchDepositSummary = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userCreatedAt = userData?.user?.created_at || null;

      let recharges: any[] = [];
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_recharges_mcpn');
      if (!rpcError && Array.isArray(rpcData)) {
        recharges = rpcData;
      } else {
        const { data: tableData } = await supabase
          .from('recargas_mcpn')
          .select('*');
        if (tableData) recharges = tableData;
      }

      // Ordenação cronológica (mais antigo primeiro)
      const sorted = [...recharges].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });

      const approved = sorted.filter((r) => {
        const st = (r.status || '').toLowerCase();
        return st === 'aprovado' || st === 'concluido' || st === 'approved' || st === 'completed';
      });

      const pending = sorted.filter((r) => {
        const st = (r.status || '').toLowerCase();
        return st === 'pendente' || st === 'pending';
      });

      const totalApprovedAmount = approved.reduce(
        (sum, r) => sum + (Number(r.amount) || Number(r.valor) || 0),
        0
      );

      return {
        userCreatedAt,
        totalDepositsCount: sorted.length,
        approvedDepositsCount: approved.length,
        pendingDepositsCount: pending.length,
        totalApprovedAmount,
        firstDeposit: approved[0] || sorted[0] || null,
        secondDeposit: approved[1] || (sorted.length > 1 ? sorted[1] : null),
        allApproved: approved,
        allSorted: sorted,
      };
    } catch (err) {
      console.error('Erro ao calcular resumo de depósitos:', err);
      return null;
    }
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const rawInput = (textToSend || inputText).trim();
      if (!rawInput) return;

      const isPureNumeric = /^\d+$/.test(rawInput.replace(/[\s.,KZkz]/g, ''));
      const isSlashCmd = rawInput.startsWith('/');

      const userMsg: ChatMessage = {
        id: 'usr-' + Date.now(),
        sender: 'user',
        time: nowTime(),
        text: rawInput,
        type: 'text',
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText('');

      const cleanCmd = rawInput.toLowerCase().replace(/^\//, '').trim();

      // --- NLP: Interpretar linguagem natural quando não for comando direto ---
      const nlp = !isSlashCmd && !isPureNumeric ? parseDepositNaturalLanguage(rawInput) : null;

      // 1. Cancelamento (texto natural ou comando)
      if (['cancelar', 'cancela', 'sair', 'deixa'].includes(cleanCmd) || nlp?.intent === 'cancel') {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        setLastIntent(null);
        try {
          localStorage.removeItem('deposit_bot_recharge_id');
        } catch (e) {}
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Processo de depósito cancelado. Quando quiser recarregar, envie /depositar.',
        }));
        return;
      }

      // 2. Saudação conversacional (resposta humana e natural)
      if (nlp?.intent === 'greeting') {
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Olá! Como posso ajudar você hoje? Pode consultar seu saldo, ver os bancos ou fazer um depósito.',
        }));
        return;
      }

      // 3. Menu / Início estático (comando ou NLP)
      if (
        (isSlashCmd && ['start', 'inicio', 'início', 'ajuda', 'help', 'menu'].includes(cleanCmd)) ||
        ['/start', '/inicio', '/início', '/ajuda', '/help', '/menu'].includes(rawInput.toLowerCase()) ||
        nlp?.intent === 'help'
      ) {
        setLastIntent('menu');
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'welcome',
        }));
        return;
      }

      // 4. Consulta de Saldo — busca saldo real em tempo real (direto e sem extras)
      if (
        (isSlashCmd && ['saldo', 'carteira', 'versaldo', 'meusaldo'].includes(cleanCmd)) ||
        nlp?.intent === 'balance'
      ) {
        setLastIntent('saldo');
        setIsTyping(true);
        try {
          const { data: wi } = await supabase.rpc('get_withdraw_info_mcpn');
          const realBalance = (wi && wi.length > 0) ? Number(wi[0].balance) || 0 : userBalance;
          setUserBalance(realBalance);
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `Seu saldo é de ${formatCurrency(realBalance, 'KZ')}. Para recarregar, envie /depositar ou digite o valor (ex: depositar 1000).`,
          }));
        } catch {
          setIsTyping(false);
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `Seu saldo é de ${formatCurrency(userBalance, 'KZ')}. Para recarregar, envie /depositar.`,
          }));
        }
        return;
      }

      // 5. Lista de Bancos (direto)
      if ((isSlashCmd && ['bancos', 'banco', 'contas'].includes(cleanCmd)) || nlp?.intent === 'banks') {
        setLastIntent('metodos_deposito');
        const banksText = collectionBanks.length > 0
          ? collectionBanks.map((b, i) => `${i + 1}. ${b.nome_banco} | Titular: ${b.nome_proprietario} | IBAN: ${b.iban}`).join('\n')
          : 'Nenhum banco disponível no momento.';
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: `Bancos disponíveis para recarga:\n\n${banksText}\n\nPara iniciar um depósito, envie /depositar.`,
        }));
        return;
      }

      // 6. Horários (direto)
      if ((isSlashCmd && ['horario', 'horarios'].includes(cleanCmd)) || nlp?.intent === 'schedule') {
        setLastIntent('horarios');
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: 'Os depósitos funcionam 24 horas por dia, 7 dias por semana.',
        }));
        return;
      }

      // 7. Limites e Regras (direto)
      if ((isSlashCmd && ['limites', 'regras', 'taxa', 'taxas', 'info'].includes(cleanCmd)) || nlp?.intent === 'limits') {
        setLastIntent('limites');
        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: `Regras de depósito: Mínimo: ${formatCurrency(MIN_RECHARGE, 'KZ')}. Máximo: ${formatCurrency(MAX_RECHARGE, 'KZ')}. Taxa: 0%. Horário: 24h.`,
        }));
        return;
      }

      // 8. Relatório Total de Depósitos (direto)
      const isTotalDepositCmd = isSlashCmd && [
        'total',
        'total_deposito',
        'total_depositos',
        'totaldeposito',
        'totaldepositos',
        'extrato',
        'meus_depositos',
        'relatorio',
        'relatório',
      ].includes(cleanCmd);

      if (isTotalDepositCmd || nlp?.intent === 'total') {
        setIsTyping(true);
        const summary = await fetchDepositSummary();
        setIsTyping(false);

        if (!summary) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: 'Não foi possível consultar o relatório no momento. Tente novamente em instantes.',
          }));
          return;
        }

        const count = summary.approvedDepositsCount;
        const totalStr = formatCurrency(summary.totalApprovedAmount, 'KZ');

        const reportText = count > 0
          ? `Relatório de depósitos: ${count} depósito(s) confirmado(s), total de ${totalStr}. Para recarregar, envie /depositar.`
          : `Relatório de depósitos: Nenhum depósito confirmado até o momento. Para fazer sua primeira recarga, envie /depositar.`;

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: reportText,
        }));
        return;
      }

      // 9. Histórico de Depósitos Real (direto, sem asteriscos, sem cardinais)
      if ((isSlashCmd && ['historico', 'registos'].includes(cleanCmd)) || nlp?.intent === 'history') {
        setIsTyping(true);
        const recentList = await fetchRecentRecharges();
        setIsTyping(false);

        let histText = '';
        if (recentList && recentList.length > 0) {
          const items = recentList.map((item: any, idx: number) => {
            const val = formatCurrency(Number(item.amount) || Number(item.valor) || 0, 'KZ');
            const st = (item.status || 'pendente').toLowerCase();
            const statusLabel = (st === 'aprovado' || st === 'concluido' || st === 'approved')
              ? 'Aprovado'
              : (st === 'rejeitado' || st === 'cancelado' || st === 'failed')
              ? 'Recusado'
              : 'Pendente';
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Recente';
            const bankStr = item.banco_origem || item.bank_name || 'Transferência';
            return `${idx + 1}. ${val} | ${statusLabel} | ${dateStr} | ${bankStr}`;
          }).join('\n');

          histText = `Histórico de Depósitos (${recentList.length} registos):\n\n${items}\n\nPara fazer uma nova recarga, envie /depositar.`;
        } else {
          histText = 'Histórico de Depósitos:\nNenhum depósito registado na sua conta. Para recarregar, envie /depositar.';
        }

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'text',
          text: histText,
        }));
        return;
      }

      // 10. Limpar Conversa
      if (isSlashCmd && ['limpar', 'reset', 'clear'].includes(cleanCmd)) {
        try {
          localStorage.removeItem(CHAT_STORAGE_KEY);
          localStorage.removeItem('deposit_bot_recharge_id');
        } catch (e) {}
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        setLastIntent(null);
        setLastBotResponse(null);
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

      // 11. Comando direto /depositar ou /deposito (ou NLP com intent deposit sem valor)
      if (
        (isSlashCmd && ['depositar', 'recarregar', 'deposito', 'recarga'].includes(cleanCmd)) ||
        (nlp?.intent === 'deposit' && !nlp.amount)
      ) {
        setDepositAmount(null);
        setSelectedBank(null);
        setActiveRechargeId(null);
        setLastIntent('como_depositar');

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'amount_selector',
          text: `Qual valor deseja depositar? Digite o valor ou escolha uma opção abaixo (Mínimo: ${formatCurrency(MIN_RECHARGE, 'KZ')}, Máximo: ${formatCurrency(MAX_RECHARGE, 'KZ')}):`,
        }));
        return;
      }

      // 12. NLP com valor de depósito extraído (ex: "depositar 5000")
      if (nlp?.intent === 'deposit' && nlp.amount) {
        const amt = nlp.amount;
        if (amt < MIN_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
            text: `O valor mínimo para recarga é de ${formatCurrency(MIN_RECHARGE, 'KZ')}.`,
          }));
          return;
        }
        if (amt > MAX_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(), sender: 'bot', time: nowTime(), type: 'text',
            text: `O limite máximo por recarga é de ${formatCurrency(MAX_RECHARGE, 'KZ')}.`,
          }));
          return;
        }
        setDepositAmount(amt);
        setLastIntent('valor_deposito');
        botReply(() => ({
          id: 'bot-' + Date.now(), sender: 'bot', time: nowTime(), type: 'bank_selector',
          text: `Depósito de ${formatCurrency(amt, 'KZ')}. Escolha o banco abaixo:`,
          payload: { amount: amt, banks: collectionBanks },
        }));
        return;
      }

      // 13. Seleção de banco ativo se já houver valor definido
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

      // 14. Entrada numérica direta de valor de depósito
      const numericVal = parseInt(cleanCmd.replace(/\D/g, ''), 10);
      if (isPureNumeric && !isNaN(numericVal) && numericVal > 0) {
        if (numericVal < MIN_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `O valor mínimo para recarga é de ${formatCurrency(MIN_RECHARGE, 'KZ')}.`,
          }));
          return;
        }

        if (numericVal > MAX_RECHARGE) {
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: `O limite máximo por recarga é de ${formatCurrency(MAX_RECHARGE, 'KZ')}.`,
          }));
          return;
        }

        setDepositAmount(numericVal);
        setLastIntent('valor_deposito');

        botReply(() => ({
          id: 'bot-' + Date.now(),
          sender: 'bot',
          time: nowTime(),
          type: 'bank_selector',
          text: `Depósito de ${formatCurrency(numericVal, 'KZ')}. Escolha o banco para onde vai transferir:`,
          payload: {
            amount: numericVal,
            banks: collectionBanks,
          },
        }));
        return;
      }

      // 15. MOTOR CONVERSACIONAL DE DEPÓSITO (RPC backend classify_deposit_message)
      setIsTyping(true);
      try {
        const { data: rawRpc, error: rpcErr } = await (supabase.rpc as any)(
          'classify_deposit_message',
          {
            p_message: rawInput,
            p_last_intent: lastIntent,
            p_last_response: lastBotResponse,
          }
        );

        setIsTyping(false);

        const intentData = (!rpcErr && rawRpc && rawRpc.response) ? rawRpc : null;

        if (intentData && intentData.response) {
          const { category, response, action } = intentData;
          setLastIntent(category);
          setLastBotResponse(response);

          // Limpar asteriscos e cardinais vindos do backend
          const cleanResp = (response || '').replace(/[*#]/g, '').trim();

          // Ação: Seletor de Valor
          if (action === 'TRIGGER_AMOUNT_SELECTOR') {
            setDepositAmount(null);
            setSelectedBank(null);
            setActiveRechargeId(null);
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'amount_selector',
              text: cleanResp || `Qual valor deseja depositar? (Mínimo: ${formatCurrency(MIN_RECHARGE, 'KZ')}, Máximo: ${formatCurrency(MAX_RECHARGE, 'KZ')})`,
            }));
            return;
          }

          // Ação: Mostrar Bancos
          if (action === 'TRIGGER_BANKS') {
            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'banks_list',
              text: cleanResp,
              payload: { banks: collectionBanks },
            }));
            return;
          }

          // Ação: Histórico de depósitos
          if (action === 'TRIGGER_HISTORY') {
            setIsTyping(true);
            const recentList = await fetchRecentRecharges();
            setIsTyping(false);

            botReply(() => ({
              id: 'bot-' + Date.now(),
              sender: 'bot',
              time: nowTime(),
              type: 'history_list',
              text: cleanResp,
              payload: { list: recentList },
            }));
            return;
          }

          // Resposta conversacional padrão
          botReply(() => ({
            id: 'bot-' + Date.now(),
            sender: 'bot',
            time: nowTime(),
            type: 'text',
            text: cleanResp,
          }));
          return;
        }
      } catch (err) {
        setIsTyping(false);
      }

      // Resposta padrão caso não identifique
      botReply(() => ({
        id: 'bot-' + Date.now(),
        sender: 'bot',
        time: nowTime(),
        type: 'text',
        text: 'Não entendi com clareza. Você pode pedir seu saldo, solicitar um depósito (ex: depositar 1000) ou enviar /historico.',
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
      fetchDepositSummary,
      lastIntent,
      lastBotResponse,
    ]
  );

  const renderBotText = useCallback(
    (text: string) => <BotFormattedText text={text} onCommandClick={handleSendMessage} />,
    [handleSendMessage]
  );

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}
    >
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

      {/* ── HEADER OFICIAL DO DEPOSITBOT TELEGRAM COM AVATAR MODERNO ── */}
      <header
        className="w-full bg-white px-3 py-2 shrink-0 z-30 flex items-center justify-between border-b border-gray-200/60 relative"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-black hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer"
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
          </button>

          {/* Avatar Moderno DepositBot */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200/80 bg-white">
            <img src="/BotDeposit.jpg" alt="DepositBot" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-black leading-tight">DepositBot</span>
              <svg className="w-4 h-4 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span
              onClick={() => handleSendMessage('/historico')}
              className="text-[12px] text-[#707579] truncate cursor-pointer hover:text-[#3390ec] transition-colors"
            >
              {loading ? 'Carregando...' : `Recargas total: ${formatCurrency(totalRecharges, 'KZ')}`}
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
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  handleSendMessage('/total_deposito');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#10b981]" />
                <span>Total de Depósitos</span>
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
        className="flex-1 overflow-y-auto px-2.5 py-3 pb-24 space-y-1 relative select-text"
        style={{
          backgroundColor: '#afc8af',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`,
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
              <div key={msg.id} className="flex flex-col items-end mb-1.5 pr-2">
                <div className="relative max-w-[80%]">
                  <div
                    className="bg-[#eeffde] rounded-[16px] rounded-br-none px-3.5 py-2 select-text flex flex-col gap-1"
                    style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Comprovativo"
                        className="rounded-lg max-h-48 w-auto object-cover mt-1"
                      />
                    )}
                    <p
                      className={`text-[15px] leading-snug whitespace-pre-line ${
                        isValid ? 'text-[#1a7ac7] font-medium' : 'text-black font-normal'
                      }`}
                    >
                      {msg.text}
                    </p>
                    <div className="flex justify-end items-center gap-1 mt-0.5 shrink-0 text-[11px] text-[#6a9a6a] select-none">
                      <span>{msg.time}</span>
                      <span className="text-[#4fae4e] font-bold text-[11px] leading-none">✓✓</span>
                    </div>
                  </div>
                  <svg
                    width="9"
                    height="20"
                    viewBox="0 0 9 20"
                    className="absolute"
                    style={{ bottom: 0, right: -8, fill: '#eeffde' }}
                  >
                    <path d="M0 20H9C4.5 20 1 16 0 8V20Z" />
                  </svg>
                </div>
              </div>
            );
          }

          return (
            <React.Fragment key={msg.id}>
            <div
              className="flex flex-col items-start mb-2 max-w-[88%] sm:max-w-[80%] pl-2"
            >
              <div className="relative w-full">
                <svg
                  width="9"
                  height="20"
                  viewBox="0 0 9 20"
                  className="absolute"
                  style={{ top: 0, left: -8, fill: 'white' }}
                >
                  <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
                </svg>
                <div
                  className="bg-white rounded-[16px] rounded-tl-none px-3.5 py-2.5 text-gray-900 w-full relative select-text"
                  style={{ boxShadow: '0 1px 2px rgba(16,35,47,0.15)' }}
                >
                {/* APRESENTAÇÃO INICIAL / BOAS-VINDAS */}
                {msg.type === 'welcome' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="mb-2">
                      Olá! Seja muito bem-vindo! Sou o <strong>DepositBot</strong> 💳, seu assistente oficial de depósitos e recargas 😊
                    </p>
                    <p className="mb-2.5 text-gray-800">
                      Estou aqui para tornar suas recargas super rápidas, fáceis e descontraídas! Você pode me perguntar:
                    </p>
                    <p className="mb-2.5">
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/depositar')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /depositar
                      </span>{' '}
                      — Fazer uma recarga agora
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/saldo')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /saldo
                      </span>{' '}
                      — Ver seu saldo disponível
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/bancos')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /bancos
                      </span>{' '}
                      — Bancos disponíveis para depósito
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/horario')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /horario
                      </span>{' '}
                      — Horários de atendimento (24/24!)
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/limites')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /limites
                      </span>{' '}
                      — Valor mínimo e máximo
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/historico')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /historico
                      </span>{' '}
                      — Acompanhar seus depósitos
                      <br />
                      •{' '}
                      <span
                        onClick={() => handleSendMessage('/total_deposito')}
                        className="text-[#25ae60] font-semibold cursor-pointer hover:underline"
                      >
                        /total_deposito
                      </span>{' '}
                      — Relatório e total de depósitos
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

                {/* INSTRUÇÕES FINAIS DE DEPÓSITO COM BOTÃO DE COPIAR VALOR E IBAN */}
                {msg.type === 'deposit_instructions' && msg.payload && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-2">
                      Tudo pronto! Aqui estão os dados oficiais para você realizar o seu depósito: 🏦✨
                    </p>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[13.5px] space-y-2 my-2">
                      {/* VALOR COM BOTÃO DE COPIAR */}
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-gray-200/60">
                        <div>
                          <span className="text-[12px] text-gray-500 block">Valor a depositar:</span>
                          <span className="text-[#25ae60] font-bold text-[15px]">
                            {formatCurrency(msg.payload.amount, 'KZ')}
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(String(msg.payload.amount), true)}
                          className="px-2.5 py-1 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all text-[12px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          {copiedAmount ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-600" />
                              <span>Copiar Valor</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p>
                        • <strong>Banco Destinatário:</strong> {msg.payload.bank?.nome_banco}
                      </p>
                      <p>
                        • <strong>Titular da Conta:</strong>{' '}
                        {msg.payload.bank?.nome_proprietario || 'Conta Oficial'}
                      </p>

                      {/* IBAN COM BOTÃO DE COPIAR */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[12px] text-gray-500 block">IBAN:</span>
                          <code className="font-mono text-[13px] text-[#2481cc] font-bold select-all break-all">
                            {msg.payload.bank?.iban}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(msg.payload.bank?.iban, false)}
                          className="px-2.5 py-1 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all text-[12px] font-semibold shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          {copiedIban ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-600" />
                              <span>Copiar IBAN</span>
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
                      Após fazer o depósito, clique no botão verde abaixo para enviar a captura do comprovativo! Estarei aqui te aguardando ansiosamente para liberar o seu saldo, tá bom? 😊
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

                {/* RELATÓRIO DE TOTAL DE DEPÓSITOS */}
                {msg.type === 'deposit_summary' && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    {msg.text && renderBotText(msg.text)}
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#8a8a8a] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>
            </div>
            </div>

              {/* BOTÕES DE AÇÃO: APÓS INSTRUÇÕES DE DEPÓSITO — estilo inline keyboard Telegram */}
              {msg.type === 'deposit_instructions' && msg.payload && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors disabled:opacity-50 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isUploading ? '⏳ Enviando...' : '📷 Enviar Comprovativo'}
                  </button>
                  <button
                    onClick={() => handleSendMessage('/cancelar')}
                    className="bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    ✕ Cancelar Depósito
                  </button>
                </div>
              )}

              {/* INLINE KEYBOARD WELCOME */}
              {msg.type === 'welcome' && (
                <div className="w-full max-w-[80%] flex flex-col items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button onClick={() => handleSendMessage('/depositar')} className="bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-4 py-2 text-[14px] font-medium active:bg-opacity-90 transition-colors w-full flex items-center justify-center gap-1.5 cursor-pointer">💳 Fazer Depósito</button>
                  <div className="w-full flex items-center gap-1">
                    <button onClick={() => handleSendMessage('/bancos')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">🏦 Bancos</button>
                    <button onClick={() => handleSendMessage('/saldo')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">💰 Saldo</button>
                  </div>
                  <div className="w-full flex items-center gap-1">
                    <button onClick={() => handleSendMessage('/total_deposito')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">📊 Relatório</button>
                    <button onClick={() => handleSendMessage('/historico')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">📋 Histórico</button>
                  </div>
                </div>
              )}

              {msg.type === 'deposit_summary' && (
                <div className="w-full max-w-[80%] flex items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button onClick={() => handleSendMessage('/depositar')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">💳 Fazer Depósito</button>
                  <button onClick={() => handleSendMessage('/saldo')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">💰 Ver Saldo</button>
                </div>
              )}

              {msg.type === 'proof_success' && (
                <div className="w-full max-w-[80%] flex items-center justify-center gap-1 -mt-1.5 mb-2 pl-2">
                  <button onClick={() => handleSendMessage('/depositar')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">💳 Novo Depósito</button>
                  <button onClick={() => handleSendMessage('/historico')} className="flex-1 bg-[#6b7b8a] bg-opacity-70 text-white rounded-lg px-2 py-2 text-[13px] font-medium active:bg-opacity-90 transition-colors cursor-pointer">📋 Histórico</button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5 shadow-xs"
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
              <span className="text-[11.5px] text-[#707579] ml-1">DepositBot está digitando...</span>
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

      {/* ── FOOTER FLUTUANTE IDÊNTICO AO OFFICIAL CHANNEL ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-2 pb-3 z-40 flex justify-center bg-transparent pointer-events-none">
        <div className="w-full max-w-[650px] flex items-center gap-2 pointer-events-auto px-2">

          {/* Cápsula branca flutuante sobre o wallpaper */}
          <div className="flex-1 bg-white dark:bg-[#182533] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-3 py-1.5 min-h-[48px] border border-black/5 dark:border-white/10 transition-colors">

            {/* 📎 Clipe de Anexo na Esquerda */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 mr-1"
              title="Anexar Comprovativo de Depósito"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Campo de texto */}
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
                  ? 'Nome do banco...'
                  : 'Mensagem...'
              }
              className="flex-1 min-w-0 px-1 py-1 text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-[#8e8e93] dark:placeholder:text-gray-400 font-normal leading-snug"
            />

            {/* Botão Ajuda à direita dentro da cápsula */}
            <button
              onClick={() => handleSendMessage('/ajuda')}
              className="text-[#2481cc] text-[13.5px] font-semibold shrink-0 cursor-pointer hover:underline ml-2 active:scale-95 transition-transform"
            >
              Ajuda
            </button>
          </div>

          {/* Botão circular azul Telegram */}
          <button
            onClick={() => handleSendMessage()}
            className="w-[48px] h-[48px] rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(36,129,204,0.4)] cursor-pointer"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
