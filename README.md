# Sistema Themis

Portal oficial do Diretório Acadêmico de Direito: eventos com inscrição e certificado, loja de produtos, avisos e painel administrativo da diretoria.

## Tecnologias

- TanStack Start (React 19, TanStack Router e Query) com Vite e Tailwind CSS
- Supabase (banco de dados, autenticação, storage e edge functions)
- Hospedagem na Vercel

## Rodando localmente

Requer Node.js 20 ou superior.

```sh
npm install
npm run dev
```

O site abre em `http://localhost:8080`. As variáveis do Supabase ficam no arquivo `.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID`).

## Deploy

Basta importar o repositório na Vercel e cadastrar as mesmas variáveis do `.env` em
Settings → Environment Variables. O build detecta a Vercel automaticamente.
