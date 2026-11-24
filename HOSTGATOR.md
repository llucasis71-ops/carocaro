# Publicar o Conta Comigo na HostGator

O app é um site estático: só arquivos (HTML, JS e imagens), sem Node nem banco de dados.
Funciona em qualquer plano de hospedagem compartilhada com cPanel.

## 1. Gerar o pacote

```bash
npm install
npm run pacote
```

Isso cria o arquivo `conta-comigo-hostgator.zip` com o conteúdo da pasta `dist/`.

## 2. Escolher onde o app vai ficar

| Opção | Pasta no cPanel | Endereço |
|---|---|---|
| Domínio principal (só se não houver outro site nele) | `public_html/` | `https://seudominio.com.br` |
| Subpasta | `public_html/contacomigo/` | `https://seudominio.com.br/contacomigo` |
| Subdomínio (recomendado) | a pasta que o cPanel cria para o subdomínio | `https://app.seudominio.com.br` |

> ⚠️ Se já existe um site (WordPress, por exemplo) no domínio principal, **não** extraia na
> `public_html/`: o `.htaccess` do app substituiria o do WordPress. Use uma subpasta ou um subdomínio.

Para criar um subdomínio: cPanel → **Domínios** (ou **Subdomínios**) → criar `app` → anote a pasta raiz.

## 3. Enviar os arquivos

1. cPanel → **Gerenciador de Arquivos** → entre na pasta escolhida.
2. **Carregar** → envie `conta-comigo-hostgator.zip`.
3. Clique com o botão direito no zip → **Extrair** → extraia na própria pasta.
4. Apague o zip.
5. Em **Configurações** (canto superior direito), marque **Mostrar arquivos ocultos** e confira que o
   `.htaccess` está lá, junto com `index.html`, `sw.js`, `manifest.webmanifest` e as pastas
   `assets/` e `capi/`.

## 4. Ativar o HTTPS (obrigatório)

cPanel → **SSL/TLS Status** → selecione o domínio ou subdomínio → **Run AutoSSL**.
Sem HTTPS, o celular não oferece "Instalar app" e a voz pode não funcionar.
O `.htaccess` já redireciona `http://` para `https://`.

## 5. Testar

- Abra o endereço: deve aparecer a página de apresentação.
- Toque em **Começar grátis**: abre o app (`.../#/app`).
- No Chrome do Android: menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.
  No iPhone (Safari): Compartilhar → **Adicionar à Tela de Início**.

## 6. Atualizar depois

Gere um zip novo, envie e extraia por cima (substituindo). Pode apagar antes a pasta `assets/` antiga
para não acumular arquivos. Quem já instalou recebe a versão nova ao abrir o app (às vezes na segunda abertura).

## Observações

- O progresso de cada criança fica salvo no próprio aparelho (no navegador), não no servidor.
- O `ads.txt` continua incluído na raiz do pacote.
