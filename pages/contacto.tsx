import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { 
  ArrowLeft, Copy, Share2, MoreVertical, PlusCircle, 
  Check, Users, ChevronRight, ChevronDown
} from 'lucide-react';
import { InvitePageSkeleton } from '../components/Skeleton';

export default function Invite() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeLevel, setActiveLevel] = useState<'level1' | 'level2' | 'level3'>('level1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [teamData, setTeamData] = useState<{ level1: any[]; level2: any[]; level3: any[] }>({
    level1: [],
    level2: [],
    level3: []
  });
  const [inviteCode, setInviteCode] = useState<string>('---');
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Formatted display link like Telegram invite link (e.g. t.me/+...)
  const rawInviteLink = `${baseUrl}/cadastro?join=${inviteCode}`;
  const displayTelegramLink = `t.me/+${inviteCode || 'rnPOVJAb'}`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [settingsRes, teamRes, linksRes] = await Promise.all([
          supabase.rpc('get_my_settings_data_mcpn'),
          supabase.rpc('get_my_team_detailed'),
          supabase.from('atendimento_links').select('links').maybeSingle()
        ]);

        if (settingsRes.data && settingsRes.data.length > 0) {
          setInviteCode(settingsRes.data[0].invite_code || '---');
        }

        if (teamRes.data && Array.isArray(teamRes.data)) {
          setTeamData({
            level1: teamRes.data.filter((m: any) => m.nivel === 1),
            level2: teamRes.data.filter((m: any) => m.nivel === 2),
            level3: teamRes.data.filter((m: any) => m.nivel === 3),
          });
        }

        const linksObj = linksRes.data?.links as Record<string, any> | null;
        const appLink = linksObj?.app_atualizado || linksObj?.link_app_atualizado;
        if (appLink) {
          let raw = String(appLink).trim().replace(/\/$/, '');
          if (raw && !/^https?:\/\//i.test(raw)) {
            raw = `https://${raw}`;
          }
          if (raw) {
            setBaseUrl(raw);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Link copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [showToast]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Telegram Business',
          text: `Junte-se à minha equipe no Telegram Business com o código ${inviteCode}:`,
          url: rawInviteLink,
        });
      } catch {}
    } else {
      copyToClipboard(rawInviteLink);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone) return 'ID 5634';
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `ID ${clean.slice(-4)}`;
    }
    return `ID ${clean || '4700'}`;
  };

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const totalMembers = teamData.level1.length + teamData.level2.length + teamData.level3.length;
  const currentList = teamData[activeLevel] || [];

  if (loading) {
    return <InvitePageSkeleton />;
  }

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-24 select-none">
      
      {/* HEADER */}
      <header className="w-full px-4 pt-4 pb-2 bg-[#f1f1f2] sticky top-0 z-20 flex items-center">
        <button 
          type="button"
          onClick={handleBack} 
          aria-label="Voltar"
          title="Voltar"
          className="mr-4 text-black active:opacity-50 hover:opacity-75 transition-opacity p-2 -ml-2 cursor-pointer touch-manipulation z-30"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-[20px] font-bold tracking-tight text-black">
          Links de Convite
        </h1>
      </header>

      <main className="px-3.5 flex flex-col gap-3 max-w-[480px] mx-auto mt-1">

        {/* TOP TELEGRAM DUCK ILLUSTRATION */}
        <div className="flex flex-col items-center justify-center pt-2 pb-3 px-4 text-center">
          {/* Telegram Duck with Party Hat & Noisemaker */}
          <div className="w-24 h-24 relative mb-2 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              {/* Yellow Duck Body */}
              <ellipse cx="60" cy="75" rx="35" ry="28" fill="#FFC83B" />
              <circle cx="68" cy="48" r="22" fill="#FFC83B" />
              <path d="M78 52 C 90 52, 94 56, 88 60 C 80 62, 75 58, 78 52 Z" fill="#FF7B25" />
              <circle cx="72" cy="42" r="3.5" fill="#202020" />
              <circle cx="73.5" cy="40.5" r="1.2" fill="#FFFFFF" />
              
              {/* Party Hat (Green / Red stripes) */}
              <polygon points="50,30 65,8 72,28" fill="#25D366" />
              <path d="M53 25 L65 8 L60 27 Z" fill="#FE384F" />
              <circle cx="65" cy="7" r="3.5" fill="#FE384F" />
              
              {/* Party Noisemaker / Blower */}
              <path d="M85 57 C 98 55, 108 42, 102 36 C 96 30, 88 40, 92 48" fill="none" stroke="#3390EC" strokeWidth="4" strokeLinecap="round" />
              <path d="M85 57 L 90 56" stroke="#FE384F" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <p className="text-[13.5px] text-[#8e8e93] font-normal leading-relaxed max-w-[320px]">
            Qualquer pessoa no Telegram poderá entrar no seu canal através deste link de convite.
          </p>
        </div>

        {/* CARD 1: PRIMARY INVITE LINK */}
        <div className="bg-white rounded-[18px] p-4 shadow-2xs border border-gray-100 flex flex-col gap-3">
          
          <span className="text-[13px] font-bold text-[#25D366] tracking-wide">
            Link de Convite
          </span>

          {/* Link Box */}
          <div className="bg-[#f1f1f2]/80 rounded-[14px] px-3.5 py-3 flex items-center justify-between">
            <span className="text-[15px] font-medium text-black truncate font-sans mr-2">
              {displayTelegramLink}
            </span>
            <button 
              type="button"
              onClick={() => copyToClipboard(rawInviteLink)}
              className="text-gray-400 hover:text-black p-0.5 shrink-0 cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons (Copy & Share) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(rawInviteLink)}
              className="h-[44px] rounded-full bg-[#25D366] text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="h-[44px] rounded-full bg-[#25D366] text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Partilhar</span>
            </button>
          </div>

          {/* Joined Users Info */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100/80">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div className="w-5.5 h-5.5 rounded-full bg-[#8d82ef] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                PF
              </div>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" 
                alt="user" 
                className="w-5.5 h-5.5 rounded-full object-cover ring-2 ring-white"
              />
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" 
                alt="user" 
                className="w-5.5 h-5.5 rounded-full object-cover ring-2 ring-white"
              />
            </div>
            <span className="text-[13px] font-bold text-[#25D366]">
              {totalMembers > 0 ? `${totalMembers} membros aderiram` : '10 membros aderiram'}
            </span>
          </div>

        </div>

        {/* CARD 2: SUBORDINATE LEVEL DROPDOWN SELECTOR */}
        <div className="bg-white rounded-[18px] shadow-2xs border border-gray-100 overflow-hidden transition-all">
          {/* Main Dropdown Button */}
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 py-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e5f5e9] text-[#25D366] flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14.5px] font-bold text-black leading-tight">
                  {activeLevel === 'level1' && 'Nível 1 (Subordinados Diretos)'}
                  {activeLevel === 'level2' && 'Nível 2 (Subordinados Nível 2)'}
                  {activeLevel === 'level3' && 'Nível 3 (Subordinados Nível 3)'}
                </span>
                <span className="text-[12px] text-[#8e8e93] leading-tight mt-0.5">
                  {teamData[activeLevel]?.length || 0} membros neste nível
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold bg-[#e5f5e9] text-[#25D366] px-2.5 py-1 rounded-full">
                {activeLevel === 'level1' ? 'N1' : activeLevel === 'level2' ? 'N2' : 'N3'}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#25D366]' : ''}`} />
            </div>
          </div>

          {/* Animated Dropdown Menu List */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-gray-100 divide-y divide-gray-50 bg-[#fafafa]"
              >
                {[
                  { id: 'level1', label: 'Nível 1', desc: 'Subordinados Diretos', commission: '10%' },
                  { id: 'level2', label: 'Nível 2', desc: 'Subordinados Nível 2', commission: '5%' },
                  { id: 'level3', label: 'Nível 3', desc: 'Subordinados Nível 3', commission: '2%' },
                ].map((item) => {
                  const isSelected = activeLevel === item.id;
                  const count = teamData[item.id as 'level1' | 'level2' | 'level3']?.length || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveLevel(item.id as any);
                        setIsDropdownOpen(false);
                      }}
                      className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#e5f5e9]/40' : 'hover:bg-gray-100/60 active:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#25D366]' : 'bg-gray-300'}`} />
                        <div className="flex flex-col">
                          <span className={`text-[14px] ${isSelected ? 'font-bold text-black' : 'font-medium text-gray-700'}`}>
                            {item.label} — <span className="text-[#8e8e93] font-normal">{item.desc}</span>
                          </span>
                          <span className="text-[11.5px] text-[#25D366] font-semibold">
                            Comissão: {item.commission}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200/60 shadow-2xs">
                          {count} membros
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#25D366] stroke-[2.5]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="px-3 text-[12px] text-[#8e8e93] leading-relaxed">
          Selecione o nível da equipe para visualizar os membros e links de subordinados correspondentes.
        </p>

        {/* CARD 3: SUBORDINADOS / INVITE LINKS CREATED BY OTHER ADMINS */}
        <div className="bg-white rounded-[18px] p-4 shadow-2xs border border-gray-100 flex flex-col gap-3 mt-0.5">
          
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <span className="text-[13px] font-bold text-[#25D366] tracking-wide">
              Links criados por outros membros (Nível {activeLevel === 'level1' ? '1' : activeLevel === 'level2' ? '2' : '3'})
            </span>
            <span className="text-[12px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
              {currentList.length} membros
            </span>
          </div>

          {/* Subordinates List */}
          <div className="divide-y divide-gray-100">
            {currentList.length > 0 ? (
              currentList.map((person: any, idx: number) => {
                const nameId = maskPhone(person.telefone);
                const isEven = idx % 2 === 0;

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between first:pt-1 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      {isEven ? (
                        <img 
                          src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop" 
                          alt="avatar" 
                          className="w-11 h-11 rounded-full object-cover shadow-2xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2481cc] to-[#50a2e9] text-white flex items-center justify-center font-bold text-[12px] shadow-2xs">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                          </svg>
                        </div>
                      )}

                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-bold text-black truncate">
                          {nameId}
                        </span>
                        <span className="text-[12.5px] text-[#8e8e93]">
                          1 link de convite
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0 ml-2">
                      <span className="text-[12.5px] font-bold text-[#2481cc]">
                        {Number(person.total_recarregado ?? person.total_investido ?? 0).toLocaleString('pt-PT')} Kz
                      </span>
                      <span className="text-[11px] text-[#8e8e93]">
                        {new Date(person.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Pre-filled demonstration admins if empty */
              <>
                <div className="py-2.5 flex items-center justify-between first:pt-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop" 
                      alt="avatar" 
                      className="w-11 h-11 rounded-full object-cover shadow-2xs"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-bold text-black truncate">
                        ID 4700
                      </span>
                      <span className="text-[12.5px] text-[#8e8e93]">
                        1 link de convite
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>

                <div className="py-2.5 flex items-center justify-between last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2481cc] to-[#50a2e9] text-white flex items-center justify-center font-bold text-[12px] shadow-2xs">
                      <span className="font-bold text-[11px]">TG</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-bold text-black truncate">
                        ID 5634
                      </span>
                      <span className="text-[12.5px] text-[#8e8e93]">
                        1 link de convite
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
