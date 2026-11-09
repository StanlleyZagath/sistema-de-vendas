# Sistema de Vendas

Sistema de vendas completo que roda direto no navegador, sem servidor e sem instalação. Os dados ficam salvos no próprio navegador (localStorage).   https://stanlleyzagath.github.io/sistema-de-vendas/

## O que tem

- **PDV (caixa):** carrinho, desconto em % com o valor em reais ao lado, frete, cálculo de troco no dinheiro, venda a prazo (fiado) em parcelas e recibo para imprimir.
- **Vendas e pedidos:** histórico com filtros, confirmação de pedidos (baixa o estoque), cancelamento e exportação em CSV.
- **A receber:** parcelas do fiado, atrasos e baixa de pagamentos.
- **Produtos e estoque:** várias fotos por produto, categorias, markup e margem de lucro calculados, estoque mínimo e filtros.
- **Clientes** e **Funil de vendas (CRM)** com cartões arrastáveis.
- **Painel:** mês atual, outros meses ou total geral.
- **Relatórios:** mensal, trimestral, semestral, anual e personalizado.
- **Usuários:** login com perfis de administrador e vendedor, e comissão por vendedor.
- **Catálogo online:** gera um arquivo `catalogo.html` com vitrine, galeria de fotos e sacola. O pedido do cliente chega pelo WhatsApp e pode ser importado para o sistema.
- Interface com efeito de vidro, modo claro e escuro, e layout para celular.

## Como usar

1. Baixe ou clone o repositório.
2. Abra o `index.html` no navegador.
3. Primeiro acesso: usuário `admin`, senha `admin` (o sistema pede para trocar a senha). O sistema começa vazio: cadastre categorias, produtos e clientes.

Ou rode um servidor local, se preferir:

```bash
npx http-server -p 8765
```

## Catálogo online

1. Em **Catálogo online**, informe o nome da loja, o WhatsApp e a cor.
2. Clique em **Baixar catalogo.html**.
3. Publique o arquivo de graça (Netlify Drop, GitHub Pages ou Cloudflare Pages).
4. Quando chegar um pedido no WhatsApp, cole a mensagem em **Importar pedido**.

O catálogo mostra o estoque do momento em que foi gerado. Gere e publique de novo quando mudar preços ou estoque.

## Avisos

- Os dados ficam só no navegador deste computador. Use **Backup** no menu com frequência.
- O login protege o acesso na tela, mas não é segurança contra quem tem acesso técnico à máquina.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Visual (vidro, claro/escuro, celular) |
| `app.js` | Toda a lógica do sistema |
| `catalog.js` | Modelo do catálogo público gerado |

## Instalar no celular (PWA)

O sistema pode ser instalado como app, mas precisa estar publicado num endereço **https** (Netlify Drop, Cloudflare Pages, GitHub Pages). Pelo arquivo local ou `localhost` não instala no celular.

- **Android (Chrome):** abra o link, menu ⋮ → **Instalar app** (ou o botão "Instalar app" no menu Conta do sistema).
- **iPhone (Safari):** **Compartilhar** → **Adicionar à Tela de Início**.

Os dados ficam no navegador de cada aparelho. Para levar do computador ao celular, use **Backup** e **Restaurar**.

## Importar NF-e

Em **Produtos e estoque → Importar NF-e**, escolha o XML da nota de compra. Os itens iguais (por código ou nome) são somados ao estoque, e os novos viram produtos com preço = custo + margem. Uma nota já importada vem marcada como "Ignorar" para não duplicar o estoque.

## Nuvem com Firebase (opcional)

Sem configuração, os dados ficam só no navegador. Com o Firebase, PC e celular veem os mesmos dados, vários vendedores usam ao mesmo tempo e há backup automático. Plano gratuito (Spark) é suficiente para uma loja pequena.

1. Em [console.firebase.google.com](https://console.firebase.google.com) crie um projeto.
2. **Build → Authentication → Começar → E-mail/senha** (ativar).
3. **Build → Firestore Database → Criar banco** (modo produção, região `southamerica-east1`).
4. Aba **Regras** do Firestore: cole o conteúdo de `firestore.rules` e publique.
5. **Configurações do projeto → Seus apps → Web (`</>`)**: registre o app e copie o `firebaseConfig`.
6. Cole a configuração em `firebase-config.js` (troque o `null`) e publique o site em https.
7. Em **Authentication → Configurações → Domínios autorizados**, adicione o domínio onde o site está publicado.
8. Abra o site: a primeira tela pede para **criar o administrador** (faça isso logo, antes de divulgar o link). Se houver dados salvos no aparelho, o sistema oferece enviá-los para a nuvem.

Depois, em **Usuários**, o administrador cria o acesso dos vendedores (e-mail e senha inicial). Quem esquecer a senha usa "Esqueci a senha" na tela de entrada.

Observações: a numeração das vendas pode repetir se dois aparelhos venderem no mesmo segundo; duas pessoas editando o mesmo produto ao mesmo tempo ficam com a última alteração; cada produto aceita até cerca de 1 MB de fotos.
