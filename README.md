
# NARA - Nova Assistente Residencial Automatizada

> **Assistente virtual para suporte e automação em condomínios** 🏢✨

NARA é uma assistente residencial automatizada criada para oferecer suporte e praticidade na gestão de condomínios. Utilizando integração com o WhatsApp e automação para o gerenciamento de tags veiculares, dúvidas e outras funcionalidades, a NARA visa simplificar a comunicação e facilitar o dia a dia dos moradores e da administração do condomínio.

## ✨ Funcionalidades

- **Ativação de TAG Veicular** 🚗:
  - Fluxo guiado para coleta de informações sobre o veículo (CPF, placa, marca, modelo e cor) e envio de fotos.
  - Confirmação e verificação de dados.
  - Notificação sobre a ativação em até 24 horas.

- **Outras Dúvidas** 🤔:
  - Oferece uma forma rápida de contato com o zelador e as síndicas para suporte adicional.
  
- **Controle de Conversas** 🗣️:
  - Fluxo automático e humanizado de mensagens.
  - Opção para encerrar a conversa a qualquer momento.

## 🚀 Tecnologias Utilizadas

- **Node.js** - Back-end e servidor principal.
- **Venom-Bot** - Biblioteca para integração com o WhatsApp.
- **Firebird** - Banco de dados utilizado para validação de informações do condomínio.
- **Axios** - Chamadas à API da FIPE para obtenção de dados veiculares.
- **TypeScript** - Para tipagem estática e maior robustez do código.

## 🗂 Estrutura de Pastas

```
src
 | - app
 |      | - services          # Lógica de serviços e comunicação com banco de dados
 |      | - controllers       # Funções de controle e rotas
 | - config                   # Configurações do projeto e variáveis de ambiente
 | - tokens                   # Tokens de integração com a API da FIPE
 | index.ts                   # Arquivo de inicialização do servidor
```

## 📝 Pré-requisitos

- **Node.js** (versão 14 ou superior)
- **Banco de Dados Firebird**
- **Conta de WhatsApp ativa**
  
### Instalação

1. **Clone o repositório**:

   ```bash
   git clone https://github.com/seu-usuario/nara-assistente.git
   cd nara-assistente
   ```

2. **Instale as dependências**:

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**:

   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

   ```env
   FIREBIRD_HOST=your_host
   FIREBIRD_DATABASE=your_database
   FIREBIRD_USER=your_user
   FIREBIRD_PASSWORD=your_password
   ```

4. **Inicie o projeto**:

   ```bash
   npm run dev
   ```

5. **Configuração do WhatsApp**:

   Siga as instruções do Venom-Bot para autenticar a conta do WhatsApp.

## 📚 Uso

### Comandos Principais

- **Ativação de TAG Veicular**: Envie "1" para iniciar o fluxo de ativação de uma TAG para veículos.
- **Outras Dúvidas**: Envie "2" para obter ajuda adicional e contatos.
- **Encerrar Conversa**: Digite "FIM" ou "CANCELAR" a qualquer momento.

## 📈 Fluxo de Conversa

1. **Início**: A NARA dá boas-vindas e exibe o menu de opções.
2. **Seleção de Opções**: O usuário escolhe entre ativar uma TAG ou solicitar ajuda.
3. **Validação e Coleta de Dados**: Em caso de ativação de TAG, o usuário é guiado pelo preenchimento de dados como CPF, número da TAG, placa do veículo, marca, modelo e cor.
4. **Envio de Fotos**: O usuário envia fotos para confirmação visual.
5. **Finalização**: NARA informa que o processo será concluído em até 24 horas.

## 🤖 Exemplo de Mensagem

> 🌟 Olá, bem-vindo(a)! Eu sou a NARA, sua Nova Assistente Residencial Automatizada! 🏢✨ Estou aqui para tornar sua vida no condomínio mais prática e ajudar sempre que precisar! 😊

---

> Digite "1" para Ativar TAG Veicular ou "2" para Outras Dúvidas

## 📌 Contribuições

Contribuições são sempre bem-vindas! Sinta-se à vontade para enviar um *pull request* ou abrir uma *issue* para sugestões.

## 📞 Suporte

Para suporte, entre em contato pelo WhatsApp: +55 (17) 99117-7496.

---

*© 2024 NARA - Assistente Residencial Automatizada*
