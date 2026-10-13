# RitmoPix ⚡

Controle moderno, simples e inteligente de cobranças mensais para autônomos, professores particulares e prestadores de serviço com Pix e WhatsApp.

![RitmoPix Logo](public/ritmopix-logo.png)

---

## 🚀 Principais Funcionalidades

- **☁️ Banco de Dados em Nuvem Seguro (Supabase)**: Chega de depender de `localStorage` que se perde ao limpar o navegador ou mudar de aparelho.
- **🔐 Autenticação com Row Level Security (RLS)**: Cada usuário acessa única e exclusivamente seus próprios clientes e cobranças.
- **📅 Histórico Completo de Mensalidades**: Acompanhe o status mês a mês, métricas de recebimento, inadimplência e taxa de pagamento dos últimos 6 meses.
- **🔮 Previsão Financeira**: Veja a receita prevista para o próximo mês automaticamente com base nos clientes ativos.
- **📱 Cobrança via WhatsApp em 1 Clique**: Mensagens personalizadas e inteligentes geradas conforme o momento (aviso prévio, cobrança no dia, cobrança de atraso ou recibo de pagamento).
- **🔑 Pix Copia e Cola & QR Code Integrado**: Geração instantânea do payload oficial BR Code (EMV/CRC-16) e exibição do QR Code na tela para pagamento imediato.
- **🔔 Avisos e Notificações**: Faixa de atenção, contadores e suporte a notificações no navegador.
- **📦 Arquivamento sem Perda de Dados**: Pause cobranças futuras de alunos/clientes inativos mantendo todo o histórico financeiro passado intacto.
- **📲 PWA (Progressive Web App)**: Instalável no celular e computador.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: JavaScript moderno (ES Modules), Tailwind CSS v4, Vite 6
- **Backend & Auth**: Supabase (PostgreSQL, Auth com RLS)
- **Ícones**: Font Awesome 6
- **Testes Automatizados**: Vitest (testes de regras de negócio, cálculo de datas e geração de Pix)

---

## 📋 Pré-requisitos e Configuração

### 1. Clonar o repositório e instalar dependências

```bash
git clone https://github.com/NayanLuiz/Ritmo-Pix.git
cd Ritmo-Pix
npm install
```

### 2. Configurar o Banco no Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** > **New query**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication** > **Users**, crie o seu usuário de acesso com e-mail e senha (marque *Auto Confirm User*).
4. **Modelo de Assinatura & SaaS**: Ao criar conta, cada usuário recebe 5 dias de degustação gratuita. Após o término, o sistema exige ativação do Plano PRO (R$ 29,90/mês) via Pix Asaas com baixa instantânea. O e-mail `nayanlima27@gmail.com` possui acesso vitalício como Superadmin e painel de controle.

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base):

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

### 4. Rodar Localmente

```bash
npm run dev
```

Abra [http://localhost:3333](http://localhost:3333) no seu navegador.

---

## 🧪 Testes

Para rodar os testes unitários da lógica de datas, Pix e cobranças:

```bash
npm test
```

---

## 🌐 Deploy (Vercel ou Netlify)

1. Conecte este repositório na **Vercel** ou **Netlify**.
2. Configure as seguintes variáveis de ambiente na plataforma:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. O build command padrão é `npm run build` e o diretório de saída é `dist`.
4. Pronto! Sua aplicação estará no ar com HTTPS gratuito e suporte completo a instalação como aplicativo (PWA).

---

## 📄 Licença

Projeto desenvolvido para gestão financeira pessoal e profissional.
