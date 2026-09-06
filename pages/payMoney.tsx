import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Camera, Loader2, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] pb-28 font-sans text-black select-none">

      <header className="w-full px-4 pt-4 pb-3 bg-[#f1f1f2] sticky top-0 z-20 flex items-center gap-3">
        <button
          onClick={() => navigate('/recarregar')}
          className="p-1 -ml-1 text-black active:opacity-50 transition-opacity cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
        </button>
        <h1 className="text-[18px] font-bold leading-tight tracking-tight">Pagar</h1>
      </header>

      <main className="px-5 pt-3 flex flex-col gap-5 max-w-[480px] mx-auto">

        {/* 1. VALOR */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Valor</span>
            <div className="text-[24px] font-bold text-black tracking-tight">{formattedAmount}</div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(amount || '', 'amount')}
            className="p-2 text-gray-400 hover:text-[#2481cc] active:scale-90 transition-all cursor-pointer"
            title="Copiar valor"
          >
            {copiedField === 'amount'
              ? <Check className="w-5 h-5 text-[#2481cc] stroke-[2.5]" />
              : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* 2. IBAN */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex-1 min-w-0 mr-2">
            <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">IBAN</span>
            <div className="text-[15.5px] font-mono font-bold text-black tracking-tight select-all truncate">
              {bankDetails?.iban || 'A carregar...'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(bankDetails?.iban || '', 'iban')}
            className="p-2 text-gray-400 hover:text-[#2481cc] active:scale-90 transition-all cursor-pointer shrink-0"
            title="Copiar IBAN"
          >
            {copiedField === 'iban'
              ? <Check className="w-5 h-5 text-[#2481cc] stroke-[2.5]" />
              : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* 3. ÁREA DE CARREGAR IMAGEM */}
        <form onSubmit={handleSubmit} id="pay-money-form">
          <input type="file" id="proofInput" className="hidden" accept="image/*" onChange={handleFileChange} />

          {previewUrl ? (
            <div
              onClick={() => !isSubmitting && document.getElementById('proofInput')?.click()}
              className="relative w-full h-48 rounded-xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform border border-gray-200"
            >
              <img src={previewUrl} alt="Comprovativo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <span className="bg-white/95 text-[#2481cc] font-bold text-[13px] px-4 py-2 rounded-full shadow-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Comprovativo Anexado (Alterar)
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !isSubmitting && document.getElementById('proofInput')?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-300 hover:border-[#2481cc] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors active:bg-gray-100 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#2481cc]">
                {isOptimizing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              </div>
              <span className="text-[14px] font-semibold text-black">
                {isOptimizing ? 'A preparar imagem...' : 'Carregar Comprovativo'}
              </span>
              <span className="text-[12px] text-gray-400">
                Toque aqui para anexar a foto ou captura
              </span>
            </div>
          )}
        </form>

      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#f1f1f2]/95 backdrop-blur-sm px-4 pb-6 pt-3 z-40 border-t border-gray-200/50">
        <button
          type="submit"
          form="pay-money-form"
          disabled={isSubmitting || !proofFile || isOptimizing}
          className="w-full h-[50px] rounded-[16px] bg-[#2481cc] text-white font-bold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-[0.99] cursor-pointer"
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
