import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ChevronLeft, Plus, Landmark } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  owner_name?: string;
  holder_name?: string;
}

function formatIbanWithDots(iban: string): string {
  if (!iban) return '';
  const clean = iban.replace(/[\s.]/g, '');
  return clean.match(/.{1,4}/g)?.join('.') || clean;
}

export default function BankInfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { showToast } = useToast();

  const [linkedBanks, setLinkedBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  const fetchBanks = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
      if (error) throw error;
      if (data) setLinkedBanks(data as BankAccount[]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.rpc('remove_bank_account_mcpn', {
        p_id: id
      });
      
      if (error) throw error;

      const result = data as { success: boolean; message: string } | null;
      if (!result?.success) throw new Error(result?.message || 'Falha, tente novamente');
      
      setLinkedBanks(prev => prev.filter(b => b.id !== id));
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
    <div className="w-full min-h-screen bg-[#F2F2F2] pb-28 font-sans antialiased text-[#202020] select-none flex flex-col items-center">
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
        editText="Edit"
        confirmText="Delete"
        cancelText="Close"
      />

      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(redirectPath || '/perfil')}
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          
          <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
            Minha Conta
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 space-y-3">
        {loading ? (
          <div className="space-y-2.5">
            <div className="bg-white rounded-none p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2.5">
              <Skeleton className="w-48 h-4 rounded-none" />
            </div>
          </div>
        ) : !hasBanks ? (
          <div className="bg-white rounded-none p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col items-center space-y-2">
            <Landmark className="w-8 h-8 text-gray-300" />
            <p className="text-[13px] text-[#777777] font-normal leading-relaxed">
              Ainda não tens nenhuma conta bancária vinculada.
            </p>
          </div>
        ) : (
          linkedBanks.map((bank) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-none p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-sans font-light text-[#444444] tracking-normal">
                  {formatIbanWithDots(bank.iban)}
                </p>
              </div>
            </motion.div>
          ))
        )}

        <div>
          {hasBanks ? (
            <button
              type="button"
              onClick={() => primaryBank && setDeleteDialog({ isOpen: true, id: primaryBank.id })}
              className="w-full h-[40px] rounded-none bg-[#FE384F] hover:bg-[#E02E44] active:scale-[0.99] text-white font-normal text-[13.5px] transition-all flex items-center justify-center cursor-pointer shadow-none"
            >
              Excluir
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/adicionar-banco${redirectPath ? `?redirect=${redirectPath}` : ''}`)}
              className="w-full h-[40px] rounded-none bg-[#FE384F] hover:bg-[#E02E44] text-white font-normal text-[13.5px] transition-all active:scale-[0.99] shadow-none flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Nova Conta</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
