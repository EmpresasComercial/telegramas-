import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Camera, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/currency';

interface RechargeResponse {
  success: boolean;
  message: string;
}

// Otimização ultra-rápida de imagem sem bloquear a thread principal
const compressImage = async (file: File): Promise<Blob> => {
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const MAX = 1200;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
};

export default function PayMoney() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const rechargeId = searchParams.get('id');
  const amount = searchParams.get('amount');
  const bankId = searchParams.get('bankId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | Blob | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const proofFileRef = useRef<File | Blob | null>(null);

  useEffect(() => {
    if (!bankId) return;
    let isMounted = true;
    supabase
      .rpc('get_collection_bank_details_mcpn', { p_bank_id: bankId })
      .then(({ data, error }) => {
        if (isMounted && !error && data?.[0]) {
          setBankDetails(data[0]);
        }
      });
    return () => { isMounted = false; };
  }, [bankId]);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
    showToast('Copiado!', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Feedback visual imediato (0ms)
    setProofFile(file);
    proofFileRef.current = file;
    setCountdown(10);

    // Otimização em segundo plano
    compressImage(file).then((optimized) => {
      setProofFile(optimized);
      proofFileRef.current = optimized;
    });
  };

  const executeSubmit = async () => {
    const file = proofFileRef.current;
    if (!file) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const fileName = `${user.id}/${rechargeId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recargas')
        .upload(fileName, file, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc('confirm_recharge_mcpn', {
        p_recharge_id: rechargeId || '',
        p_bank_name: bankDetails?.nome_banco || 'Depósito Bancário',
        p_image_path: uploadData.path
      }) as { data: RechargeResponse | null; error: any };
      if (rpcError) throw rpcError;

      if (data?.success) {
        showToast(data.message || 'Enviado com sucesso!', 'success');
        if (/android/i.test(navigator.userAgent)) {
          window.location.href = "intent://open#Intent;scheme=multicaixaexpress;package=ao.co.emis.multicaixaexpress;S.browser_fallback_url=about:blank;end";
        }
        setTimeout(() => navigate('/registro-transacoes?tab=recarga'), 1200);
      } else {
        showToast(data?.message || 'Falha ao enviar.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha na ligação.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      setCountdown(null);
      executeSubmit();
    }
  }, [countdown]);

  const handleCancelAndExit = () => {
    setCountdown(null);
    setProofFile(null);
    proofFileRef.current = null;
    navigate('/recarregar');
  };

  const formattedAmount = amount ? formatCurrency(Number(amount), 'KZ') : '0,00 Kz';

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black select-none pb-8">
      <header className="w-full px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/recarregar')}
          className="p-1 -ml-1 text-black active:opacity-50 transition-opacity cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[1.8]" />
        </button>
        <h1 className="text-[18px] font-normal leading-tight tracking-tight">Pagar</h1>
      </header>

      <main className="px-5 pt-3 flex flex-col gap-4 max-w-[480px] mx-auto">
        {/* 1. BANCO */}
        <div className="flex items-center py-2 border-b border-gray-200">
          <span className="text-[14px] font-normal text-gray-500 mr-2 shrink-0">Banco:</span>
          <span className="text-[14px] font-normal text-black truncate">{bankDetails?.nome_banco || 'A carregar...'}</span>
        </div>

        {/* 2. DESTINATÁRIO */}
        <div className="flex items-center py-2 border-b border-gray-200">
          <span className="text-[14px] font-normal text-gray-500 mr-2 shrink-0">Destinatário:</span>
          <span className="text-[14px] font-normal text-black truncate">{bankDetails?.nome_proprietario || 'A carregar...'}</span>
        </div>

        {/* 3. IBAN */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[14px] font-normal text-gray-500 shrink-0">IBAN:</span>
            <span className="text-[14px] font-mono font-normal text-black truncate select-all">{bankDetails?.iban || 'A carregar...'}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(bankDetails?.iban || '', 'iban')}
            className="p-1.5 text-[#2481cc] active:scale-90 transition-all cursor-pointer shrink-0"
            title="Copiar IBAN"
          >
            {copiedField === 'iban' ? <Check className="w-4 h-4 text-[#2481cc] stroke-[2]" /> : <Copy className="w-4 h-4 text-[#2481cc] stroke-[1.8]" />}
          </button>
        </div>

        {/* 4. VALOR */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[14px] font-normal text-gray-500 shrink-0">Valor:</span>
            <span className="text-[14px] font-normal text-black">{formattedAmount}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(amount || '', 'amount')}
            className="p-1.5 text-[#2481cc] active:scale-90 transition-all cursor-pointer shrink-0"
            title="Copiar valor"
          >
            {copiedField === 'amount' ? <Check className="w-4 h-4 text-[#2481cc] stroke-[2]" /> : <Copy className="w-4 h-4 text-[#2481cc] stroke-[1.8]" />}
          </button>
        </div>

        {/* 5. CÂMERA + CRONÔMETRO AUTOMÁTICO */}
        <div className="pt-2 flex items-center gap-3">
          <input type="file" id="proofInput" className="hidden" accept="image/*" onChange={handleFileChange} />

          <button
            type="button"
            onClick={() => !isSubmitting && document.getElementById('proofInput')?.click()}
            className="p-2 text-[#2481cc] active:scale-90 transition-all cursor-pointer inline-flex items-center justify-center relative"
            title="Adicionar comprovativo"
          >
            <Camera className="w-6 h-6 stroke-[1.8] text-[#2481cc]" />
            {proofFile && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#2481cc] text-white rounded-full flex items-center justify-center text-[9px]">
                <Check className="w-2 h-2 stroke-[2.5]" />
              </span>
            )}
          </button>

          {countdown !== null && countdown > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-normal text-gray-600">
                A enviar em {countdown}s...
              </span>
              <button
                type="button"
                onClick={handleCancelAndExit}
                className="p-1 text-gray-400 hover:text-red-500 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                title="Cancelar e sair"
                aria-label="Cancelar e sair"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          )}

          {isSubmitting && (
            <div className="flex items-center gap-2 text-[14px] font-normal text-[#2481cc]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>A enviar dados...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
