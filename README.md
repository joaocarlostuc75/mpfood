# M&P Drive Thru — Site de Pedidos Online

Site estático, responsivo e sem dependências externas para o **M&P Drive Thru** (Bairro Cohab, Tucuruí/PA). O cliente monta o pedido no cardápio interativo, escolhe **Retirada no balcão** ou **Drive Thru** (operação 100% retirada, sem taxas) e finaliza com mensagem pronta no WhatsApp.

## Destaques da Versão
- **Identidade alinhada à fachada real**: paleta coral-brasa (`#ec4622`), logotipo geométrico M&P e vitrine principal com a foto oficial da loja (`assets/ambiente-fachada.jpg`).
- **Cardápio completo (18 itens)**: Na Brasa (6), Marmitas personalizáveis (6), Vendas no Pote (4), Açaí 1L e Buffet Self Service.
- **Conversão mobile**: barra fixa inferior de carrinho, adição rápida em 1 clique, upsell inteligente, memória de cliente em `localStorage`, campo condicional de troco e botão de copiar endereço.
- **Horário em tempo real**: fuso `America/Sao_Paulo`, respeitando 10h–14h e fechamento às terças-feiras, com aviso de encomenda antecipada fora do expediente.
- **Pronto para Vercel**: `vercel.json` com headers de segurança e cache imutável para `/assets/*`, Open Graph, Schema.org `Restaurant`, `manifest.webmanifest`, `robots.txt` e `sitemap.xml`.

## Estrutura do Projeto

```text
.
├── index.html
├── styles.css
├── app.js
├── vercel.json
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── .gitignore
├── README.md
└── assets/
    ├── ambiente-fachada.jpg
    ├── ambiente-balcao.jpg
    ├── ambiente-buffet.jpg
    ├── ambiente-churrasqueira.jpg
    ├── ambiente-cozinha.jpg
    ├── ambiente-peixe.jpg
    ├── ambiente-prato.jpg
    ├── ambiente-salao.jpg
    ├── food-acai.jpg
    ├── food-frango.jpg
    ├── food-marmita.jpg
    ├── food-peixe.jpg
    ├── food-pote.jpg
    ├── food-toscana.jpg
    └── hero-brasa.jpg
```

## Rodar localmente

```bash
python3 -m http.server 3000
# abra http://localhost:3000
```

## Deploy na Vercel via GitHub

1. Envie o repositório para o GitHub (`git init`, `git add .`, `git commit`, `git push`).
2. Na [Vercel](https://vercel.com/new), clique em **Import Git Repository** e selecione o repositório.
3. Em **Framework Preset**, deixe **Other** (site estático), sem Build Command e com **Output Directory** vazio (raiz `.`).
4. Clique em **Deploy**. Após publicar, atualize o domínio real em `robots.txt` e `sitemap.xml`.
