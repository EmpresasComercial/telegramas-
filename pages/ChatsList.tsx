import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  CheckCheck, 
  Loader2, 
  X, 
  Edit3, 
  Megaphone,
  MoreVertical,
  Bot,
  ArrowDownToLine,
  ArrowDownLeft,
  MessageCircle,
  Users
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { openWhatsAppAtendimento } from '../lib/atendimento';

// Selo de verificação oficial da empresa (Telegram Blue)
const OfficialVerifiedBadge = ({ className = "w-[16px] h-[16px]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 inline-block align-middle ml-1 select-none ${className}`}>
    <path
      fill="#2481cc"
      d="M10.26 2.45c.87-.6 2.05-.6 2.92 0l1.24.86c.4.28.88.42 1.37.4l1.51-.06c1.06-.04 1.98.63 2.23 1.66l.36 1.47c.12.48.38.9.76 1.21l1.17.97c.83.69 1.09 1.84.62 2.8l-.66 1.36c-.21.44-.27.94-.17 1.43l.31 1.48c.22 1.04-.37 2.07-1.41 2.47l-1.46.56c-.47.18-.86.51-1.12.94l-.79 1.3c-.56.92-1.68 1.32-2.7.98l-1.44-.48c-.46-.15-.96-.14-1.42.03l-1.43.52c-1.02.37-2.15-.01-2.73-.91l-.81-1.28c-.26-.42-.66-.74-1.13-.91l-1.47-.53c-1.05-.38-1.67-1.4-1.47-2.45l.28-1.49c.09-.48.05-.98-.14-1.43l-.63-1.38c-.45-.97-.16-2.11.69-2.78l1.19-.94c.39-.3.66-.72.79-1.19l.39-1.46c.27-1.02 1.21-1.67 2.26-1.6l1.51.09c.49.03.97-.1 1.38-.37l1.23-.88z"
    />
    <path
      fill="#ffffff"
      d="M9.5 12.5l-1.6-1.6a.8.8 0 0 0-1.13 1.13l2.17 2.17a.8.8 0 0 0 1.13 0l5.43-5.43a.8.8 0 0 0-1.13-1.13L9.5 12.5z"
    />
  </svg>
);

export default function ChatsList() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();

  const outletContext = useOutletContext<{ openAutoMessages?: () => void }>();

  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [communityLastMessage, setCommunityLastMessage] = useState<{
    text: string;
    sender: string;
    time: string;
    isMe: boolean;
    timestamp: number;
  }>({
    text: "Bem-vindo à comunidade oficial de negócios e automações!",
    sender: "Equipe Telegram",
    time: "Hoje",
    isMe: false,
    timestamp: Date.now() - 1000 * 60 * 15
  });
  
  // Abas oficiais conforme especificação da Fase 1:
  // Conversas | Grupos | Canais | Bots | Mensagens lidas
  type ChatFolder = 'all' | 'groups' | 'channels' | 'bots' | 'unread';
  const [activeFilter, setActiveFilter] = useState<ChatFolder>('all');

  const PAVEL_DUROV_ID = 'pavel-durov-ceo-00000000000000001';

  const formatSenderPhone = (p: string) => {
    if (!p) return 'Contacto';
    const clean = p.replace(/^\+?244\s*/, '').trim();
    if (/^\d{9}$/.test(clean)) {
      return `+244 ${clean.slice(0, 3)} *** ${clean.slice(6)}`;
    }
    return p;
  };

  const formatTelegramTime = (dateInput: Date | string | number): string => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    
    // Mesmo dia: HH:MM
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }

    // Ontem: "ontem"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'ontem';
    }

    // Últimos 7 dias: dia da semana abreviado (seg., ter., qua., ...)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      return d.toLocaleDateString('pt-PT', { weekday: 'short' });
    }

    // Mais de 7 dias: DD/MM
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    const fetchCommunityLastMessage = async () => {
      try {
        const { data: latestMsg } = await supabase
          .from('chat_gruop')
          .select('mensagem, detalhes, data_registrada, uid_emissor')
          .order('data_registrada', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMsg) {
          let senderLabel = "Membro";
          if (user && latestMsg.uid_emissor === user.id) {
            senderLabel = "Você";
          } else {
            const { data: prof } = await supabase
              .from('sys_t500')
              .select('nome_exibicao, telefone')
              .eq('id', latestMsg.uid_emissor)
              .maybeSingle();
            if (prof?.nome_exibicao) {
              senderLabel = prof.nome_exibicao;
            } else if (prof?.telefone) {
              senderLabel = formatSenderPhone(prof.telefone);
            }
          }

          const parsedData: any = (latestMsg.detalhes && typeof latestMsg.detalhes === 'object') ? latestMsg.detalhes : {};
          const text = latestMsg.mensagem || (parsedData.imagem_url ? "📷 Foto" : "Mensagem");
          const msgTimestamp = new Date(latestMsg.data_registrada).getTime();

          setCommunityLastMessage({
            text,
            sender: senderLabel,
            time: formatTelegramTime(msgTimestamp),
            isMe: user ? latestMsg.uid_emissor === user.id : false,
            timestamp: msgTimestamp
          });
        }
      } catch (err) {
        console.error('Erro ao carregar última mensagem da comunidade:', err);
      }
    };

    fetchCommunityLastMessage();

    const commChannel = supabase.channel('chatslist_community_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_gruop' }, () => {
        fetchCommunityLastMessage();
      })
      .subscribe();

    const poll = setInterval(fetchCommunityLastMessage, 5000);

    return () => {
      supabase.removeChannel(commChannel);
      clearInterval(poll);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        let uniqueContacts = new Map<string, any>();

        // 1. Buscar todos os membros e subordinados
        const { data: subData, error: subError } = await (supabase as any).rpc('get_my_subordinates_chat');
        if (!subError && subData && Array.isArray(subData)) {
          subData.forEach((sub: any) => {
            uniqueContacts.set(sub.membro_id, {
              id: sub.membro_id,
              telefone: sub.telefone,
              nome_exibicao: sub.nome_exibicao,
              nivel: sub.nivel,
              patrocinador_id: sub.patrocinador_id,
              patrocinador_telefone: sub.patrocinador_telefone,
              codigo_meu_refferal: sub.codigo_meu_refferal,
              data_registro: sub.data_registro,
              total_recarregado: sub.total_recarregado,
              isSubordinate: true
            });
          });
        }

        // 2. Buscar o patrocinador direto do utilizador (se houver)
        const { data: sponsorData } = await supabase
          .from('equipe_mcpn')
          .select('patrocinador_id')
          .eq('usuario_id', user.id);

        if (sponsorData && sponsorData.length > 0) {
          for (const item of sponsorData) {
            if (item.patrocinador_id && !uniqueContacts.has(item.patrocinador_id)) {
              const { data: pData } = await supabase
                .from('sys_t500')
                .select('telefone, nome_exibicao')
                .eq('id', item.patrocinador_id)
                .maybeSingle();

              if (pData?.telefone) {
                uniqueContacts.set(item.patrocinador_id, {
                  id: item.patrocinador_id,
                  telefone: pData.telefone,
                  nome_exibicao: pData.nome_exibicao,
                  isSponsor: true
                });
              }
            }
          }
        }

        // 3. Buscar as mensagens mais recentes trocadas
        try {
          const { data: lastMsgs } = await (supabase as any)
            .from('sys_t110')
            .select('*')
            .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

          if (lastMsgs && lastMsgs.length > 0) {
            // Se houver mensagens com usuários não listados na equipe, buscar dados em sys_t500
            const missingIds: string[] = [];
            lastMsgs.forEach((msg: any) => {
              const otherId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
              if (otherId && !uniqueContacts.has(otherId) && !missingIds.includes(otherId)) {
                missingIds.push(otherId);
              }
            });

            if (missingIds.length > 0) {
              const { data: missingUsers } = await supabase
                .from('sys_t500')
                .select('id, telefone, nome_exibicao')
                .in('id', missingIds);

              if (missingUsers) {
                missingUsers.forEach((u: any) => {
                  uniqueContacts.set(u.id, {
                    id: u.id,
                    telefone: u.telefone,
                    nome_exibicao: u.nome_exibicao,
                    isSubordinate: false
                  });
                });
              }
            }

            lastMsgs.forEach((msg: any) => {
              const otherId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
              if (uniqueContacts.has(otherId)) {
                const existing = uniqueContacts.get(otherId);
                if (!existing.lastMessage) {
                  const msgTime = new Date(msg.created_at).getTime();
                  uniqueContacts.set(otherId, {
                    ...existing,
                    lastMessage: msg.mensagem,
                    lastMessageTime: formatTelegramTime(msgTime),
                    lastMessageTimestamp: msgTime,
                    isMe: msg.remetente_id === user.id
                  });
                }
              }
            });
          }
        } catch {}

        const sorted = Array.from(uniqueContacts.values()).sort((a: any, b: any) => {
          const timeA = a.lastMessageTimestamp ? Number(a.lastMessageTimestamp) : 0;
          const timeB = b.lastMessageTimestamp ? Number(b.lastMessageTimestamp) : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (a.nivel || 99) - (b.nivel || 99);
        });

        setContacts(sorted);
      } catch (e) {
        console.error('Erro ao carregar contactos:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();

    const contactChannel = supabase.channel('chatslist_contacts_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t110' }, () => {
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipe_mcpn' }, () => {
        fetchContacts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contactChannel);
    };
  }, [user]);

  const getUserColor = (str: string) => {
    const colors = ["#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9", "#F39C12", "#7F8C8D"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Pesquisa dinâmica
  const queryClean = searchQuery.toLowerCase().trim();
  const queryDigits = queryClean.replace(/\D/g, '');

  const filteredContacts = useMemo(() => {
    if (activeFilter === 'groups' || activeFilter === 'channels' || activeFilter === 'bots') return [];

    let list = contacts;

    if (activeFilter === 'unread') {
      list = contacts.filter(c => !c.isMe && Boolean(c.lastMessage));
    }

    if (!queryClean) return list;

    return list.filter(c => {
      const rawTel = (c.telefone || '').toLowerCase();
      const formattedTel = formatSenderPhone(c.telefone).toLowerCase();
      const name = (c.nome_exibicao || '').toLowerCase();
      const digitsOnly = rawTel.replace(/\D/g, '');

      return (
        rawTel.includes(queryClean) ||
        formattedTel.includes(queryClean) ||
        name.includes(queryClean) ||
        (queryDigits.length > 0 && digitsOnly.includes(queryDigits))
      );
    });
  }, [contacts, queryClean, queryDigits, activeFilter]);

  // Estrutura das abas solicitadas: Conversas | Grupos | Canais | Bots | Mensagens lidas
  const folders: { id: ChatFolder; label: string; count?: number }[] = [
    { id: 'all', label: 'Conversas', count: contacts.length + 5 },
    { id: 'groups', label: 'Grupos', count: 1 },
    { id: 'channels', label: 'Canais', count: 1 },
    { id: 'bots', label: 'Bots', count: 3 },
    { id: 'unread', label: 'Mensagens lidas', count: contacts.filter(c => !c.isMe && Boolean(c.lastMessage)).length },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  const handleWhatsAppClick = async () => {
    showToast('Acessando grupo do WhatsApp...', 'info');
    const res = await openWhatsAppAtendimento();
    if (!res.success && res.message) {
      showToast(res.message, 'error');
    }
  };

  // Lista de conversas com ordenação estrita por data/hora da mensagem mais recente (sem fixação permanente)
  const allConversations = useMemo(() => {
    // 1. Conversas do Sistema / Oficiais
    const systemChats = [
      {
        id: 'community-chat',
        folder: 'groups' as ChatFolder,
        name: 'Telegram Business Oficial',
        isVerified: true,
        lastMessage: communityLastMessage.text,
        senderPrefix: `${communityLastMessage.sender}: `,
        time: communityLastMessage.time,
        timestamp: communityLastMessage.timestamp,
        isMe: communityLastMessage.isMe,
        actionBtn: null,
        tag: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] flex items-center justify-center shadow-xs overflow-hidden">
            <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[26px] h-[26px]">
              <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
              <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
              <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
            </svg>
          </div>
        ),
        onClick: () => navigate('/chat-comunidade')
      },
      {
        id: 'pavel-durov',
        folder: 'channels' as ChatFolder,
        name: 'Pavel Durov Fundador',
        isVerified: true,
        lastMessage: '📢 Novo sistema de monetização por Telegram Stars e Mini Apps lançado oficialmente.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 20),
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
        isMe: false,
        actionBtn: null,
        tag: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs bg-[#2481cc]/20 border border-white/40">
            <img
              src="/pavel_durov.jpg"
              alt="Pavel Durov Fundador"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
              }}
            />
          </div>
        ),
        onClick: () => navigate('/canal-oficial')
      },
      {
        id: 'deposit-bot',
        folder: 'bots' as ChatFolder,
        name: 'DepositBot',
        isVerified: true,
        tag: 'BOT',
        lastMessage: '⚡ Recargas e depósitos automáticos via Multicaixa Express e IBAN.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 36),
        timestamp: Date.now() - 1000 * 60 * 60 * 36,
        isMe: false,
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src="/BotDeposit.jpg" 
              alt="DepositBot" 
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/recarregar')
      },
      {
        id: 'withdrawal-bot',
        folder: 'bots' as ChatFolder,
        name: 'BotWithdrawal',
        isVerified: true,
        tag: 'BOT',
        lastMessage: '🏦 Solicitações de saque e levantamentos rápidos para conta bancária.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 48),
        timestamp: Date.now() - 1000 * 60 * 60 * 48,
        isMe: false,
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src="/botRetirada.jpg" 
              alt="BotWithdrawal" 
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: () => navigate('/retirada')
      },
      {
        id: 'whatsapp-bot',
        folder: 'bots' as ChatFolder,
        name: 'BotWhatsApp',
        isVerified: true,
        tag: 'OFICIAL',
        lastMessage: '💬 Grupo oficial no WhatsApp para suporte, comissões e provas de pagamento.',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 60),
        timestamp: Date.now() - 1000 * 60 * 60 * 60,
        isMe: false,
        actionBtn: null,
        isSubordinate: false,
        nivel: null,
        avatar: (
          <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs border border-gray-200/80 bg-white">
            <img 
              src="/botWhatsap.jpg" 
              alt="BotWhatsApp" 
              className="w-full h-full object-cover"
            />
          </div>
        ),
        onClick: handleWhatsAppClick
      },
      {
        id: 'botfather',
        folder: 'bots' as ChatFolder,
        name: 'BotFather',
        isVerified: true,
        tag: null,
        lastMessage: 'You have currently no bots',
        senderPrefix: null,
        time: formatTelegramTime(Date.now() - 1000 * 60 * 60 * 72),
        timestamp: Date.now() - 1000 * 60 * 60 * 72,
        isMe: false,
        isSubordinate: false,
        nivel: null,
        actionBtn: (
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/bot-pay'); }}
            className="shrink-0 px-3.5 py-1 rounded-full bg-[#2481cc] text-white text-[13px] font-medium leading-none cursor-pointer hover:bg-[#1e6eb0] active:bg-[#1a5e9a] transition-colors"
          >
            Abrir
          </button>
        ),
        avatar: (
          <div className="w-[52px] h-[52px] rounded-full overflow-hidden border border-gray-200/80 bg-white flex-shrink-0">
            <img 
              src="/BotFather.jpg" 
              alt="BotFather" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/botfather.png";
              }}
            />
          </div>
        ),
        onClick: () => navigate('/bot-pay')
      }
    ];

    // 2. Contatos com conversas ativas (que possuem mensagens trocadas)
    const activeContactChats = contacts
      .filter(c => Boolean(c.lastMessage))
      .map(c => {
        const color = getUserColor(c.telefone);
        const label = (c.telefone || '').replace(/\D/g, '').slice(-2) || '?';
        const isSub = Boolean(c.isSubordinate);
        const nv = c.nivel;
        const isOnline = isSub && nv === 1;
        const ts = c.lastMessageTimestamp ? Number(c.lastMessageTimestamp) : Date.now();

        return {
          id: `contact-${c.id}`,
          folder: 'all' as ChatFolder,
          name: c.nome_exibicao || formatSenderPhone(c.telefone),
          isVerified: false,
          tag: null,
          isSubordinate: isSub,
          nivel: nv,
          isOnline,
          lastMessage: c.lastMessage,
          senderPrefix: null,
          time: formatTelegramTime(ts),
          timestamp: ts,
          isMe: c.isMe,
          actionBtn: null,
          avatar: (
            <div className="relative shrink-0">
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                style={{ backgroundColor: color }}
              >
                {label}
              </div>
              {isSub && nv && (
                <div
                  className={`absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#17212b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                    nv === 1 ? 'bg-[#10b981]' : nv === 2 ? 'bg-[#3b82f6]' : 'bg-[#8b5cf6]'
                  }`}
                  title={`Subordinado de ${nv}º nível`}
                >
                  {nv}
                </div>
              )}
            </div>
          ),
          onClick: () => navigate(`/chat/${c.id}?t=${encodeURIComponent(c.telefone)}${nv ? `&nv=${nv}` : ''}`)
        };
      });

    // 3. Combina e ordena estritamente por timestamp decrescente (a conversa mais recente sempre em 1º lugar!)
    return [...systemChats, ...activeContactChats].sort((a, b) => b.timestamp - a.timestamp);
  }, [communityLastMessage, contacts, navigate]);

  const filteredChats = useMemo(() => {
    let list = allConversations;

    if (activeFilter === 'groups') {
      list = list.filter(c => c.folder === 'groups');
    } else if (activeFilter === 'channels') {
      list = list.filter(c => c.folder === 'channels');
    } else if (activeFilter === 'bots') {
      list = list.filter(c => c.folder === 'bots');
    } else if (activeFilter === 'unread') {
      list = list.filter(c => !c.isMe);
    }

    if (queryClean) {
      list = list.filter(c => {
        const nameMatch = c.name.toLowerCase().includes(queryClean);
        const msgMatch = (c.lastMessage || '').toLowerCase().includes(queryClean);
        return nameMatch || msgMatch;
      });
    }

    return list;
  }, [allConversations, activeFilter, queryClean]);

  const idleContacts = useMemo(() => {
    if (activeFilter !== 'all') return [];
    return filteredContacts.filter(c => !c.lastMessage);
  }, [filteredContacts, activeFilter]);

  return (
    <div 
      className="w-full min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans antialiased flex flex-col transition-colors select-none tg-chat-no-select"
      onContextMenu={(e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      
      {/* ── TOP APP BAR OFICIAL DO TELEGRAM ── */}
      <header className="sticky top-0 z-40 bg-white dark:bg-[#242f3d] shadow-[0_1px_0_rgba(0,0,0,0.08)] select-none transition-colors">
        <div className="h-[56px] px-2 flex items-center justify-between gap-1">
          
          {/* Campo de Busca ativo com botão voltar ou Título Telegram */}
          {isSearching ? (
            <>
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery("");
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer shrink-0"
                title="Voltar"
              >
                <X className="w-5 h-5 text-[#111] dark:text-white" />
              </button>

              <div className="flex-1 flex items-center bg-[#f1f1f1] dark:bg-[#1c2733] rounded-full px-3.5 py-1.5 mx-1">
                <Search className="w-4 h-4 text-[#707579] dark:text-[#9eaab6] mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar conversas, bots ou mensagens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#111] dark:text-white placeholder:text-[#707579] outline-none border-none"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-[#aaa] hover:bg-[#999] text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center pl-2">
              <h1 className="text-[22px] font-bold tracking-tight text-[#2481cc] dark:text-[#6ab3f3]">
                Telegram
              </h1>
            </div>
          )}

          {/* Ações da Direita */}
          <div className="flex items-center gap-0">
            {!isSearching && (
              <button
                onClick={() => setIsSearching(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                title="Pesquisar"
              >
                <Search className="w-5 h-5 text-[#111] dark:text-white" />
              </button>
            )}

            <button
              onClick={() => {
                if (outletContext?.openAutoMessages) {
                  outletContext.openAutoMessages();
                } else {
                  navigate('/perfil');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              title="Mensagens Automáticas & Configurações"
            >
              <MoreVertical className="w-5 h-5 text-[#111] dark:text-white" />
            </button>
          </div>
        </div>

        {/* ── ABAS SUPERIORES ── */}
        <div className="flex overflow-x-auto no-scrollbar px-2 bg-white dark:bg-[#242f3d] border-t border-[#e8e8e8] dark:border-white/10">
          {folders.map(folder => {
            const isActive = activeFilter === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFilter(folder.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[14px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#2481cc] dark:text-[#6ab3f3] font-semibold'
                    : 'text-[#707579] dark:text-[#9eaab6] hover:text-[#2481cc] dark:hover:text-[#6ab3f3]'
                }`}
              >
                <span>{folder.label}</span>
                {typeof folder.count === 'number' && folder.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0 rounded-full font-bold leading-[18px] min-w-[18px] text-center ${
                    isActive
                      ? 'bg-[#2481cc] dark:bg-[#6ab3f3] text-white'
                      : 'bg-[#d9d9d9] dark:bg-white/20 text-[#707579] dark:text-white'
                  }`}>
                    {folder.count}
                  </span>
                )}
                {/* Indicador ativo inferior */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2481cc] dark:bg-[#6ab3f3] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── CORPO PRINCIPAL DE CHATS (ORDENAÇÃO DINÂMICA SEM CONVERSAS FIXAS) ── */}
      <main className="w-full flex-1 overflow-y-auto pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="w-7 h-7 text-[#2481cc] animate-spin" />
            <span className="text-[13px] text-[#707579] dark:text-[#9eaab6]">Carregando conversas...</span>
          </div>
        ) : (
          <>
            {/* 1. Lista de conversas ativas ordenadas por recência */}
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={chat.onClick}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
              >
                <div className="relative shrink-0">
                  {chat.avatar}
                </div>

                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                        {chat.name}
                      </h3>
                      {chat.isVerified && <OfficialVerifiedBadge />}
                      {chat.tag && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-[#2481cc] text-white">
                          {chat.tag}
                        </span>
                      )}
                      {chat.isSubordinate && chat.nivel && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ml-1 ${
                          chat.nivel === 1
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : chat.nivel === 2
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        }`}>
                          {chat.nivel}º Nível
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {chat.isMe && (
                        <CheckCheck className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                      )}
                      <span className="text-[12px] text-[#707579] dark:text-[#9eaab6]">
                        {chat.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] text-[#707579] dark:text-[#9eaab6] truncate leading-snug">
                      {chat.senderPrefix && (
                        <span className="text-[#2481cc] font-medium">{chat.senderPrefix}</span>
                      )}
                      {chat.lastMessage}
                    </p>
                    {chat.actionBtn}
                  </div>
                </div>
              </div>
            ))}

            {/* 2. Seção de contatos (sem conversas recentes iniciadas) */}
            {activeFilter === 'all' && idleContacts.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#f4f4f5] dark:bg-[#1a2330] border-b border-gray-100/80 dark:border-[#202b36]">
                  <span className="text-[13px] font-medium text-[#2481cc] dark:text-[#6ab3f3]">
                    Seus contatos no Telegram
                  </span>
                </div>

                {idleContacts.map((contact) => {
                  const color = getUserColor(contact.telefone);
                  const label = (contact.telefone || '').replace(/\D/g, '').slice(-2) || '?';
                  const isSub = Boolean(contact.isSubordinate);
                  const nv = contact.nivel;
                  const isOnline = isSub && nv === 1;

                  return (
                    <div
                      key={contact.id}
                      onClick={() => navigate(`/chat/${contact.id}?t=${encodeURIComponent(contact.telefone)}${nv ? `&nv=${nv}` : ''}`)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
                    >
                      <div className="relative shrink-0">
                        <div
                          className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[17px] font-bold"
                          style={{ backgroundColor: color }}
                        >
                          {label}
                        </div>

                        {isSub && nv && (
                          <div
                            className={`absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#17212b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                              nv === 1 ? 'bg-[#10b981]' : nv === 2 ? 'bg-[#3b82f6]' : 'bg-[#8b5cf6]'
                            }`}
                            title={`Subordinado de ${nv}º nível`}
                          >
                            {nv}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <h3 className="text-[15px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                              {contact.nome_exibicao || formatSenderPhone(contact.telefone)}
                            </h3>
                            {isSub && nv && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${
                                nv === 1
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : nv === 2
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              }`}>
                                {nv}º Nível
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[13px] leading-snug mt-[1px] truncate">
                          {isOnline ? (
                            <span className="text-[#4dcd5e] font-medium">online</span>
                          ) : (
                            <span className="text-[#707579] dark:text-[#9eaab6]">
                              visto às {timeStr}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Feedback quando a busca não encontra nada */}
            {searchQuery && filteredChats.length === 0 && idleContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-[#707579] dark:text-[#9eaab6] text-[15px] mb-2">
                  Nenhum resultado encontrado para "<strong>{searchQuery}</strong>"
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[#2481cc] text-[14px] font-semibold cursor-pointer"
                >
                  Limpar busca
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── BOTÃO DE AÇÃO FLUTUANTE OFICIAL DO TELEGRAM (FAB LÁPIS) ── */}
      <button
        onClick={() => {
          showToast('Iniciando novo chat...', 'info');
          navigate('/chat-comunidade');
        }}
        className="fixed bottom-[74px] right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(36,129,204,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Nova Conversa"
        aria-label="Nova Conversa"
      >
        <Edit3 className="w-6 h-6 stroke-[2.2]" />
      </button>

    </div>
  );
}
