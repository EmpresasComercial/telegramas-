import React, { useState, useRef, useEffect } from "react";
import { Phone, AtSign, Cake, Megaphone, Bot, UserPlus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useToast } from "../../../components/Toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    firstName: string;
    lastName: string;
    bio: string;
    avatarUrl: string;
    phone: string;
  };
  onSaved: (data: { firstName: string; lastName: string; bio: string; avatarUrl: string }) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
}: EditProfileModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [bio, setBio] = useState(initialData.bio);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setBio(initialData.bio);
      setAvatarUrl(initialData.avatarUrl);
      setAvatarPreview(null);
      setAvatarFile(null);
    }
  }, [isOpen, initialData.firstName, initialData.lastName, initialData.bio, initialData.avatarUrl]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Máximo 5MB", "error"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!firstName.trim()) { showToast("O nome não pode estar vazio", "error"); return; }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `avatars/${user.id}/profile.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("user-avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("user-avatars").getPublicUrl(path);
          finalAvatarUrl = publicUrl;
        } else if (avatarPreview) {
          finalAvatarUrl = avatarPreview;
        }
      }

      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

      await supabase.auth.updateUser({
        data: {
          name: fullName, full_name: fullName,
          first_name: firstName.trim(), last_name: lastName.trim(),
          bio: bio.trim(), avatar_url: finalAvatarUrl,
        },
      });

      // Persiste nome de exibição em sys_t500 para ser visível nos chats
      try {
        await (supabase as any)
          .from("sys_t500")
          .update({ nome_exibicao: fullName || null })
          .eq("id", user.id);
      } catch { /* silencia */ }

      showToast("Perfil atualizado!", "success");
      onSaved({ firstName: firstName.trim(), lastName: lastName.trim(), bio: bio.trim(), avatarUrl: finalAvatarUrl });
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Erro ao guardar", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatar = avatarPreview || avatarUrl;
  const bioRemaining = 70 - bio.length;
  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || initialData.phone;
  // Gera username estilo Telegram: @Nome_Sobrenome
  const telegramUsername = `@${[firstName.trim(), lastName.trim()].filter(Boolean).join("_").replace(/\s+/g, "_") || "usuario"}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{
        backgroundColor: "#f1f1f2",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ──────── HEADER ──────── */}
      <div className="flex items-center px-4 pt-4 pb-3 bg-[#f1f1f2]">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="p-1 -ml-1 rounded-full active:opacity-50 transition-opacity mr-3"
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="text-[20px] font-bold text-black flex-1">Conta</span>
        <button
          onClick={handleSave}
          disabled={isSaving || !firstName.trim()}
          className="text-[16px] font-medium text-[#3390ec] disabled:opacity-40 active:opacity-60 transition-opacity"
        >
          {isSaving
            ? <span className="w-4 h-4 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin inline-block" />
            : "Guardar"
          }
        </button>
      </div>

      {/* ──────── CONTEÚDO ROLÁVEL ──────── */}
      <div className="flex-1 overflow-y-auto px-2 max-w-2xl mx-auto w-full">

        {/* ── AVATAR SECTION (clicável para trocar foto) ── */}
        <div
          className="flex flex-col items-center py-5 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="relative">
            <div className="w-[100px] h-[100px] rounded-full overflow-hidden">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#3390ec] to-[#1e6dc8] flex items-center justify-center">
                  <span className="text-[42px] font-bold text-white">
                    {firstName.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
            {/* Badge câmera */}
            <div className="absolute bottom-0 right-0 w-[30px] h-[30px] bg-[#3390ec] rounded-full flex items-center justify-center border-[3px] border-[#f1f1f2]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4" fill="white"/></svg>
            </div>
          </div>
          <p className="text-[13px] text-[#3390ec] mt-2 font-medium">Alterar foto de perfil</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

        {/* ── CARD: SEU NOME ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100 mb-2">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">Seu nome</span>
          </div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={64}
            placeholder="Nome"
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none border-b border-[#e5e5e5] placeholder:text-[#c7c7cc]"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={64}
            placeholder="Sobrenome"
            className="w-full px-4 py-3 text-[17px] text-black bg-white outline-none placeholder:text-[#c7c7cc]"
          />
        </div>

        {/* ── CARD: BIO ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">Bio</span>
            <span className={`text-[13px] tabular-nums ${bioRemaining < 10 ? "text-red-500" : "text-[#8e8e93]"}`}>
              {bioRemaining}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 70))}
            maxLength={70}
            placeholder="Bio"
            rows={2}
            className="w-full px-4 py-2 text-[17px] text-black bg-white outline-none resize-none placeholder:text-[#c7c7cc]"
          />
          <p className="px-4 pb-3 text-[13px] text-[#8e8e93]">Algumas palavras sobre você.</p>
        </div>

        {/* ── SPACER ── */}
        <div className="h-4" />

        {/* ── CARD: SUAS INFORMAÇÕES ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[13px] font-semibold text-[#4faf64]">Suas Informações</span>
          </div>

          {/* Telefone */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#4faf64] flex items-center justify-center mr-4 shrink-0">
              <Phone className="w-[17px] h-[17px] text-white fill-white stroke-0" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{initialData.phone}</span>
              <span className="text-[13px] text-[#8e8e93]">Toque para alterar o número de telefone</span>
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f2a93b] flex items-center justify-center mr-4 shrink-0">
              <AtSign className="w-[17px] h-[17px] text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] text-black font-normal">{telegramUsername}</span>
              <span className="text-[13px] text-[#8e8e93]">Nome de Usuário</span>
            </div>
          </div>

          {/* Aniversário */}
          <div className="flex items-center px-4 py-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#3390ec] flex items-center justify-center mr-4 shrink-0">
              <Cake className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <span className="text-[17px] text-black font-normal">Adicionar Aniversário</span>
          </div>
        </div>

        <p className="px-2 py-2 text-[13px] text-[#8e8e93]">
          Escolha quem pode ver seu aniversário nas{" "}
          <span className="text-[#3390ec] cursor-pointer">Configurações.</span>
        </p>

        {/* ── SPACER ── */}
        <div className="h-3" />

        {/* ── CARD: CANAL + AUTOMAÇÃO ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          {/* Canal pessoal */}
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#f25050] flex items-center justify-center mr-4 shrink-0">
              <Megaphone className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <span className="text-[17px] text-black flex-1 font-normal">Canal pessoal</span>
            <span className="text-[16px] text-[#3390ec] font-normal">Adicionar</span>
          </div>

          {/* Automação de Chats */}
          <div className="flex items-center px-4 py-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#7a57d6] flex items-center justify-center mr-4 shrink-0">
              <Bot className="w-[17px] h-[17px] text-white stroke-[2]" />
            </div>
            <span className="text-[17px] text-black flex-1 font-normal">Automação de Chats</span>
            <span className="text-[11px] font-semibold bg-[#3390ec] text-white px-1.5 py-0.5 rounded-[4px]">NEW</span>
          </div>
        </div>

        <p className="px-2 py-2 text-[13px] text-[#8e8e93] mb-2">
          Escolha um bot para responder em seu nome.
        </p>

        {/* ── SPACER ── */}
        <div className="h-2" />

        {/* ── CARD: ADICIONAR CONTA ── */}
        <div className="bg-white rounded-[14px] overflow-hidden shadow-2xs border border-gray-100">
          <div className="flex items-center px-4 py-3">
            <div className="w-[34px] h-[34px] rounded-full border-[2px] border-[#3390ec] flex items-center justify-center mr-4 shrink-0">
              <UserPlus className="w-[17px] h-[17px] text-[#3390ec] stroke-[2]" />
            </div>
            <span className="text-[17px] text-[#3390ec] font-normal">Adicionar Conta</span>
          </div>
        </div>

        <div className="h-16" />
      </div>
    </div>
  );
}
