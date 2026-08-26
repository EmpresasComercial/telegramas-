import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, Star, Users, Zap, ShieldCheck, TrendingUp, 
  Gift, Award, DollarSign, ChevronRight, Sparkles, CheckCircle2 
} from 'lucide-react';
import { formatCurrency } from '../lib/currency';

export default function TelegramPremium() {
  const navigate = useNavigate();
  const [simulatedAmount, setSimulatedAmount] = useState<number>(100000); // 100.000 Kz
  const [teamMembersCount, setTeamMembersCount] = useState<number>(5);

  // Cálculos de simulação
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
      example: 'Se o seu amigo investir 50.000 Kz, você ganha 5.000 Kz na hora.',
      icon: Users,
    },
    {
      level: 'Nível 2 (Indireto)',
      percentage: '6%',
      color: 'from-[#3b82f6] to-[#1d4ed8]',
      badgeColor: 'bg-[#3b82f6]',
      description: 'Convidados trazidos pelos seus indicados de Nível 1.',
      example: 'Se um membro de Nível 2 investir 50.000 Kz, você ganha 3.000 Kz.',
      icon: TrendingUp,
    },
    {
      level: 'Nível 3 (Sub-equipe)',
      percentage: '2%',
      color: 'from-[#10b981] to-[#047857]',
      badgeColor: 'bg-[#10b981]',
      description: 'Membros da terceira geração da sua rede de afiliados.',
      example: 'Se um membro de Nível 3 investir 50.000 Kz, você ganha 1.000 Kz.',
      icon: Zap,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0f1015] text-white font-sans pb-20 select-none">
      
      {/* ── HEADER ── */}
      <header className="w-full px-4 pt-4 pb-3 sticky top-0 z-30 bg-[#0f1015]/90 backdrop-blur-md flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1 text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer rounded-full bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b] animate-pulse" />
          <span className="text-[16px] font-bold tracking-tight bg-gradient-to-r from-[#e0c3fc] to-[#8ec5fc] bg-clip-text text-transparent">
            Telegram Premium
          </span>
        </div>
        <div className="w-8" />
      </header>

      <main className="max-w-[540px] mx-auto px-4 pt-4 flex flex-col gap-5">
        
        {/* ── HERO BANNER ── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#6c28d9]/40 via-[#3b1d77]/20 to-[#12131c] border border-purple-500/20 p-6 text-center shadow-[0_8px_32px_rgba(108,40,217,0.25)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -ml-10 -mb-10" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Imagem / Ícone de Estrela Telegram Premium */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#8b5cf6] via-[#ec4899] to-[#f59e0b] p-[2px] shadow-lg mb-4">
              <div className="w-full h-full rounded-full bg-[#0f1015] flex items-center justify-center overflow-hidden">
                <img
                  src="/tg_premium_star.jpg"
                  alt="Telegram Premium"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <Star className="w-10 h-10 text-[#f59e0b] fill-[#f59e0b]" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-bold text-purple-200 bg-purple-500/20 border border-purple-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Programa de Afiliados Oficial
            </span>

            <h1 className="text-[23px] font-black tracking-tight text-white mb-2 leading-tight">
              Como Funciona o Sistema de Convites
            </h1>

            <p className="text-[13.5px] text-gray-300 leading-relaxed max-w-[420px]">
              O Telegram Business recompensa membros parceiros com comissões instantâneas sobre todas as ativações de Bots realizadas por indicados da sua rede.
            </p>
          </div>
        </div>

        {/* ── 3 PASSOS SIMPLES ── */}
        <div className="bg-[#171923] rounded-[20px] p-5 border border-white/5">
          <h2 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#f59e0b]" />
            3 Passos do Funcionamento
          </h2>

          <div className="flex flex-col gap-3">
            {[
              {
                num: '1',
                title: 'Partilhe o seu link com amigos',
                desc: 'Envie para contactos no Telegram, WhatsApp e grupos de redes sociais.',
              },
              {
                num: '2',
                title: 'O amigo cadastra-se e ativa um Bot',
                desc: 'Ao adquirir qualquer produto ou Bot disponível na plataforma.',
              },
              {
                num: '3',
                title: 'Receba até 18% de comissão instantânea',
                desc: 'O valor cai diretamente no seu saldo disponível para saque imediato.',
              },
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-[14px] bg-white/[0.03] border border-white/5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">{step.title}</h3>
                  <p className="text-[12.5px] text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── NÍVEIS DE RECOMPENSA (CARDS) ── */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-bold text-white px-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-400" />
            Estrutura dos 3 Níveis de Indicação
          </h2>

          {TIERS.map((tier, idx) => {
            const Icon = tier.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-[#171923] rounded-[20px] p-4 border border-white/5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-[12px] bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white">{tier.level}</h3>
                      <span className="text-[11.5px] text-gray-400">Comissão de Rede</span>
                    </div>
                  </div>
                  <span className={`text-[18px] font-black text-white px-3 py-1 rounded-full ${tier.badgeColor} shadow-sm`}>
                    {tier.percentage}
                  </span>
                </div>

                <p className="text-[13px] text-gray-300 mt-2 mb-2 leading-relaxed">
                  {tier.description}
                </p>

                <div className="bg-white/[0.04] rounded-[12px] p-2.5 border border-white/5 flex items-center gap-2 text-[12px] text-purple-200">
                  <CheckCircle2 className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span><strong>Exemplo:</strong> {tier.example}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── TABELA PRÁTICA DE EXEMPLOS ── */}
        <div className="bg-[#171923] rounded-[20px] p-5 border border-white/5">
          <h2 className="text-[15px] font-bold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#25D366]" />
            Tabela de Ganhos por Valor do Bot
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold">
                  <th className="pb-2">Valor do Bot</th>
                  <th className="pb-2 text-purple-300">N1 (10%)</th>
                  <th className="pb-2 text-blue-300">N2 (6%)</th>
                  <th className="pb-2 text-emerald-300">N3 (2%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {[
                  { valor: 9990, n1: 999, n2: 599.4, n3: 199.8 },
                  { valor: 19990, n1: 1999, n2: 1199.4, n3: 399.8 },
                  { valor: 35990, n1: 3599, n2: 2159.4, n3: 719.8 },
                  { valor: 100000, n1: 10000, n2: 6000, n3: 2000 },
                  { valor: 250000, n1: 25000, n2: 15000, n3: 5000 },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 font-bold text-white">{formatCurrency(row.valor, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-purple-300">+{formatCurrency(row.n1, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-blue-300">+{formatCurrency(row.n2, 'KZ')}</td>
                    <td className="py-2.5 font-semibold text-emerald-300">+{formatCurrency(row.n3, 'KZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SIMULADOR DE GANHOS DE REDE ── */}
        <div className="bg-gradient-to-br from-[#1e1b4b]/60 to-[#171923] rounded-[24px] p-5 border border-indigo-500/20 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-[16px] font-bold text-white">Simulador de Ganhos da Equipe</h2>
          </div>
          <p className="text-[12.5px] text-gray-400 mb-4">
            Ajuste os valores para projetar quanto você pode lucrar com o crescimento da sua rede.
          </p>

          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-gray-300">Amigos diretos convidados:</span>
                <span className="font-bold text-purple-400">{teamMembersCount} membros</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span className="text-gray-300">Valor médio de ativação de cada:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(simulatedAmount, 'KZ')}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={10000}
                value={simulatedAmount}
                onChange={(e) => setSimulatedAmount(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Resultado Simulado */}
          <div className="mt-5 p-4 rounded-[16px] bg-white/[0.05] border border-white/10 flex flex-col gap-2">
            <span className="text-[12px] text-gray-400 uppercase tracking-wider font-semibold">
              Projeção de Lucro Total da Rede:
            </span>
            <div className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#f43f5e]">
              +{formatCurrency(totalSimulated, 'KZ')}
            </div>
            <div className="text-[11.5px] text-gray-400 flex justify-between border-t border-white/5 pt-2">
              <span>N1: {formatCurrency(n1Earn, 'KZ')}</span>
              <span>N2: {formatCurrency(n2Earn, 'KZ')}</span>
              <span>N3: {formatCurrency(n3Earn, 'KZ')}</span>
            </div>
          </div>
        </div>

        {/* ── COMO AS RECOMPENSAS SÃO PAGAS ── */}
        <div className="bg-[#171923] rounded-[20px] p-5 border border-white/5">
          <h2 className="text-[15px] font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#25D366]" />
            Como o Saldo é Atribuído
          </h2>
          <ul className="space-y-2.5 text-[13px] text-gray-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
              <span><strong>Crédito Automático:</strong> Assim que o seu indicado conclui a ativação, a comissão é creditada de imediato na sua conta.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
              <span><strong>Livre para Saque:</strong> As comissões não ficam bloqueadas e podem ser retiradas via Multicaixa Express / IBAN.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
              <span><strong>Sem Limite de Indicados:</strong> Você pode convidar quantas pessoas desejar para maximizar os seus ganhos.</span>
            </li>
          </ul>
        </div>

        {/* ── BOTÃO DE NAVEGAÇÃO PARA VER EQUIPE ── */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/convite')}
            className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] text-white font-bold text-[15px] shadow-[0_4px_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Ver Minha Equipe & Links</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </main>
    </div>
  );
}
