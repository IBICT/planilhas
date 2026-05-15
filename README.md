<div align="center">
  <img src="logo.png" alt="Planilhas logo" width="128" />

  # Planilhas

  **Visualize arquivos CSV, XLS e XLSX diretamente no VS Code — sem abrir o Excel ou LibreOffice.**

  [![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.70.0-007ACC?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com/)
  [![Licença](https://img.shields.io/badge/licen%C3%A7a-Apache%202.0-blue?style=flat-square)](LICENSE)
  [![Publisher](https://img.shields.io/badge/publisher-ibict-green?style=flat-square)](https://marketplace.visualstudio.com/publishers/ibict)
</div>

---

## Sobre

**Planilhas** é uma extensão para o Visual Studio Code que adiciona um editor visual para arquivos de planilha. Ao abrir um arquivo `.csv`, `.xls` ou `.xlsx`, a extensão renderiza uma grade interativa e navegável, sem precisar de softwares externos.

Ideal para quem trabalha com dados diretamente no VS Code e precisa inspecionar planilhas com rapidez.

---

## Funcionalidades

- Abre arquivos **CSV**, **XLS** e **XLSX** com um clique
- Renderização em grade interativa com rolagem e seleção de células
- Integração nativa com o sistema de editores customizados do VS Code
- Leve e sem dependências externas em tempo de execução

---

## Como usar

1. Instale a extensão pelo Marketplace do VS Code ou via arquivo `.vsix`
2. Abra qualquer arquivo `.csv`, `.xls` ou `.xlsx` no explorador de arquivos
3. O VS Code abrirá automaticamente o **Planilhas Viewer**

> Se o VS Code usar outro editor padrão, clique com o botão direito no arquivo e escolha **"Abrir com... → Planilhas Viewer"**.

---

## Formatos suportados

| Formato | Suporte |
|---------|---------|
| `.csv`  | Completo |
| `.xls`  | Completo |
| `.xlsx` | Completo |

---

## Desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [VS Code](https://code.visualstudio.com/) 1.70 ou superior

### Instalação

```bash
git clone https://github.com/ibict/planilhas.git
cd planilhas
npm install
```

### Compilar

```bash
npm run build
```

### Modo desenvolvimento (watch)

```bash
npm run watch
```

Pressione `F5` no VS Code para abrir uma janela de extensão em desenvolvimento.

### Gerar pacote `.vsix`

```bash
npm run package
```

O arquivo será gerado na pasta `build/`.

---

## Tecnologias

| Pacote | Uso |
|--------|-----|
| [x-data-spreadsheet](https://github.com/myliang/x-spreadsheet) | Componente de grade interativa |
| [SheetJS (xlsx)](https://sheetjs.com/) | Leitura de arquivos XLS e XLSX |
| [esbuild](https://esbuild.github.io/) | Bundling rápido do código TypeScript |

---

## Licença

Distribuído sob a licença **Apache 2.0**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  Desenvolvido por <a href="https://www.ibict.br">IBICT</a>
</div>
