import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, CheckCheck, Loader2, Pin, Plus, X } from 'lucide-react';
import TelegramStories from '../components/TelegramStories';

export default function ChatsList() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;

  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  type ChatFolder = 'all' | 'personal' | 'groups' | 'bots' | 'unread';
  const [activeFilter, setActiveFilter] = useState<ChatFolder>('all');

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        const { data: subordinatesData } = await supabase
          .from('equipe_mcpn')
          .select('usuario_id')
          .eq('patrocinador_id', user.id);

        const { data: sponsorData } = await supabase
          .from('equipe_mcpn')
          .select('patrocinador_id')
          .eq('usuario_id', user.id);

        let uniqueContacts = new Map<string, any>();

        const fetchUserPhone = async (uid: string) => {
          const { data } = await supabase.from('perfis_mcpn').select('telefone').eq('id', uid).single();
          return data?.telefone || 'Membro';
        };

        if (subordinatesData) {
          for (const item of subordinatesData) {
            if (item.usuario_id) {
              const tel = await fetchUserPhone(item.usuario_id);
              uniqueContacts.set(item.usuario_id, { id: item.usuario_id, telefone: tel });
            }
          }
        }

        if (sponsorData) {
          for (const item of sponsorData) {
            if (item.patrocinador_id) {
              const tel = await fetchUserPhone(item.patrocinador_id);
              uniqueContacts.set(item.patrocinador_id, { id: item.patrocinador_id, telefone: tel });
            }
          }
        }

        // Busca a última mensagem de cada conversa privada
        try {
          const { data: lastMsgs } = await (supabase as any)
            .from('mensagens_privadas')
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
                    isMe: msg.remetente_id === user.id
                  });
                }
              }
            });
          }
        } catch {}

        setContacts(Array.from(uniqueContacts.values()));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

  const formatSenderPhone = (p: string) => {
    if (!p || p === "Membro" || p === "Patrocinador") return p;
    const clean = p.replace(/^\+?244\s*/, '').trim();
    if (/^\d{9}$/.test(clean)) {
      return `+244 ${clean.slice(0, 3)} *** ${clean.slice(6)}`;
    }
    return clean;
  };

  const getUserColor = (str: string) => {
    const colors = ["#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9", "#F39C12", "#7F8C8D"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Pesquisa dinâmica inteligente
  const queryClean = searchQuery.toLowerCase().trim();
  const queryDigits = queryClean.replace(/\D/g, '');

  const showCommunityChat = useMemo(() => {
    if (activeFilter === 'personal' || activeFilter === 'bots' || activeFilter === 'unread') return false;
    if (!queryClean) return true;
    const communityKeywords = [
      "telegram", "business", "comunidade", "canal", "oficial", "grupo", "anúncios", "mensagens",
      "whatsapp", "whats", "pavel", "durov", "ceo", "fundador"
    ];
    return communityKeywords.some(k => k.includes(queryClean) || queryClean.includes(k));
  }, [queryClean, activeFilter]);

  // ID fixo para Pavel Durov (CEO) — conversa privada especial
  const PAVEL_DUROV_ID = 'pavel-durov-ceo-00000000000000001';

  const filteredContacts = useMemo(() => {
    if (activeFilter === 'groups' || activeFilter === 'bots') return [];
    return contacts.filter(c => {
      if (activeFilter === 'unread') {
        // Only contacts where there are messages not sent by me or pending
        return !c.isMe && Boolean(c.lastMessage);
      }
      if (!queryClean) return true;
      const rawTel = (c.telefone || '').toLowerCase();
      const formattedTel = formatSenderPhone(c.telefone).toLowerCase();
      const digitsOnly = rawTel.replace(/\D/g, '');

      return (
        rawTel.includes(queryClean) ||
        formattedTel.includes(queryClean) ||
        (queryDigits.length > 0 && digitsOnly.includes(queryDigits))
      );
    });
  }, [contacts, queryClean, queryDigits, activeFilter]);

  const hasResults = showCommunityChat || filteredContacts.length > 0 || activeFilter === 'bots';

  const folders: { id: ChatFolder; label: string; count?: number }[] = [
    { id: 'all', label: 'Todos os Chats', count: contacts.length + 3 },
    { id: 'personal', label: 'Pessoais', count: contacts.length },
    { id: 'groups', label: 'Grupos & Canais', count: 3 },
    { id: 'bots', label: 'Bots' },
    { id: 'unread', label: 'Não Lido', count: contacts.filter(c => !c.isMe && Boolean(c.lastMessage)).length },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="w-full min-h-[100dvh] bg-white font-sans antialiased flex flex-col md:flex-row"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── SIDEBAR (desktop) / FULL (mobile) ── */}
      <div className="w-full md:w-[380px] md:min-w-[320px] md:max-w-[400px] md:border-r md:border-gray-200 md:h-screen md:sticky md:top-0 md:overflow-hidden flex flex-col bg-white">

      {/* ── HEADER ── */}
      <header className="w-full bg-white px-3 pt-3 pb-0 z-30">
        {/* Top row: Logo + Title + Close */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Telegram Logo with Spinning Ring on Loading */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              {isLoading && (
                <div className="absolute -inset-[3px] rounded-full border-[2.5px] border-[#25ae60] border-t-transparent animate-spin" />
              )}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]">
                  <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
                  <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
                  <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
                </svg>
              </div>
            </div>
            <span className={`text-[21px] font-bold tracking-[-0.3px] transition-colors duration-200 ${
              isLoading ? "text-[#25ae60]" : "text-[#202020]"
            }`}>
              {isLoading ? "Conectando..." : "Telegram Business"}
            </span>
          </div>
          <button 
            onClick={() => navigate('/home')}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full cursor-pointer transition-colors"
            aria-label="Fechar e voltar à Home"
            title="Fechar"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Search bar */}
        <div className="mx-1 mb-2.5 h-[38px] bg-[#f1f1f2] rounded-[10px] flex items-center px-3 gap-2 relative">
          <Search className="w-4 h-4 text-[#a0a0a0] shrink-0" />
          <input
            type="text"
            placeholder="Buscar Chats"
            className="flex-1 bg-transparent text-[15px] text-[#202020] placeholder:text-[#a0a0a0] outline-none border-none pr-6"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-[#d0d0d2] text-white flex items-center justify-center hover:bg-[#b0b0b2] transition-colors cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* ── TELEGRAM iOS CHAT FOLDERS (Horizontal Scrollable Tabs) ── */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 px-1 border-b border-gray-100">
          {folders.map(folder => {
            const isActive = activeFilter === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFilter(folder.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#3390ec] text-white shadow-xs'
                    : 'bg-[#f1f1f2] text-[#8e8e93] hover:text-[#202020] active:bg-gray-200'
                }`}
              >
                <span>{folder.label}</span>
                {typeof folder.count === 'number' && folder.count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                    isActive ? 'bg-white/25 text-white' : 'bg-black/10 text-[#666]'
                  }`}>
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── CHAT LIST ── */}
      <main className="w-full flex-1 overflow-y-auto pb-28 md:pb-4">

        {/* ── TELEGRAM STORIES (HISTÓRIAS NO TOPO DOS CHATS) ── */}
        <TelegramStories />

        {/* ── 1º CEO: Pavel Durov ── mesma rota de chat privado ── */}
        {showCommunityChat && (
          <div
            onClick={() => navigate(`/chat/${PAVEL_DUROV_ID}?t=Pavel+Durov`)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9f9f9] active:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-xs bg-gray-200">
                <img src="/pavel_durov.jpg" alt="Pavel Durov" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0 py-1.5 border-b border-gray-100">
              <div className="flex justify-between items-center mb-[2px]">
                <h3 className="text-[15.5px] font-semibold text-[#111] truncate leading-tight">
                  Pavel Durov
                </h3>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <CheckCheck className="w-[15px] h-[15px] text-[#4CAF50] stroke-[2.5]" />
                  <span className="text-[12px] text-[#a0a0a0]">{timeStr}</span>
                </div>
              </div>
              <p className="text-[13.5px] text-[#8e8e93] truncate leading-snug">
                CEO · Fundador do Telegram
              </p>
            </div>
          </div>
        )}
        {/* ── 2º Comunidade WhatsApp ── */}
        {showCommunityChat && (
          <div
            onClick={() => navigate('/chat/whatsapp-comunidade')}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9f9f9] active:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-xs overflow-hidden">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="w-[27px] h-[27px]">
                  <path fill="#fff" d="M16.003 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.64 4.64 1.853 6.64L2.667 29.333l6.88-1.813A13.28 13.28 0 0016.003 29.333C23.36 29.333 29.333 23.36 29.333 16S23.36 2.667 16.003 2.667zm0 24.267a11.01 11.01 0 01-5.6-1.52l-.4-.24-4.08 1.067 1.093-3.973-.267-.413A10.987 10.987 0 015.003 16c0-6.08 4.947-11.027 11.013-11.027S27.04 9.92 27.04 16 22.08 26.934 16.003 26.934zm6.053-8.24c-.333-.16-1.947-.96-2.253-1.067-.307-.107-.52-.16-.747.16-.213.32-.84 1.067-1.04 1.28-.187.213-.387.24-.72.08-.333-.16-1.413-.52-2.693-1.667-.987-.88-1.667-1.973-1.853-2.307-.187-.333-.013-.507.147-.667.147-.147.333-.373.507-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.747-1.787-1.013-2.44-.267-.64-.547-.547-.747-.56h-.64c-.213 0-.547.08-.84.4-.28.32-1.093 1.067-1.093 2.587 0 1.52 1.12 2.987 1.28 3.2.16.213 2.187 3.347 5.307 4.693.747.32 1.333.507 1.787.653.747.24 1.44.213 1.973.133.6-.093 1.853-.747 2.12-1.467.267-.72.267-1.333.187-1.467-.08-.133-.293-.213-.627-.373z"/>
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0 py-1.5 border-b border-gray-100">
              <div className="flex justify-between items-center mb-[2px]">
                <h3 className="text-[15.5px] font-semibold text-[#111] truncate leading-tight">
                  Comunidade WhatsApp
                </h3>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <CheckCheck className="w-[15px] h-[15px] text-[#4CAF50] stroke-[2.5]" />
                  <Pin className="w-[12px] h-[12px] text-[#a0a0a0]" />
                  <span className="text-[12px] text-[#a0a0a0]">{timeStr}</span>
                </div>
              </div>
              <p className="text-[13.5px] text-[#8e8e93] truncate leading-snug">
                Comunidade oficial do WhatsApp Business!
              </p>
            </div>
          </div>
        )}

        {/* ── 4º Telegram Business ── */}
        {showCommunityChat && (
          <div
            onClick={() => navigate('/chat/comunidade')}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9f9f9] active:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-xs overflow-hidden">
                <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px]">
                  <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
                  <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
                  <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0 py-1.5 border-b border-gray-100">
              <div className="flex justify-between items-center mb-[2px]">
                <h3 className="text-[15.5px] font-semibold text-[#111] truncate leading-tight">
                  Telegram Business
                </h3>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <CheckCheck className="w-[15px] h-[15px] text-[#4CAF50] stroke-[2.5]" />
                  <Pin className="w-[12px] h-[12px] text-[#a0a0a0]" />
                  <span className="text-[12px] text-[#a0a0a0]">{timeStr}</span>
                </div>
              </div>
              <p className="text-[13.5px] text-[#8e8e93] truncate leading-snug">
                Bem-vindo à comunidade oficial do Telegram Business!
              </p>
            </div>
          </div>
        )}

        {/* ── 5º Bot de Pagamento e Assistente (Aparece em Todos e em Bots) ── */}
        {(activeFilter === 'all' || activeFilter === 'bots') && (
          <div
            onClick={() => navigate('/bot-pay')}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9f9f9] active:bg-[#f0f0f0] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8e44ad] to-[#a55eea] flex items-center justify-center shadow-xs overflow-hidden text-white font-bold text-lg">
                🤖
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0 py-1.5 border-b border-gray-100">
              <div className="flex justify-between items-center mb-[2px]">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15.5px] font-semibold text-[#111] truncate leading-tight">
                    Telegram Business Bot
                  </h3>
                  <span className="bg-[#eef2ff] text-[#4f46e5] text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    BOT
                  </span>
                </div>
                <span className="text-[12px] text-[#a0a0a0]">{timeStr}</span>
              </div>
              <p className="text-[13.5px] text-[#8e8e93] truncate leading-snug">
                Assistente de inteligência e automação financeira ativo
              </p>
            </div>
          </div>
        )}

        {/* ── CONTACTS ── */}
        {isLoading ? (
          <div className="flex justify-center items-center p-8 mt-4">
            <Loader2 className="w-6 h-6 text-[#25D366] animate-spin" />
          </div>
        ) : !hasResults && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-[#8e8e93] text-[15px] mb-2">
              Nenhum chat encontrado para "<strong>{searchQuery}</strong>"
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#229ED9] text-[14px] font-medium underline cursor-pointer hover:opacity-80"
            >
              Limpar pesquisa
            </button>
          </div>
        ) : filteredContacts.length === 0 && !showCommunityChat && !searchQuery ? (
          <div className="text-center py-10 px-6 text-[#a0a0a0] text-[14px]">
            Nenhum contacto ainda.<br/>As suas ligações da equipa aparecerão aqui.
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const color = getUserColor(contact.telefone);
            const label = contact.telefone === 'Patrocinador' ? 'P'
              : contact.telefone === 'Membro' ? 'M'
              : contact.telefone.slice(-2);

            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/chat/${contact.id}?t=${contact.telefone}`)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9f9f9] active:bg-[#f0f0f0] transition-colors cursor-pointer"
              >
                {/* Avatar (48px - Oficial Telegram) */}
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[17px] font-bold shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-1.5 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-[2px]">
                    <h3 className="text-[15.5px] font-semibold text-[#111] truncate leading-tight">
                      {formatSenderPhone(contact.telefone)}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {contact.isMe && (
                        <CheckCheck className="w-[15px] h-[15px] text-[#4CAF50] stroke-[2.5]" />
                      )}
                      <span className="text-[12px] text-[#a0a0a0]">
                        {contact.lastMessageTime || timeStr}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13.5px] text-[#8e8e93] truncate leading-snug">
                    {contact.lastMessage || "Toque para iniciar uma conversa privada..."}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── FAB (Floating Action Button) ── mobile only */}
      <button
        onClick={() => navigate('/convite')}
        className="md:hidden fixed bottom-[88px] right-4 w-[56px] h-[56px] bg-[#25D366] rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.5)] flex items-center justify-center z-40 active:scale-95 transition-transform cursor-pointer"
        aria-label="Novo Chat"
      >
        <Plus className="w-6 h-6 text-white stroke-[2.5]" />
      </button>

      </div>{/* end sidebar */}

      {/* ── PAINEL DIREITO (apenas desktop) ── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f1f3f4] h-screen">
        <div className="flex flex-col items-center gap-4 select-none">
          {/* Ícone Telegram grande */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
              <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
              <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
              <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-[#202020]">Telegram Business</h2>
          <p className="text-[14px] text-[#8e8e93] text-center max-w-[260px] leading-relaxed">
            Selecione uma conversa na lista à esquerda para começar a conversar.
          </p>
          <button
            onClick={() => navigate('/convite')}
            className="mt-2 px-6 py-2.5 bg-[#25D366] text-white text-[14px] font-semibold rounded-full shadow hover:bg-[#20b558] transition-colors cursor-pointer"
          >
            + Novo Chat
          </button>
        </div>
      </div>

    </div>
  );
}
