# M&P Drive Thru — Site de Pedidos Online (v4)

Site estático, responsivo e sem dependências externas para o **M&P Drive Thru** (Bairro Cohab, Tucuruí/PA). Operação **100% retirada no balcão e Drive Thru** (sem taxas), com pedido estruturado enviado direto para o WhatsApp.

## Destaques desta Versão (v4)
- **Status inteligente com contagem regressiva**: calcula abertura/fechamento em tempo real no fuso `America/Sao_Paulo`, informa tempo médio de preparo (`~20 a 30 min`) e corte de últimos pedidos (`13h45`), e destaca um card forte de **Encomenda Antecipada** quando fechado.
- **Carrinho com "Pedir para agora" vs "Agendar retirada"**: o cliente escolhe o horário de retirada direto no carrinho e a mensagem do WhatsApp vai completa (tipo de pedido, modalidade, endereço de retirada, horário, pagamento preferido, itens e observações).
- **Cardápio interativo (18 itens)**: abas por categoria + filtros rápidos (*Mais vendidos*, *Para família*, *Almoço individual*, *Até R$ 25*, *Potes & Açaí*) + **Combo do Dia / Sugestão da Casa** + extras pagos com preços visíveis dentro do modal.
- **Prova social editável**: métricas locais e cards de avaliações (Google e Instagram) configuráveis no início de `app.js` (`STORE.stats` e `REVIEWS`).
- **Nosso Espaço aprimorado**: carrossel horizontal fluido no celular com "Toque para ampliar", setas de navegação e slot pronto para vídeo curto da brasa (`STORE.brasaVideo = 'assets/video-brasa.mp4'`).
- **Google Maps interativo + SEO Local**: alternância Mapa/Satélite, Schema.org completo (`Restaurant` + `LocalBusiness` + `Menu` com todos os preços em `BRL`), bloco editorial otimizado para buscas em Tucuruí/Cohab e links para `@mp_drive_thru` e Google Meu Negócio.

---

## Como trocar por fotos reais dos pratos (após contratação)

Basta substituir os arquivos dentro da pasta `assets/` **mantendo exatamente os mesmos nomes** (formato recomendado: `900×900` JPG otimizado, qualidade ~82%):

| Arquivo em `assets/` | Prato correspondente |
|---|---|
| `food-frango.jpg` | Frango Assado Inteiro e Banda |
| `food-peixe.jpg` | Tambaqui Assado Inteiro e Banda |
| `food-toscana.jpg` | Toscana na Brasa (3 unid.) |
| `food-marmita-mista.jpg` | Marmita Mista 3 Proteínas |
| `food-marmita-carne-frango.jpg` | Marmita Carne e Frango |
| `food-marmita-carne-toscana.jpg` | Marmita Carne e Toscana |
| `food-marmita-carne.jpg` | Marmita de Carne |
| `food-marmita-toscana.jpg` | Marmita de Toscana |
| `food-marmita-frango.jpg` | Marmita de Frango |
| `food-pote.jpg` | Vendas no Pote (250g, 350g, 500g, 1kg) |
| `food-acai.jpg` | Açaí 1 Litro |

### Como ativar o vídeo curto da churrasqueira (10–15s)
1. Salve o vídeo leve em MP4 (H.264, sem áudio ou leve, idealmente até 4 MB) em `assets/video-brasa.mp4`.
2. Em `app.js`, altere `brasaVideo: ''` para `brasaVideo: 'assets/video-brasa.mp4'`.

### Como personalizar avaliações, números e pino exato no mapa
No topo de `app.js`:
- `STORE.stats` — ajuste os contadores reais de clientes e preparo.
- `REVIEWS` — cole os depoimentos reais recebidos no Google Meu Negócio e Instagram.
- `STORE.mapQuery` — se quiser travar o pino em cima da loja, cole as coordenadas GPS (`-3.76..., -49.67...`).
