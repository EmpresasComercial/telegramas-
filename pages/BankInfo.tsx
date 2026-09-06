import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ChevronLeft, Plus, Landmark, Copy, Check, CreditCard, Trash2, Edit3 } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  owner_name?: string;
  holder_name?: string;
}

function formatIbanDisplay(iban: string): string {
  if (!iban) return '';
  const clean = iban.replace(/[\s.]/g, '');
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

export default function BankInfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { showToast } = useToast();

  const [linkedBanks, setLinkedBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const fetchBanks = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
      if (error) {
        console.error('Erro get_my_bank_accounts_mcpn:', error);
      }
      if (data && data.length > 0) {
        setLinkedBanks(data as BankAccount[]);
      } else {
        // Fallback via get_withdraw_info_mcpn se necessário
        const { data: wData } = await supabase.rpc('get_withdraw_info_mcpn');
        if (wData && wData.length > 0 && wData[0].has_bank && wData[0].iban) {
          setLinkedBanks([{
            id: wData[0].bank_id || 'primary',
            bank_name: wData[0].bank_name || 'Conta Bancária',
            iban: wData[0].iban,
            owner_name: 'Titular Vinculado'
          }]);
        } else {
          setLinkedBanks([]);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar bancos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
    const channel = supabase
      .channel('bank_info_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sys_t111' }, fetchBanks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBanks]);

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopied(true);
    showToast('IBAN copiado para a área de transferência', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.rpc('remove_bank_account_mcpn', {
        p_id: id
      });
      
      if (error) throw error;

      const result = data as { success: boolean; message: string } | null;
      if (!result?.success) throw new Error(result?.message || 'Falha, tente novamente');
      
      setLinkedBanks([]);
      showToast('Conta excluída com sucesso!', 'success');
    } catch (err: any) {
      showToast('Falha: ' + err.message, 'error');
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const hasBanks = useMemo(() => linkedBanks.length > 0, [linkedBanks]);
  const primaryBank = linkedBanks[0];

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans antialiased text-[#202020] pb-16 flex flex-col items-center">
      <ConfirmDialog 
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null })}
        onConfirm={() => deleteDialog.id && handleDelete(deleteDialog.id)}
        onEdit={() => {
          if (primaryBank) {
            navigate(`/adicionar-banco?edit=${primaryBank.id}${redirectPath ? `&redirect=${redirectPath}` : ''}`, { 
              state: { bank: primaryBank } 
            });
          }
        }}
        editText="Editar"
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {/* HEADER ESTILO TELEGRAM */}
      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(redirectPath || '/perfil')}
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform cursor-pointer"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2]" />
          </button>
          
          <h1 className="text-[17px] font-semibold text-[#000000] tracking-normal">
            Minha Conta
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-3 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="bg-white rounded-none p-5 space-y-3 shadow-none">
              <Skeleton className="w-36 h-5 rounded-none" />
              <Skeleton className="w-full h-8 rounded-none" />
              <Skeleton className="w-48 h-4 rounded-none" />
            </div>
          </div>
        ) : !hasBanks ? (
          <div className="bg-white rounded-none p-8 text-center flex flex-col items-center space-y-3 shadow-none">
            <div className="w-12 h-12 rounded-full bg-[#f1f1f2] flex items-center justify-center text-[#2481cc]">
              <Landmark className="w-6 h-6 stroke-[1.8]" />
            </div>
            <p className="text-[14px] text-[#8e8e93] font-normal leading-relaxed">
              Ainda não tens nenhuma conta bancária vinculada.
            </p>
            <div className="w-full pt-2">
              <button
                type="button"
                onClick={() => navigate(`/adicionar-banco${redirectPath ? `?redirect=${redirectPath}` : ''}`)}
                className="w-full h-[48px] rounded-none bg-[#2481cc] hover:bg-[#1f73b7] active:scale-[0.99] text-white font-semibold text-[15px] transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-[0_4px_12px_rgba(36,129,204,0.3)]"
              >
                <Plus className="w-5 h-5 stroke-[2.2]" />
                <span>Vincular Nova Conta</span>
              </button>
            </div>
          </div>
        ) : (
          linkedBanks.map((bank) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-none p-4 shadow-none space-y-3"
            >
              {/* Header do Cartão */}
              <div className="flex items-center justify-between border-b border-[#f1f1f2] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8f2fa] flex items-center justify-center text-[#2481cc]">
                    <CreditCard className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[15px] font-semibold text-black block">
                      {bank.bank_name || 'Conta Bancária'}
                    </span>
                    {(bank.owner_name || bank.holder_name) && (
                      <span className="text-[12.5px] text-[#8e8e93]">
                        Titular: {bank.owner_name || bank.holder_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/adicionar-banco?edit=${bank.id}${redirectPath ? `&redirect=${redirectPath}` : ''}`, {
                        state: { bank }
                      });
                    }}
                    className="p-1.5 text-[#8e8e93] hover:text-[#2481cc] active:scale-95 transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteDialog({ isOpen: true, id: bank.id })}
                    className="p-1.5 text-[#8e8e93] hover:text-[#ff3b30] active:scale-95 transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detalhes do IBAN */}
              <div className="space-y-1 pt-1">
                <span className="text-[12.5px] text-[#8e8e93] uppercase tracking-wide font-medium">
                  Número do IBAN
                </span>
                <div className="flex items-center justify-between bg-[#f8f9fa] px-3 py-2.5 rounded-none">
                  <span className="text-[14.5px] font-mono font-medium text-[#2481cc] tracking-wider select-all truncate">
                    {formatIbanDisplay(bank.iban)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyIban(bank.iban)}
                    className="ml-2 p-1 text-[#2481cc] hover:opacity-80 active:scale-90 transition-all cursor-pointer"
                    title="Copiar IBAN"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[12px] text-green-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                  Conta ativa para retiradas
                </span>
                {redirectPath && (
                  <button
                    type="button"
                    onClick={() => navigate(redirectPath)}
                    className="text-[13px] font-medium text-[#2481cc] hover:underline"
                  >
                    Voltar para saque
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}


      </main>
    </div>
  );
}
