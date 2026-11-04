# Estudar+ ENEM

Projeto de estudos feito com HTML, CSS e JavaScript puro.

## Como abrir

1. Extraia o arquivo ZIP.
2. Abra a pasta `estudar_mais_enem` no VS Code.
3. Abra `index.html` com a extensão Live Server (ou abra o arquivo diretamente no navegador).
4. Não é necessário `npm install`, `npm run dev` ou `package.json`.

## Funcionalidades

- Página inicial com resumo de favoritos, redações e questões respondidas.
- Banco de questões da API ENEM por área e ano (2009 a 2023).
- Filtro de idioma em Linguagens (inglês ou espanhol).
- Paginação de resultados na tela.
- Favoritar questões e consultar a lista de favoritas.
- Conferir o gabarito de cada questão.
- Temas de redações anteriores e editor com salvamento local.
- Dados pessoais do estudo salvos no `localStorage` do navegador.

## Integração com a API

Endpoint: `https://api.enem.dev/v1/exams/{ano}/questions`

A API documenta os parâmetros `limit`, `offset` e `language`. O projeto usa `limit=50` por requisição e percorre as páginas disponíveis usando `metadata.hasMore` e `metadata.total`. A filtragem por área é feita no navegador usando o campo `discipline` retornado em cada questão.

A API é um serviço externo. Se ela estiver fora do ar, limitar requisições ou a conexão estiver indisponível, o banco de questões não poderá carregar até o serviço voltar.

## Estrutura

- `index.html`: estrutura das páginas.
- `css/style.css`: visual e responsividade.
- `js/app.js`: API, filtros, favoritos, redações e navegação.
