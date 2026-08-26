import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Camera, Loader2, ShieldCheck, BanknoteIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/currency';

interface RechargeResponse {
  success: boolean;
  message: string;
}

export default function PayMoney() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const rechargeId = searchParams.get('id');
  const amount = searchParams.get('amount');
  const bankId = searchParams.get('bankId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBank() {
      if (!bankId) return;
      try {
        const { data, error } = await supabase
          .rpc('get_collection_bank_details_mcpn', { p_bank_id: bankId });
        if (!error && data && data.length > 0) {
          setBankDetails(data[0]);
        }
      } catch {}
    }
    fetchBank();
  }, [bankId]);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    showToast('Copiado!', 'success');
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_W = 1200, MAX_H = 1600;
          if (width > height) { if (width > MAX_W) { height *= MAX_W / width; width = MAX_W; } }
          else { if (height > MAX_H) { width *= MAX_H / height; height = MAX_H; } }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => { if (blob) resolve(blob); else reject(new Error('Falha')); },
            'image/jpeg', 0.8
          );
        };
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOptimizing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      const blob = await compressImage(file);
      setProofFile(blob);
    } catch {
      setProofFile(file);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      showToast('Por favor, anexe o comprovativo de pagamento.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');
      const fileName = `${user.id}/${rechargeId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recargas')
        .upload(fileName, proofFile, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc('confirm_recharge_mcpn', {
        p_recharge_id: rechargeId || '',
        p_bank_name: bankDetails?.nome_banco || 'Depósito Bancário',
        p_image_path: uploadData.path
      }) as { data: RechargeResponse | null; error: any };
      if (rpcError) throw rpcError;

      if (data?.success) {
        showToast(data.message || 'Enviado com sucesso!', 'success');

        // Tenta abrir o Multicaixa Express sem redirecionar para Play Store
        const tryOpenApp = () => {
          const isAndroid = /android/i.test(navigator.userAgent);
          if (isAndroid) {
            // Usa intent com fallback vazio para evitar Play Store
            const intent = "intent://open#Intent;scheme=multicaixaexpress;package=ao.co.emis.multicaixaexpress;S.browser_fallback_url=about:blank;end";
            window.location.href = intent;
          }
          // Após tentativa, navega para histórico
          setTimeout(() => {
            navigate('/registro-transacoes?tab=recarga');
          }, 1500);
        };

        tryOpenApp();
      } else {
        showToast(data?.message || 'Falha ao enviar. Tente novamente.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha na ligação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedAmount = amount ? formatCurrency(Number(amount), 'KZ') : '0,00 Kz';

  const DetailRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-0">
      <span className="text-[13.5px] text-[#8e8e93]">{label}</span>
      <div className="flex items-center gap-2 max-w-[55%]">
        <span className="text-[13.5px] font-semibold text-black text-right truncate">
          {value || '—'}
        </span>
        <button
          type="button"
          onClick={() => copyToClipboard(value, field)}
          className="shrink-0 text-gray-400 hover:text-[#25D366] active:scale-90 transition-all cursor-pointer"
        >
          {copiedField === field
            ? <Check className="w-4 h-4 text-[#25D366] stroke-[2.5]" />
            : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] pb-28 font-sans text-black select-none">

      <header className="w-full px-4 pt-4 pb-3 bg-[#f1f1f2] sticky top-0 z-20 flex items-center gap-3">
        <button
          onClick={() => navigate('/recarregar')}
          className="p-1 -ml-1 text-black active:opacity-50 transition-opacity cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <div>
          <h1 className="text-[18px] font-bold leading-tight tracking-tight">Pague</h1>
          <p className="text-[12px] text-[#8e8e93] leading-none mt-0.5">Passo 3 de 3</p>
        </div>
      </header>

      <div className="mx-4 mb-3">
        <div className="bg-white rounded-[16px] px-5 py-3.5 flex items-center justify-between shadow-2xs border border-gray-100">
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
              <Check className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-semibold text-[#25D366]">Valor</span>
          </div>
          <div className="flex-1 h-[2px] bg-[#25D366] mx-1 rounded-full" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
              <Check className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-semibold text-[#25D366]">Banco</span>
          </div>
          <div className="flex-1 h-[2px] bg-[#25D366] mx-1 rounded-full" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center ring-4 ring-[#25D366]/20">
              <span className="text-white font-bold text-[13px]">3</span>
            </div>
            <span className="text-[10px] font-bold text-[#25D366]">Pagar</span>
          </div>
        </div>
      </div>

      <main className="px-4 flex flex-col gap-3 max-w-[480px] mx-auto">

        <div className="bg-white rounded-[16px] px-5 py-4 shadow-2xs border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#e5f5e9] flex items-center justify-center shrink-0">
            <BanknoteIcon className="w-6 h-6 text-[#25D366]" />
          </div>
          <div>
            <p className="text-[12.5px] text-[#8e8e93]">Valor a depositar</p>
            <p className="text-[22px] font-bold text-black tracking-tight leading-tight">{formattedAmount}</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(amount || '', 'amount')}
            className="ml-auto text-gray-400 hover:text-[#25D366] transition-colors cursor-pointer"
          >
            {copiedField === 'amount'
              ? <Check className="w-5 h-5 text-[#25D366] stroke-[2.5]" />
              : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <div className="bg-white rounded-[16px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="px-4 pt-3.5 pb-2 border-b border-gray-100">
            <span className="text-[12px] font-bold text-[#25D366] tracking-wide uppercase">
              Dados para Transferência
            </span>
          </div>
          <DetailRow label="IBAN" value={bankDetails?.iban || 'A carregar...'} field="iban" />
          <DetailRow label="Banco" value={bankDetails?.nome_banco || '—'} field="banco" />
          <DetailRow label="Beneficiário" value={bankDetails?.nome_proprietario || '—'} field="beneficiario" />
        </div>

        <form onSubmit={handleSubmit} id="pay-money-form">
          <input type="file" id="proofInput" className="hidden" accept="image/*" onChange={handleFileChange} />

          {previewUrl ? (
            <div
              onClick={() => !isSubmitting && document.getElementById('proofInput')?.click()}
              className="bg-white rounded-[16px] overflow-hidden shadow-2xs border border-[#25D366] cursor-pointer transition-all active:scale-[0.99] relative w-full h-40"
            >
              <img src={previewUrl} alt="Comprovativo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-white/90 rounded-full px-4 py-2 flex items-center gap-2 text-[13px] font-bold text-[#25D366]">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Comprovativo Anexado
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); document.getElementById('proofInput')?.click(); }}
                className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-[11.5px] font-bold text-gray-700 shadow-xs"
              >
                Alterar
              </button>
            </div>
          ) : (
            <div
              onClick={() => !isSubmitting && document.getElementById('proofInput')?.click()}
              className="flex items-start justify-start py-2"
            >
              <div className="w-[72px] h-[72px] bg-white/80 flex items-center justify-center transition-transform active:scale-95 cursor-pointer">
                {isOptimizing
                  ? <Loader2 className="w-8 h-8 text-[#25D366]/50 animate-spin" />
                  : <Camera className="w-8 h-8 text-[#25D366]/50" />}
              </div>
            </div>
          )}
        </form>

      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#f1f1f2]/95 backdrop-blur-sm px-4 pb-6 pt-3 z-40 border-t border-gray-200/50">
        <button
          type="submit"
          form="pay-money-form"
          disabled={isSubmitting || !proofFile || isOptimizing}
          className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-bold text-[15px] shadow-[0_4px_16px_rgba(37,211,102,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:shadow-none active:scale-[0.99] cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 text-white" />
              <span>A enviar...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Pague</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
