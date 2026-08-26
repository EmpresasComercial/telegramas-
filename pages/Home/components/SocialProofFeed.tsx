import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/Toast';
import { SmartImage } from '../../../components/SmartImage';
import { MessageSquare, Plus, X, Camera, Loader2, ChevronLeft } from 'lucide-react';

interface Proof {
  id: string;
  user: string;
  amount: string;
  comment: string;
  image: string;
  timestamp: string;
}

export function SocialProofFeed() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState('');
  const [amount, setAmount] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('postarProva') === 'true') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleCloseForm = () => {
    setShowForm(false);
    if (searchParams.has('postarProva')) {
      searchParams.delete('postarProva');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const fetchProofs = async () => {
    try {
      const { data, error } = await supabase.rpc('get_approved_social_proofs_mcpn');
      if (error) throw error;
      if (data) {
        const mapped: Proof[] = data
          .filter((item: any) => item && item.id && item.user_id)
          .map((item: any) => ({
            id: item.id,
            user: `M-E ***${String(item.user_id).substring(0, 4)}`,
            amount: `${Number(item.valor || 0).toLocaleString('pt-AO')},00 Kz`,
            comment: item.comentario || '',
            image: item.imagem_url || '',
            timestamp: item.created_at ? new Date(item.created_at).toLocaleString('pt-AO') : '---'
          }));
        setProofs(mapped);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
    const channel = supabase
      .channel('home_social_proofs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_proofs_mcpn', filter: 'status=eq.aprovado' },
        (payload) => {
          const n = payload.new;
          if (!n || !n.id || !n.user_id) return;
          setProofs(prev => [{
            id: n.id,
            user: `M-E ***${String(n.user_id).substring(0, 4)}`,
            amount: `${Number(n.valor || 0).toLocaleString('pt-AO')},00 Kz`,
            comment: n.comentario || '',
            image: n.imagem_url || '',
            timestamp: n.created_at ? new Date(n.created_at).toLocaleString('pt-AO') : '---'
          }, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/\D/g, ''));
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value.replace(/[<>]/g, '').slice(0, 200));
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const max = 1200;
          if (width > height) {
            if (width > max) { height *= max / width; width = max; }
          } else {
            if (height > max) { width *= max / height; height = max; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Tamanho de arquivo muito grande.', 'error');
      return;
    }
    setIsProcessingImage(true);
    try {
      setImage(await compressImage(file));
    } catch {
      showToast('Erro ao processar imagem.', 'error');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const formatRpcMessage = (msg: string): string => {
    if (!msg) return msg;
    const dateMatch = msg.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?/);
    if (dateMatch) {
      const d = new Date(dateMatch[0]);
      if (!isNaN(d.getTime())) {
        const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return `Disponível em ${formatted}`;
      }
    }
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !comment || !image) {
      showToast('Preencha todos os campos e anexe a foto.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão expirada.');

      let finalImageUrl = image;
      if (image.startsWith('data:')) {
        const blob = await (await fetch(image)).blob();
        const fileName = `${userData.user.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('provas-sociais')
          .upload(fileName, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        finalImageUrl = supabase.storage.from('provas-sociais').getPublicUrl(fileName).data.publicUrl;
      }

      const { data, error } = await supabase.rpc('submit_social_proof_mcpn', {
        p_valor: Number(amount),
        p_comentario: comment,
        p_imagem_url: finalImageUrl
      });
      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        showToast(result.message || 'Comprovativo enviado com sucesso!', 'success');
        handleCloseForm();
        setAmount('');
        setComment('');
        setImage(null);
        fetchProofs();
      } else {
        showToast(formatRpcMessage(result?.message) || 'Falha ao enviar comprovativo.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-3 pt-3 pb-6 flex flex-col border-t border-gray-100 bg-[#F2F2F2]">
      <div className="w-full flex items-center justify-between mb-2.5 px-0.5">
        <h2 className="text-[14px] font-medium text-[#202020]">Prova Social</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-0.5 text-[12.5px] text-[#FE384F] font-normal hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Partilhar</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-[#F2F2F2] flex flex-col items-center overflow-y-auto select-none font-sans antialiased text-[#202020]">
          <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseForm}
              className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
            </button>
            <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">Partilhar Provas</h1>
          </header>

          <div className="w-full max-w-[480px] px-4 pt-4 pb-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                id="home-modal-proof-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <div
                onClick={() => !isProcessingImage && document.getElementById('home-modal-proof-upload')?.click()}
                className="bg-white rounded-none px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {image ? (
                    <img src={image} className="w-8 h-8 object-cover rounded-none border border-gray-200" alt="Preview" />
                  ) : (
                    <Camera className="w-5 h-5 text-[#888888]" />
                  )}
                  <span className="text-[13.5px] text-[#202020] font-normal">
                    {image ? 'Foto selecionada' : 'Foto do comprovativo'}
                  </span>
                </div>
                {image ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImage(null); }}
                    className="p-1 text-[#888888] hover:text-[#FE384F]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[12px] text-[#AAAAAA] font-normal">
                    {isProcessingImage ? 'A processar...' : 'Carregar'}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-none h-[46px] px-4 flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <input
                  type="tel"
                  inputMode="numeric"
                  className="w-full h-full bg-transparent outline-none text-[13.5px] text-[#202020] placeholder:text-[#AAAAAA] font-normal"
                  placeholder="Valor recebido (Kz)"
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>

              <div className="bg-white rounded-none p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <textarea
                  className="w-full bg-transparent outline-none text-[13.5px] text-[#202020] placeholder:text-[#AAAAAA] font-normal resize-none min-h-[90px]"
                  placeholder="Partilhe a sua experiência..."
                  value={comment}
                  onChange={handleCommentChange}
                />
                <div className="text-right text-[11px] text-[#AAAAAA] pt-1">
                  {comment.length}/200
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !amount || !comment || !image}
                className="w-full h-[44px] rounded-none bg-[#FE384F] hover:bg-[#E02E44] active:scale-[0.99] text-white font-normal text-[13.5px] transition-all disabled:opacity-40 shadow-sm flex items-center justify-center cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 text-white" /> : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white p-3.5 animate-pulse space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-gray-200" />
                <div className="h-3.5 w-16 bg-gray-200" />
              </div>
              <div className="h-40 bg-gray-200 w-full" />
            </div>
          ))}
        </div>
      ) : proofs.length === 0 ? (
        <div className="bg-white p-8 flex flex-col items-center text-center">
          <MessageSquare size={30} className="text-[#CCCCCC] mb-2" />
          <p className="text-[12.5px] text-[#888888] font-normal">Ainda não existem comprovativos aprovados.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-[12.5px] text-[#FE384F] font-normal cursor-pointer"
          >
            Seja o primeiro a partilhar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {proofs.map(proof => (
            <div key={proof.id} className="bg-white rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="p-3 flex items-center justify-between border-b border-[#F5F5F5]">
                <div>
                  <p className="text-[13px] font-medium text-[#202020]">{proof.user}</p>
                  <p className="text-[10.5px] text-[#AAAAAA] font-normal">{proof.timestamp}</p>
                </div>
                <span className="text-[13px] font-medium text-[#16a34a]">+{proof.amount}</span>
              </div>
              {proof.image && (
                <div className="w-full bg-[#FAFAFA] flex items-center justify-center">
                  <SmartImage src={proof.image} alt="Comprovativo" className="w-full h-auto max-h-[380px] object-contain" />
                </div>
              )}
              {proof.comment && (
                <div className="p-3 text-[12.5px] text-[#555555] font-normal leading-relaxed border-t border-[#F5F5F5]">
                  "{proof.comment}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
