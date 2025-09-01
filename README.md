# Projeto: Almoxarifado Virtual - Atacado São Paulo

## Visão Geral

Este é o repositório do protótipo full-stack do sistema de "Almoxarifado Virtual", desenvolvido para a empresa Bravo, atendendo ao cliente Atacado São Paulo. A aplicação consiste em um frontend moderno em React e uma API robusta em Node.js que se conecta a um banco de dados Oracle.

---

## Link de acesso

https://www.atacadosaopaulo.com.br/almoxarifadovirtual

---

## Tecnologias Utilizadas

### Frontend (Pasta `project`)
- **Framework:** React com Vite
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Roteamento:** React Router DOM
- **Servidor de Produção:** Node.js com Express e `http-proxy-middleware`

### Backend (Pasta `api`)
- **Framework:** Node.js com Express
- **Linguagem:** TypeScript
- **Banco de Dados:** Conexão com OracleDB
- **Gerenciamento de Processos:** PM2

---

## Arquitetura de Deploy (Servidor Windows TS)

A aplicação é implantada no Terminal Server do cliente usando uma arquitetura de dois serviços independentes para garantir segurança e escalabilidade:

1.  **Portal (Frontend - Porta 2083):**
    * Um servidor Node.js/Express serve os arquivos estáticos do React (gerados com `npm run build`).
    * Atua como um **Proxy Reverso**: todas as requisições que começam com `/api` são encaminhadas internamente para o serviço de API.
    * A porta `2083` é a única exposta para acesso externo, configurada por redirecionamento no servidor do cliente.

2.  **API (Backend - Porta 8888):**
    * A API Express que lida com a lógica de negócios e a comunicação com o banco de dados Oracle.
    * Roda em uma porta interna (`8888`) e só é acessível a partir do próprio servidor (`localhost`), garantindo que a lógica de dados fique isolada e segura.

Ambos os serviços são gerenciados e mantidos online de forma persistente pelo **PM2**.

---

## Como Rodar o Ambiente de Produção (no Servidor TS)

Certifique-se de que o **Node.js** e o **PM2** (`npm install -g pm2`) estejam instalados.

1.  **Iniciar a API (Backend):**
    ```bash
    cd api
    npm run build # Apenas se houver alterações no código .ts
    npm run start
    ```

2.  **Iniciar o Portal (Frontend):**
    ```bash
    cd project
    npm run build # Apenas se houver alterações no código .tsx
    npm run start
    ```

3.  **Para gerenciar os processos:**
    * `pm2 list` ou `npm run list` (em qualquer uma das pastas) para ver o status.
    * `npm run stop` e `npm run logs` também estão disponíveis em cada pasta.

## Como Rodar em Modo de Desenvolvimento

1.  **Iniciar a API:**
    ```bash
    cd api
    npm run dev
    ```

2.  **Iniciar o Frontend:**
    ```bash
    cd project
    npm run dev
    ```