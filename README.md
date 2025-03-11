# UDP Networking

Este projeto implementa uma rede básica usando UDP para fins acadêmicos. Ele fornece um modelo simples de servidor-cliente em Node.js, onde o cliente envia pacotes para o servidor, e o servidor processa os dados recebidos.

## Configuração

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor**:
   ```bash
   node server.js
   ```

3. **Enviar pacotes com o cliente**:
   ```bash
   node client.js
   ```

## Arquivos

- `server.js`: Implementação do servidor UDP.
- `client.js`: Cliente UDP que envia dados ao servidor.
- `types.js`: Define a estrutura dos pacotes.
