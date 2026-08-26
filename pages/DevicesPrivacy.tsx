import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DevicesPrivacy() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[100dvh] bg-[#f1f1f2] font-sans flex flex-col">
      {/* HEADER */}
      <div className="w-full flex items-center px-4 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-10 text-black">
        <button onClick={() => navigate(-1)} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Termos de uso e privacidade</span>
      </div>

      {/* CONTENT */}
      <div className="flex-1 bg-white mx-0 px-5 py-6 overflow-y-auto text-[#222] text-[15px] leading-relaxed">
        <h1 className="text-[22px] font-bold mb-4 text-[#111]">Política de Privacidade do Telegram</h1>

        <Section title="1. Introdução">
          <p>Esta Política de Privacidade descreve como nós, a Telegram Messenger Inc. <strong>("Telegram")</strong>, utilizamos e protegemos os seus dados pessoais que nos fornece, ou que são obtidos ou gerados por nós, em conexão com o uso dos nossos serviços de mensagens baseados na cloud <strong>("Serviços")</strong>.</p>

          <SubSection title="1.1 Princípios de Privacidade">
            <p>O Telegram tem dois princípios fundamentais quando se trata de recolha e processamento de dados privados:</p>
            <ul>
              <li>Não utilizamos o conteúdo dos seus chats ou listas de contactos para mostrar publicidade.</li>
              <li>Apenas armazenamos os dados de que o Telegram necessita para funcionar como um serviço de mensagens seguro e rico em funcionalidades.</li>
            </ul>
          </SubSection>

          <SubSection title="1.2 Termos de Serviço">
            <p>Esta Política de Privacidade faz parte dos nossos Termos de Serviço, disponíveis em <strong>https://telegram.org/tos</strong>.</p>
          </SubSection>
        </Section>

        <Section title="2. Base Jurídica para o Processamento dos Seus Dados Pessoais">
          <p>Processamos os seus dados pessoais com base no facto de tal processamento ser necessário para prosseguir os nossos interesses legítimos, incluindo: (1) fornecer Serviços eficazes e inovadores aos nossos utilizadores; e (2) detetar, prevenir ou tratar de outra forma a fraude ou questões de segurança.</p>
        </Section>

        <Section title="3. Que Dados Pessoais Utilizamos">
          <SubSection title="3.1 Dados Básicos da Conta">
            <p>O Telegram é um serviço de comunicação. Fornece o seu número de telemóvel e dados básicos da conta (que podem incluir nome de perfil, foto de perfil e informações pessoais) para criar uma conta Telegram.</p>
            <p>Para facilitar que os seus contactos e outras pessoas o encontrem, o nome de ecrã que escolher, as suas fotos de perfil e o seu nome de utilizador (caso escolha definir um) no Telegram são sempre públicos.</p>
          </SubSection>

          <SubSection title="3.2 O Seu Endereço de E-mail">
            <p>Quando ativa a verificação em 2 etapas para a sua conta ou armazena documentos usando a funcionalidade Telegram Passport, pode optar por configurar um e-mail de recuperação de palavra-passe. Este endereço será usado apenas para lhe enviar um código de recuperação de palavra-passe, caso se esqueça dela.</p>
          </SubSection>

          <SubSection title="3.3 As Suas Mensagens">
            <p><strong>Chats na cloud:</strong> O Telegram é um serviço cloud. Armazenamos mensagens, fotos, vídeos e documentos dos seus chats na cloud nos nossos servidores para que possa aceder aos seus dados a partir de qualquer dispositivo, a qualquer momento. Todos os dados são armazenados com encriptação forte.</p>
            <p><strong>Chats secretos:</strong> Os chats secretos usam encriptação ponta a ponta. Não há forma de nós ou de qualquer outra pessoa sem acesso direto ao seu dispositivo conhecer o conteúdo que está a ser enviado nessas mensagens. Não armazenamos os seus chats secretos nos nossos servidores.</p>
          </SubSection>

          <SubSection title="3.4 Número de Telemóvel e Contactos">
            <p>O Telegram usa números de telemóvel como identificadores únicos para que seja fácil mudar do SMS e de outras aplicações de mensagens. Pedimos a sua permissão antes de sincronizar os seus contactos.</p>
          </SubSection>
        </Section>

        <Section title="4. Manter os Seus Dados Pessoais Seguros">
          <p>O Telegram foi construído para proteger os seus dados contra terceiros. A sua informação é protegida por duas camadas de encriptação segura (exceto nos chats secretos que têm uma camada de encriptação ponta a ponta adicional).</p>
        </Section>

        <Section title="5. Processamento dos Seus Dados Pessoais">
          <p>Podemos usar os seus dados pessoais para as seguintes finalidades:</p>
          <ul>
            <li>Fornecer os Serviços e apoio ao cliente.</li>
            <li>Enviar-lhe notificações sobre os Serviços, incluindo alertas de segurança.</li>
            <li>Verificar a sua identidade e prevenir fraudes ou outros crimes.</li>
            <li>Cumprir as nossas obrigações legais.</li>
          </ul>
        </Section>

        <Section title="6. Período de Armazenamento dos Dados">
          <p>Se eliminar a sua conta Telegram, todos os seus mensagens, media e dados da conta serão removidos dos nossos servidores. Pode eliminar a sua conta a qualquer momento em Definições.</p>
        </Section>

        <Section title="7. Com Quem Os Seus Dados Pessoais Podem Ser Partilhados">
          <p>O Telegram não vende os seus dados pessoais. Os seus dados podem ser partilhados em circunstâncias muito limitadas, como o cumprimento de ordens judiciais para investigação de terrorismo.</p>
        </Section>

        <Section title="8. Os Seus Direitos">
          <p>Tem o direito de aceder, retificar, transferir e solicitar a eliminação dos seus dados pessoais. Pode exercer a maioria destes direitos diretamente através das Definições do Telegram.</p>
        </Section>

        <Section title="9. Contacto">
          <p>Se tiver alguma dúvida sobre esta Política de Privacidade, pode contactar-nos através do endereço:</p>
          <p className="mt-2 text-[#3390ec] font-medium">privacy@telegram.org</p>
        </Section>

        <p className="text-[12px] text-gray-400 mt-8 pb-4 text-center">© Telegram Messenger Inc. · Política de Privacidade</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[16px] font-bold text-[#111] mb-2">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[14px] font-semibold text-[#333] mb-1">{title}</h3>
      <div className="flex flex-col gap-1 text-[14px] text-gray-700">{children}</div>
    </div>
  );
}
