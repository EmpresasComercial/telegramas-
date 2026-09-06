import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  Search, 
  CheckCheck, 
  Loader2, 
  Pin, 
  X, 
  Bookmark, 
  Radio, 
  MessageSquare, 
  Edit3, 
  ShieldCheck,
  Megaphone,
  Moon,
  Sun,
  MoreVertical,
  Users
} from 'lucide-react';
import TelegramStories from '../components/TelegramStories';
import { useToast } from '../components/Toast';

export default function ChatsList() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();

  // Recebe openDrawer do Layout através do useOutletContext
  const outletContext = useOutletContext<{ openDrawer?: () => void; openAutoMessages?: () => void }>();

  const [contacts, setContacts] = useState<any[]>([]);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [subLevelFilter, setSubLevelFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [communityLastMessage, setCommunityLastMessage] = useState<{
    text: string;
    sender: string;
    time: string;
    isMe: boolean;
  }>({
    text: "Bem-vindo à comunidade oficial de negócios e automações!",
    sender: "Equipe Telegram",
    time: "Hoje",
    isMe: false
  });
  
  type ChatFolder = 'all' | 'subordinates' | 'personal' | 'groups' | 'channels' | 'bots' | 'unread';
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
          const msgDate = new Date(latestMsg.data_registrada);
          const now = new Date();
          const isToday = msgDate.toDateString() === now.toDateString();
          const time = isToday
            ? msgDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
            : msgDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });

          setCommunityLastMessage({
            text,
            sender: senderLabel,
            time,
            isMe: user ? latestMsg.uid_emissor === user.id : false
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

        // 1. Buscar todos os subordinados multinível (Níveis 1, 2 e 3)
        const { data: subData, error: subError } = await (supabase as any).rpc('get_my_subordinates_chat');
        if (!subError && subData && Array.isArray(subData)) {
          setSubordinates(subData);
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
            lastMsgs.forEach((msg: any) => {
              const otherId = msg.remetente_id === user.id ? msg.destinatario_id : msg.remetente_id;
              if (uniqueContacts.has(otherId)) {
                const existing = uniqueContacts.get(otherId);
                if (!existing.lastMessage) {
                  uniqueContacts.set(otherId, {
                    ...existing,
                    lastMessage: msg.mensagem,
                    lastMessageTime: new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                    lastMessageTimestamp: msg.created_at,
                    isMe: msg.remetente_id === user.id
                  });
                }
              }
            });
          }
        } catch {}

        const sorted = Array.from(uniqueContacts.values()).sort((a: any, b: any) => {
          const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
          const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (a.nivel || 99) - (b.nivel || 99);
        });

        setContacts(sorted);
      } catch (e) {
        console.error('Erro ao carregar contactos e subordinados:', e);
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

  // Pesquisa dinâmica inteligente
  const queryClean = searchQuery.toLowerCase().trim();
  const queryDigits = queryClean.replace(/\D/g, '');

  const filteredContacts = useMemo(() => {
    if (activeFilter === 'groups' || activeFilter === 'channels' || activeFilter === 'bots') return [];

    let list = contacts;

    if (activeFilter === 'subordinates') {
      list = contacts.filter(c => c.isSubordinate);
      if (subLevelFilter !== 'all') {
        list = list.filter(c => c.nivel === subLevelFilter);
      }
    } else if (activeFilter === 'personal') {
      list = contacts.filter(c => !c.isSubordinate);
    } else if (activeFilter === 'unread') {
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
  }, [contacts, queryClean, queryDigits, activeFilter, subLevelFilter]);

  const folders: { id: ChatFolder; label: string; count?: number }[] = [
    { id: 'all', label: 'Todos', count: contacts.length + 3 },
    { id: 'subordinates', label: 'Subordinados', count: subordinates.length },
    { id: 'personal', label: 'Pessoais', count: contacts.filter(c => !c.isSubordinate).length },
    { id: 'groups', label: 'Grupos', count: 1 },
    { id: 'channels', label: 'Canais', count: 1 },
    { id: 'bots', label: 'Bots', count: 1 },
    { id: 'unread', label: 'Não Lidos', count: contacts.filter(c => !c.isMe && Boolean(c.lastMessage)).length },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans antialiased flex flex-col transition-colors">
      
      {/* ── TOP APP BAR OFICIAL DO TELEGRAM (ANDROID NATIVO) ── */}
      <header className="sticky top-0 z-40 bg-[#517da2] dark:bg-[#242f3d] text-white shadow-sm select-none transition-colors">
        <div className="h-[56px] px-3 flex items-center justify-between gap-2">
          
          {/* Botão Hambúrguer (Drawer) ou Voltar da Busca */}
          {isSearching ? (
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery("");
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              title="Voltar"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              onClick={() => {
                if (outletContext?.openDrawer) {
                  outletContext.openDrawer();
                } else {
                  showToast('Abrindo menu...', 'info');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              title="Abrir Menu Lateral"
              aria-label="Menu Telegram"
            >
              <Menu className="w-6 h-6 text-white stroke-[2.2]" />
            </button>
          )}

          {/* Título Oficial ou Campo de Busca */}
          {isSearching ? (
            <div className="flex-1 flex items-center bg-black/15 dark:bg-black/25 rounded-full px-3.5 py-1.5 mx-1">
              <Search className="w-4 h-4 text-white/70 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar chats, pessoas ou mensagens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/60 outline-none border-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 pl-1">
              <h1 className="text-[20px] font-bold tracking-tight text-white">
                Telegram
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                Business
              </span>
            </div>
          )}

          {/* Ações da Direita */}
          <div className="flex items-center gap-0.5">
            {!isSearching && (
              <button
                onClick={() => setIsSearching(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
                title="Pesquisar"
              >
                <Search className="w-5 h-5 text-white" />
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
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer text-white"
              title="Mensagens Automáticas & Configurações"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── ABAS DE PASTAS DE CHATS DO TELEGRAM (TABS NATIVAS) ── */}
        <div className="flex overflow-x-auto no-scrollbar px-2 bg-[#517da2] dark:bg-[#242f3d] border-t border-white/10">
          {folders.map(folder => {
            const isActive = activeFilter === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFilter(folder.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span>{folder.label}</span>
                {typeof folder.count === 'number' && folder.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                    isActive ? 'bg-white text-[#2481cc]' : 'bg-black/20 text-white/90'
                  }`}>
                    {folder.count}
                  </span>
                )}
                {/* Linha indicadora inferior Telegram */}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-white rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── CORPO PRINCIPAL DE CHATS ── */}
      <main className="w-full flex-1 overflow-y-auto pb-20">
        
        {/* Telegram Stories Carousel */}
        <TelegramStories />

        {/* ── 1. COMUNIDADE OFICIAL TELEGRAM BUSINESS (PINNED #1) ── */}
        {(activeFilter === 'all' || activeFilter === 'groups') && (
          <div
            onClick={() => navigate('/chat-comunidade')}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
          >
            {/* Avatar Oficial Telegram */}
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] flex items-center justify-center shadow-xs overflow-hidden">
                <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[26px] h-[26px]">
                  <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
                  <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
                  <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#2481cc] rounded-full border-2 border-white dark:border-[#17212b] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                    Telegram Business Oficial
                  </h3>
                  {/* Verified Checkmark Badge Oficial */}
                  <span className="shrink-0 w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    ✓
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {communityLastMessage.isMe && (
                    <CheckCheck className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                  )}
                  <Pin className="w-3.5 h-3.5 text-[#2481cc] fill-[#2481cc]" />
                  <span className="text-[12px] text-[#2481cc] font-medium">
                    {communityLastMessage.time}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[13.5px] text-[#707579] dark:text-[#9eaab6] truncate leading-snug">
                  <span className="text-[#2481cc] font-medium">{communityLastMessage.sender}: </span>
                  {communityLastMessage.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. PAVEL DUROV (CEO TELEGRAM) (PINNED #2) ── */}
        {(activeFilter === 'all' || activeFilter === 'personal') && (
          <div
            onClick={() => navigate(`/chat/${PAVEL_DUROV_ID}?t=Pavel+Durov`)}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
          >
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-full overflow-hidden shadow-xs bg-[#2481cc]/20 border border-white/40">
                <img 
                  src="/pavel_durov.jpg" 
                  alt="Pavel Durov" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as any).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop";
                  }}
                />
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#17212b]" />
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                    Pavel Durov
                  </h3>
                  <span className="shrink-0 w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-[#8d54d9] text-white">
                    CEO
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <CheckCheck className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                  <span className="text-[12px] text-[#707579] dark:text-[#9eaab6]">14:15</span>
                </div>
              </div>

              <p className="text-[13.5px] text-[#707579] dark:text-[#9eaab6] truncate leading-snug">
                Telegram Business agora disponível para todas as contas e canais.
              </p>
            </div>
          </div>
        )}

        {/* ── 3. CANAL OFICIAL DE ANÚNCIOS TELEGRAM ── */}
        {(activeFilter === 'all' || activeFilter === 'channels') && (
          <div
            onClick={() => navigate('/canal-oficial')}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
          >
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#0088cc] to-[#37aee2] flex items-center justify-center shadow-xs text-white">
                <Megaphone className="w-6 h-6" />
              </div>
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                    Telegram News & Updates
                  </h3>
                  <span className="shrink-0 w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                </div>
                <span className="text-[12px] text-[#707579] dark:text-[#9eaab6]">Ontem</span>
              </div>

              <p className="text-[13.5px] text-[#707579] dark:text-[#9eaab6] truncate leading-snug">
                📢 Novo sistema de monetização por Telegram Stars e Mini Apps lançado oficialmente.
              </p>
            </div>
          </div>
        )}


        {/* ── SUB-FILTROS DE NÍVEIS PARA SUBORDINADOS ── */}
        {activeFilter === 'subordinates' && (
          <div className="sticky top-0 z-30 flex items-center gap-1.5 px-3 py-2 bg-[#f4f7fa] dark:bg-[#1e2833] border-b border-gray-200/60 dark:border-white/10 overflow-x-auto no-scrollbar select-none">
            {[
              { id: 'all', label: 'Todos os Níveis', count: subordinates.length },
              { id: 1, label: 'Nível 1 (Diretos)', count: subordinates.filter(s => s.nivel === 1).length, color: 'text-amber-600 dark:text-amber-400' },
              { id: 2, label: 'Nível 2 (Indiretos)', count: subordinates.filter(s => s.nivel === 2).length, color: 'text-purple-600 dark:text-purple-400' },
              { id: 3, label: 'Nível 3 (Rede)', count: subordinates.filter(s => s.nivel === 3).length, color: 'text-teal-600 dark:text-teal-400' },
            ].map(pill => {
              const isSelected = subLevelFilter === pill.id;
              return (
                <button
                  key={String(pill.id)}
                  onClick={() => setSubLevelFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2481cc] text-white shadow-xs'
                      : 'bg-white dark:bg-[#273444] text-[#707579] dark:text-[#9eaab6] border border-gray-200 dark:border-white/10 hover:border-[#2481cc]/40'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-black/30 text-gray-600 dark:text-gray-300'
                  }`}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 6. LISTA DINÂMICA DE CONTATOS E SUBORDINADOS ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="w-7 h-7 text-[#2481cc] animate-spin" />
            <span className="text-[13px] text-[#707579] dark:text-[#9eaab6]">Carregando conversas e subordinados...</span>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const color = getUserColor(contact.telefone);
            const label = (contact.telefone || '').replace(/\D/g, '').slice(-2) || '?';
            const isSub = Boolean(contact.isSubordinate);
            const nv = contact.nivel;

            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/chat/${contact.id}?t=${encodeURIComponent(contact.telefone)}${nv ? `&nv=${nv}` : ''}`)}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202b36] active:bg-gray-100 dark:active:bg-[#242f3d] transition-colors cursor-pointer border-b border-gray-100/80 dark:border-[#202b36]"
              >
                {/* Avatar Oficial Telegram com Badge de Nível */}
                <div className="relative shrink-0">
                  <div
                    className="w-13 h-13 rounded-full flex items-center justify-center text-white text-[18px] font-bold shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </div>

                  {/* Badge de Nível Multinível */}
                  {isSub && nv && (
                    <div
                      className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9.5px] font-black shadow-xs border-2 border-white dark:border-[#17212b] ${
                        nv === 1
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
                          : nv === 2
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white'
                      }`}
                    >
                      Nv {nv}
                    </div>
                  )}

                  {/* Badge de Patrocinador / Líder */}
                  {contact.isSponsor && (
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-600 text-white shadow-xs border-2 border-white dark:border-[#17212b]">
                      Líder
                    </div>
                  )}

                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#17212b]" />
                </div>

                {/* Conteúdo do Chat */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-[15.5px] font-semibold text-[#111] dark:text-white truncate leading-tight">
                        {contact.nome_exibicao || formatSenderPhone(contact.telefone)}
                      </h3>
                      {isSub && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 ${
                          nv === 1
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                            : nv === 2
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300'
                            : 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300'
                        }`}>
                          {nv === 1 ? 'Direto' : `Nível ${nv}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {contact.isMe && (
                        <CheckCheck className="w-4 h-4 text-[#2481cc] stroke-[2.5]" />
                      )}
                      <span className="text-[12px] text-[#707579] dark:text-[#9eaab6]">
                        {contact.lastMessageTime || timeStr}
                      </span>
                    </div>
                  </div>

                  {/* Hierarquia de quem convidou */}
                  {isSub && (
                    <div className="text-[11.5px] mb-0.5 truncate">
                      {nv === 1 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          ⭐ Seu Convidado Direto
                        </span>
                      ) : (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          🔗 Convidado por {contact.patrocinador_telefone ? formatSenderPhone(contact.patrocinador_telefone) : 'sua equipe'}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-[13px] text-[#707579] dark:text-[#9eaab6] truncate leading-snug">
                    {contact.lastMessage ? (
                      contact.lastMessage
                    ) : (
                      <span className="text-[#2481cc] italic font-normal">
                        💬 Toque para enviar mensagem a este subordinado...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        ) : !searchQuery && activeFilter === 'subordinates' ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-[#202b36] flex items-center justify-center text-[#2481cc] mb-3 shadow-2xs">
              <Users className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h4 className="text-[16px] font-bold text-[#111] dark:text-white mb-1">
              Nenhum subordinado {subLevelFilter !== 'all' ? `no Nível ${subLevelFilter}` : 'registrado'}
            </h4>
            <p className="text-[13px] text-[#707579] dark:text-[#9eaab6] max-w-[280px] leading-relaxed mb-4">
              Compartilhe o seu link de convite oficial para registrar membros diretos e expandir sua rede de comissões.
            </p>
            <button
              onClick={() => navigate('/convite')}
              className="px-4 py-2 bg-[#2481cc] hover:bg-[#1e70b3] text-white text-[13.5px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Convidar Membros Agora
            </button>
          </div>
        ) : !searchQuery && activeFilter === 'personal' ? (
          <div className="text-center py-12 px-6 text-[#707579] dark:text-[#9eaab6] text-[14px]">
            Nenhum contato pessoal avulso.<br />
            Seus afiliados estão agrupados na aba <strong>Subordinados</strong>.
          </div>
        ) : null}

        {/* Feedback quando a busca não encontra nada */}
        {searchQuery && filteredContacts.length === 0 && (
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
