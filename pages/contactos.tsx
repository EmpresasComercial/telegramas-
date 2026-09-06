import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { 
  ArrowLeft, Copy, Share2, MoreVertical, 
  Check, Users, ChevronRight, Zap, Award, 
  DollarSign, Sparkles, ShieldCheck, CheckCircle2, TrendingUp 
} from 'lucide-react';
import { InvitePageSkeleton } from '../components/Skeleton';
import { formatCurrency } from '../lib/currency';

export default function Invite() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeLevel, setActiveLevel] = useState<'level1' | 'level2' | 'level3'>('level1');
  const [teamData, setTeamData] = useState<{ level1: any[]; level2: any[]; level3: any[] }>({
    level1: [],
    level2: [],
    level3: []
  });
  const [inviteCode, setInviteCode] = useState<string>('---');
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Estados e cálculos de simulação (Telegram Premium)
  const [simulatedAmount, setSimulatedAmount] = useState<number>(100000); // 100.000 Kz
  const [teamMembersCount, setTeamMembersCount] = useState<number>(5);

  const n1Earn = simulatedAmount * 0.10 * teamMembersCount;
  const n2Earn = simulatedAmount * 0.06 * (teamMembersCount * 3);
  const n3Earn = simulatedAmount * 0.02 * (teamMembersCount * 6);
  const totalSimulated = n1Earn + n2Earn + n3Earn;

  const TIERS = [
    {
      level: 'Nível 1 (Direto)',
      percentage: '10%',
      color: 'from-[#8b5cf6] to-[#6d28d9]',
      badgeColor: 'bg-[#8b5cf6]',
      description: 'Pessoas que se cadastram diretamente pelo seu link de convite.',
      example: 'Se o seu amigo ativar um bot de 50.000 Kz, você ganha 5.000 Kz na hora.',
      icon: Users,
    },
    {
      level: 'Nível 2 (Indireto)',
      percentage: '6%',
      color: 'from-[#3b82f6] to-[#1d4ed8]',
      badgeColor: 'bg-[#3b82f6]',
      description: 'Convidados trazidos pelos seus indicados de Nível 1.',
      example: 'Se um membro de Nível 2 ativar um bot de 50.000 Kz, você ganha 3.000 Kz.',
      icon: TrendingUp,
    },
    {
      level: 'Nível 3 (Sub-equipe)',
      percentage: '2%',
      color: 'from-[#10b981] to-[#047857]',
      badgeColor: 'bg-[#10b981]',
      description: 'Membros da terceira geração da sua rede de afiliados.',
      example: 'Se um membro de Nível 3 ativar um bot de 50.000 Kz, você ganha 1.000 Kz.',
      icon: Zap,
    },
  ];

  // Link real completo de cadastro/convite do app
  const rawInviteLink = inviteCode && inviteCode !== '---' 
    ? `${baseUrl}/messager?join=${inviteCode}` 
    : `${baseUrl}/messager`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [settingsRes, teamRes, linksRes, accountRes, authUserRes] = await Promise.all([
          supabase.rpc('get_my_settings_data_mcpn'),
          supabase.rpc('get_my_team_detailed'),
          supabase.from('atendimento_links').select('links').maybeSingle(),
          supabase.rpc('get_my_account_data'),
          supabase.auth.getUser()
        ]);

        let code = '';
        if (settingsRes.data && settingsRes.data.length > 0 && settingsRes.data[0].invite_code) {
          code = settingsRes.data[0].invite_code;
        }

        if (!code && accountRes.data && accountRes.data.length > 0) {
          code = (accountRes.data[0] as any)?.codigo_meu_refferal || '';
        }

        // Busca de segurança em sys_t500 caso as RPCs não retornem
        if (!code && authUserRes.data?.user?.id) {
          const { data: userRow } = await supabase
            .from('sys_t500')
            .select('codigo_meu_refferal')
            .eq('id', authUserRes.data.user.id)
            .maybeSingle();
          if (userRow?.codigo_meu_refferal) {
            code = userRow.codigo_meu_refferal;
          }
        }

        if (code) {
          setInviteCode(code);
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
    <div className="w-full min-h-screen bg-[#f1f1f2] dark:bg-[#0e1621] font-sans text-black dark:text-white pb-24 select-none">
      
      {/* ── HEADER TELEGRAM IOS / WEB ── */}
      <header className="w-full bg-[#f1f1f2]/90 dark:bg-[#0e1621]/90 backdrop-blur-md sticky top-0 z-30 border-b border-black/5 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleBack} 
              aria-label="Voltar"
              title="Voltar"
              className="text-[#2481cc] dark:text-[#5288c1] active:opacity-60 transition-opacity p-1 -ml-1 cursor-pointer touch-manipulation flex items-center gap-1 font-medium text-[15px]"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
            <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-black dark:text-white">
              Contatos & Convite
            </h1>
          </div>
          <div className="text-xs font-semibold text-[#8e8e93] dark:text-[#7e8b99] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
            Oficial
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 md:px-8 max-w-4xl w-full mx-auto mt-3 flex flex-col gap-4">

        {/* TOP TELEGRAM DUCK ILLUSTRATION */}
        <div className="flex flex-col items-center justify-center pt-2 pb-2 px-4 text-center">
          {/* Telegram Duck with Party Hat & Noisemaker */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 relative mb-2 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
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

          <p className="text-[14px] text-[#707579] dark:text-[#a0aab5] font-normal leading-relaxed max-w-md">
            Qualquer pessoa no Telegram poderá entrar na sua rede através do seu link oficial de convite.
          </p>
        </div>

        {/* CARD 1: PRIMARY INVITE LINK */}
        <div className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d] flex flex-col gap-3">
          
          <span className="text-[13px] font-bold text-[#25D366] tracking-wide">
            Link de Convite
          </span>

          {/* Link Box */}
          <div className="bg-[#f1f1f2]/80 dark:bg-[#0e1621] rounded-[14px] px-3.5 py-3 flex items-center justify-between">
            <span className="text-[14px] font-medium text-black dark:text-white truncate font-sans mr-2 select-all">
              {rawInviteLink}
            </span>
            <button 
              type="button"
              onClick={() => copyToClipboard(rawInviteLink)}
              className="text-gray-400 hover:text-black dark:hover:text-white p-0.5 shrink-0 cursor-pointer"
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
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100/80 dark:border-white/5">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div className="w-5.5 h-5.5 rounded-full bg-[#8d82ef] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#17212b]">
                PF
              </div>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" 
                alt="user" 
                className="w-5.5 h-5.5 rounded-full object-cover ring-2 ring-white dark:ring-[#17212b]"
              />
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" 
                alt="user" 
                className="w-5.5 h-5.5 rounded-full object-cover ring-2 ring-white dark:ring-[#17212b]"
              />
            </div>
            <span className="text-[13px] font-bold text-[#25D366]">
              {totalMembers > 0 ? `${totalMembers} membros aderiram` : '10 membros aderiram'}
            </span>
          </div>

        </div>

        {/* ── 3 PASSOS SIMPLES ── */}
        <div className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d] flex flex-col gap-3">
          <h2 className="text-[14px] font-bold text-black dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#f59e0b]" />
            3 Passos do Funcionamento
          </h2>

          <div className="flex flex-col gap-2.5">
            {[
              {
                num: '1',
                title: 'Partilhe o seu link com amigos',
                desc: 'Envie para contactos no Telegram, WhatsApp e grupos de redes sociais.',
              },
              {
                num: '2',
                title: 'O amigo cadastra-se e ativa um Bot',
                desc: 'Ao ativar qualquer Bot disponível na plataforma.',
              },
              {
                num: '3',
                title: 'Receba até 18% de comissão instantânea',
                desc: 'O valor cai diretamente no seu saldo disponível para saque imediato.',
              },
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-[14px] bg-[#f8f8f9] dark:bg-[#0e1621]/60 border border-gray-100 dark:border-white/5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1d6fa5] text-white text-[12px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-black dark:text-white">{step.title}</h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── NÍVEIS DE RECOMPENSA ── */}
        <div className="space-y-2.5">
          <h2 className="text-[14px] font-bold text-black dark:text-white px-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#2481cc]" />
            Estrutura dos 3 Níveis de Indicação
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TIERS.map((tier, idx) => {
              const Icon = tier.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d] relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-[12px] bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-2xs text-white`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-[14.5px] font-bold text-black dark:text-white">{tier.level}</h3>
                          <span className="text-[11.5px] text-gray-400">Comissão de Rede</span>
                        </div>
                      </div>
                      <span className={`text-[15px] font-black text-white px-2.5 py-0.5 rounded-full ${tier.badgeColor} shadow-2xs`}>
                        {tier.percentage}
                      </span>
                    </div>

                    <p className="text-[12.5px] text-gray-600 dark:text-gray-300 mt-2 mb-3 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  <div className="bg-[#f8f8f9] dark:bg-[#0e1621]/60 rounded-[12px] p-2.5 border border-gray-100 dark:border-white/5 flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0" />
                    <span><strong>Exemplo:</strong> {tier.example}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TABELA PRÁTICA DE EXEMPLOS ── */}
        <div className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d]">
          <h2 className="text-[14px] font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#25D366]" />
            Tabela de Ganhos por Valor do Bot
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10 text-gray-400 font-semibold">
                  <th className="pb-2">Valor do Bot</th>
                  <th className="pb-2 text-[#8b5cf6]">N1 (10%)</th>
                  <th className="pb-2 text-[#2481cc]">N2 (6%)</th>
                  <th className="pb-2 text-[#10b981]">N3 (2%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                {[
                  { valor: 9990, n1: 999, n2: 599.4, n3: 199.8 },
                  { valor: 19990, n1: 1999, n2: 1199.4, n3: 399.8 },
                  { valor: 35990, n1: 3599, n2: 2159.4, n3: 719.8 },
                  { valor: 100000, n1: 10000, n2: 6000, n3: 2000 },
                  { valor: 250000, n1: 25000, n2: 15000, n3: 5000 },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 font-bold text-black dark:text-white">{formatCurrency(row.valor, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-[#8b5cf6]">+{formatCurrency(row.n1, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-[#2481cc]">+{formatCurrency(row.n2, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-[#10b981]">+{formatCurrency(row.n3, 'KZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SIMULADOR DE GANHOS DE REDE ── */}
        <div className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d]">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4.5 h-4.5 text-[#2481cc]" />
            <h2 className="text-[14px] font-bold text-black dark:text-white">Simulador de Ganhos da Equipe</h2>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3.5">
            Ajuste os valores para projetar quanto você pode lucrar com a sua rede.
          </p>

          {/* Sliders */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="text-gray-600 dark:text-gray-300">Amigos diretos convidados:</span>
                <span className="font-bold text-[#8b5cf6]">{teamMembersCount} membros</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(Number(e.target.value))}
                className="w-full accent-[#8b5cf6] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] mb-1">
                <span className="text-gray-600 dark:text-gray-300">Valor médio de ativação de cada:</span>
                <span className="font-bold text-[#10b981]">{formatCurrency(simulatedAmount, 'KZ')}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={10000}
                value={simulatedAmount}
                onChange={(e) => setSimulatedAmount(Number(e.target.value))}
                className="w-full accent-[#10b981] cursor-pointer"
              />
            </div>
          </div>

          {/* Resultado Simulado */}
          <div className="mt-4 p-3.5 rounded-[14px] bg-[#f8f8f9] dark:bg-[#0e1621]/60 border border-gray-100 dark:border-white/5 flex flex-col gap-1.5">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
              Projeção de Lucro Total da Rede:
            </span>
            <div className="text-[22px] font-black text-[#2481cc]">
              +{formatCurrency(totalSimulated, 'KZ')}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between border-t border-gray-200/60 dark:border-white/10 pt-2 font-medium">
              <span>N1: {formatCurrency(n1Earn, 'KZ')}</span>
              <span>N2: {formatCurrency(n2Earn, 'KZ')}</span>
              <span>N3: {formatCurrency(n3Earn, 'KZ')}</span>
            </div>
          </div>
        </div>

        {/* ── COMO AS RECOMPENSAS SÃO PAGAS ── */}
        <div className="bg-white dark:bg-[#17212b] rounded-[18px] p-4 shadow-2xs border border-gray-100 dark:border-[#242f3d]">
          <h2 className="text-[14px] font-bold text-black dark:text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#25D366]" />
            Como o Saldo é Atribuído
          </h2>
          <ul className="space-y-2 text-[12.5px] text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] mt-2 shrink-0" />
              <span><strong>Crédito Automático:</strong> Assim que o seu indicado conclui a ativação, a comissão é creditada de imediato na sua conta.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] mt-2 shrink-0" />
              <span><strong>Livre para Saque:</strong> As comissões não ficam bloqueadas e podem ser retiradas via Multicaixa Express / IBAN.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2481cc] mt-2 shrink-0" />
              <span><strong>Sem Limite de Indicados:</strong> Você pode convidar quantas pessoas desejar para maximizar os seus ganhos.</span>
            </li>
          </ul>
        </div>

      </main>

    </div>
  );
}
