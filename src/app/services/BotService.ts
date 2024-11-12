import { create, Message, Whatsapp } from 'venom-bot';
import { venomConfig } from '../../config/VenonConfig';
import vehicleModels from '../../config/vehicleModels.json';
import { findUserByCPF, grantVehicleAccess, isTagOrPlateDuplicate } from './FirebirdService';
import mime from 'mime-types';
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

const commonColors = ["Preto", "Chumbo", "Cinza", "Prata", "Branco", "Bege", "Amarelo", "Vermelho", "Azul", "Verde", "Outra"];
const chatList: MessageData[] = [];
let tagList: TAG[] = [];

interface MessageData {
    id: string;
    body: string;
    type: string;
    t: number;
    notifyName: string;
    isNewMsg: boolean;
    sender: {
        id: string;
        pushname: string;
        isUser: boolean;
    };
    status?: string;
}

interface TAG {
    id: string;
    cpf: string;
    number: string;
    vehicle: {
        plate: string;
        brand: string;
        model: string;
        color: string;
    }
    tagPhoto: Buffer | null;    
    vehiclePhoto: Buffer | null;
    status: string;
    t: number;
}

let session: Whatsapp;

async function initializeBot() {
    return create(venomConfig)
        .then(async (client: Whatsapp) => {
            await handleClientMessage(client)
            await adjustLocalStorage(client);
        })
        .catch((error) => console.error('Erro ao criar o bot:', error));
}

async function adjustLocalStorage(client: Whatsapp) {
    try {
        // Acesse a página do navegador controlada pelo Venom-Bot
        await client.page.evaluate(() => {
            // Altera o valor de WALangPhonePref ou remove conforme desejado
            localStorage.setItem('WALangPhonePref', 'en_US'); 
            localStorage.setItem('WALangPrefDidMismatchWithCookie', 'false'); 
            // Para remover, use:
            // localStorage.removeItem('WALangPhonePref');
        });
        console.log("Configuração do localStorage ajustada.");
    } catch (error) {
        console.error("Erro ao ajustar o localStorage:", error);
    }
}

async function handleClientMessage(client: Whatsapp) {
    session = client;

    session.onMessage(async (message) => {

        const messageBody = String(message.body)

        if (messageBody.length > 0) {
            const userInput = message.body.trim().toLowerCase();
            const existMessage = chatList.find((msg) => msg.id === message.from);

            if (!existMessage) {
                await initiateConversation(message);

            } else {
                const inactiveTimeExceeded = (Date.now() - existMessage.t) > (10 * 60 * 1000) || existMessage.status === 'end';

                if (inactiveTimeExceeded) {
                    await resetConversation(existMessage, message);

                } else if (userInput === "fim" || userInput === "cancelar") {
                    await endConversation(existMessage);

                } else if (existMessage.status === 'tag') {
                    await handleTagActivation(existMessage, message);

                } else {
                    await handleMenuSelection(existMessage, message);
                }
            }
        }
    });
}

// Função para iniciar uma nova conversa
async function initiateConversation(message: Message) {
    storeUserMessage(message, "new");
    await sendGreetingMessage(message.from);
    await session.sendText(
        message.from,
        'Olha, aqui é muito fácil, basta responder com o número da opção desejada, eu vou cuidar do resto.\nSe desejar encerrar essa conversa, basta digitar a palavra FIM a qualquer momento.'
    );
    await sendOptionsMenu(message.from);
}

// Função para resetar uma conversa inativa ou encerrada
async function resetConversation(chatItem: MessageData, message: Message) {
     
    // Remove o TAG da lista
    removeTagsById(chatItem.id)
    
    storeUserMessage(message, "menu");
    
    await session.sendText(
        chatItem.id,
        'Olá novamente! Fico feliz por voltar a conversar com você.\n Lembre-se é só responder com o número da opção desejada, eu vou cuidar do resto.\nSe desejar encerrar essa conversa, basta digitar a palavra FIM a qualquer momento.'
    );

    await sendOptionsMenu(chatItem.id);
}

// Armazena as mensagens recebidas com timestamp ajustado
function storeUserMessage(message: Message, status?: string) {
    const existingMessageIndex = chatList.findIndex((msg) => msg.id === message.from);
    const messageTimestamp = message.t || message.timestamp;
    const timestampInMilliseconds = messageTimestamp < 1e12 ? messageTimestamp * 1000 : messageTimestamp;

    const userMessage: MessageData = {
        id: message.from,
        body: message.body,
        type: message.type,
        t: timestampInMilliseconds || Date.now(),
        notifyName: message.notifyName,
        isNewMsg: message.isNewMsg,
        sender: {
            id: message.sender.id,
            pushname: message.sender.pushname || 'Usuário',
            isUser: message.sender.isUser,
        },
        status,
    };

    if (existingMessageIndex > -1) {
        chatList[existingMessageIndex] = userMessage;
    } else {
        chatList.push(userMessage);
    }
}

// Função para enviar uma mensagem de boas-vindas	
async function sendGreetingMessage(sendTo: string) {
    const greetingMessage = '*🏢 Olá, bem-vindo(a)! ✨*\nEu sou a NARA, sua Assistente Residencial Virtual!\nEstou aqui para facilitar a sua vida no condomínio e ajudar no que precisar. 😊';
    await session.sendText(sendTo, greetingMessage);
}

async function sendOptionsMenu(sendTo: string) {
    const optionsMessage = `*Vamos começar? Escolha uma das opções abaixo:*\n\n*[ 1 ]* - Ativar TAG veicular\n*[ 2 ]* - Outras dúvidas`;
    await session.sendText(sendTo, optionsMessage);
    await session.sendText(sendTo, "Digite apenas o número da opção desejada. Vou cuidar do resto!");
}

// Função para tratar a seleção de menu
async function handleMenuSelection(chatItem: MessageData, message: Message) {
    const userInput = message.body.trim().toLowerCase();

    switch (userInput) {
        case '1':
            chatItem.status = "tag";
            await handleTagActivation(chatItem, message);
            break;
        case '2':
            chatItem.status = "other";
            await handleOtherInquiries(chatItem);
            break;
        default:
            await session.sendText(chatItem.id, 'Ops! Essa opção não existe. Tente novamente digitando o número correto. 😉');
    }
}

// Função para ativação de TAG
async function handleTagActivation(chatItem: MessageData, message: Message) {
    let existTag = tagList.find((tag) => tag.id === message.from);

    if (!existTag) {
        const newTag: TAG = {
            id: message.from,
            cpf: '',
            number: '',
            vehicle: { plate: '', brand: '', model: '', color: '' },
            tagPhoto: null,
            vehiclePhoto: null,
            status: 'tag0',
            t: Date.now(),
        };
        tagList.push(newTag);
        existTag = newTag;
    }

    storeUserMessage(message, "tag");

    switch (existTag.status) {
        case "tag0":
            await startTAGRegister(existTag, message);
            break;

        case "tag1":
            await validateAndStoreCPF(existTag, message);
            break;

        case "tag2":
            await confirmCPF(existTag, message);
            break;

        case "tag3":
            await validateAndStoreTagNumber(existTag, message);
            break;

        case "tag4":
            await validateAndStoreVehiclePlate(existTag, message);
            break;

        case "tag5":
            await selectVehicleBrand(existTag, message);
            break;

        case "tag6":
            await selectVehicleModel(existTag, message);
            break;

        case "tag7":
            await selectVehicleColor(existTag, message);
            break;

        case "tag8":
            await confirmVehicleData(existTag, message);
            break;

        case "tag9":
            await requestTagPhoto(existTag, message);
            break;

        case "tag10":
            await requestVehiclePhoto(chatItem, existTag, message);
            break;

        default:
            await restartProcess(message, existTag);
            break;
    }
}

async function startTAGRegister(existTag: TAG, message: Message) {
    await session.sendText(message.from, "Vamos nessa! Primeiro, me diga o CPF que será vinculado à TAG.");
    existTag.status = "tag1";
}


// Subfunções de cada passo do fluxo de ativação de TAG
async function validateAndStoreCPF(existTag: TAG, message: Message) {
    const cpf = message.body.replace(/\D/g, "");
    if (/^\d{11}$/.test(cpf)) {

        const cpfExists = await findUserByCPF(cpf);

        if (cpfExists && cpfExists.CLASSIFICACAO != 99) {
            await session.sendText(message.from, `Ótimo, parece que encontrei o CPF!\nO registro é de:\n*${cpfExists.NOME}*\nEssa informação esta correta ?\n\n*[ 1 ]* - Sim\n*[ 2 ]* - Não`);
            existTag.status = "tag2";
            existTag.cpf = cpf;
        } else {
            await session.sendText(message.from, "Hmm...não achei o CPF. Vamos tentar de novo?");
        }
    } else {
        await session.sendText(message.from, "Parece que o CPF está incorreto. Por favor, me envie os 11 dígitos sem pontos ou traços.");
    }
}

// Confirmar CPF
async function confirmCPF(existTag: TAG, message: Message) {
    if (message.body.toLowerCase() === "1") {
        await session.sendText(message.from, "Perfeito! Agora me passe o número da TAG (precisa ter 10 dígitos).");
        existTag.status = "tag3";
    } else {
        await session.sendText(message.from, "Entendido! Por favor, vamos tentar com o CPF novamente.");
        existTag.status = "tag1";
    }
}

// Validar e armazenar o número da TAG
async function validateAndStoreTagNumber(existTag: TAG, message: Message) {
    const tagNumber = message.body.trim();
    if (/^\d{10}$/.test(tagNumber)) {
        existTag.number = tagNumber;
        await session.sendText(message.from, "Agora informe a placa do veículo (ex: XXX1234 ou XXX1X23).");
        existTag.status = "tag4";
    } else {
        await session.sendText(message.from, "Ops! O número da TAG precisa ter exatamente 10 dígitos. Tente novamente.");
    }
}

// Validar e armazenar a placa do veículo
async function validateAndStoreVehiclePlate(existTag: TAG, message: Message) {
    const vehiclePlate = message.body.trim().toUpperCase();
    // Atualiza a expressão regular para aceitar os formatos antigos (AAA0000) e novos (AAA0A00)
    if (/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(vehiclePlate)) {
        existTag.vehicle.plate = vehiclePlate;
        const brandsList = Object.keys(vehicleModels).map((brand, index) => `*[ ${index + 1} ]* - ${brand}`).join('\n');
        await session.sendText(message.from, `Escolha a marca do carro na lista:\n${brandsList}`);
        existTag.status = "tag5";
    } else {
        await session.sendText(message.from, "Formato de placa inválido. Por favor, informe novamente (ex: ABC1234 ou ABC1D23).");
    }
}

// Selecionar marca do veículo
async function selectVehicleBrand(existTag: TAG, message: Message) {
    const brandIndex = parseInt(message.body) - 1;
    const brandName = Object.keys(vehicleModels)[brandIndex];
    if (brandName) {
        existTag.vehicle.brand = brandName;
        const modelsList = (vehicleModels as any)[brandName]
            .map((model: any, index: number) => `*[ ${index + 1} ]* - ${model}`)
            .join('\n');
        await session.sendText(message.from, `Qual é o modelo do seu carro?\n${modelsList}`);
        existTag.status = "tag6";
    } else {
        await session.sendText(message.from, "Não encontrei essa opção. Vamos tentar de novo?");
    }
}

// Selecionar modelo do veículo
async function selectVehicleModel(existTag: TAG, message: Message) {
    const modelIndex = parseInt(message.body) - 1;
    const modelName = (vehicleModels as any)[existTag.vehicle.brand][modelIndex];
    if (modelName) {
        existTag.vehicle.model = modelName;
        const colorsList = commonColors.map((color, index) => `*[ ${index + 1} ]* - ${color}`).join('\n');
        await session.sendText(message.from, `E agora, qual é a cor do carro?\n${colorsList}`);
        existTag.status = "tag7";
    } else {
        await session.sendText(message.from, "Não consegui identificar o modelo. Vamos tentar novamente?");
    }
}

// Selecionar cor do veículo
async function selectVehicleColor(existTag: TAG, message: Message) {
    const colorIndex = parseInt(message.body) - 1;
    const color = commonColors[colorIndex];
    if (color) {
        existTag.vehicle.color = color;
        await session.sendText(
            message.from,
            `Tudo certo! Vamos conferir os dados antes de finalizar:\n\n🚗 CPF: ${existTag.cpf}\n🏷 TAG: ${existTag.number}\n🔖 Placa: ${existTag.vehicle.plate}\n🚘 Marca: ${existTag.vehicle.brand}\n📌 Modelo: ${existTag.vehicle.model}\n🎨 Cor: ${existTag.vehicle.color}\n\nEstá tudo correto? Digite *SIM* para confirmar ou corrija qualquer informação antes de prosseguir.`
        );
        existTag.status = "tag8";
    } else {
        await session.sendText(message.from, "Hum, não entendi essa cor. Vamos tentar de novo? Escolha uma cor da lista!");
    }
}

// Confirma dados do veículo
async function confirmVehicleData(existTag: TAG, message: Message) {
    if (message.body.toLowerCase() === "sim") {
        // Verifica se o TAG ou a placa já estão cadastrados
        const isDuplicate = await isTagOrPlateDuplicate(existTag.number, existTag.vehicle.plate);

        if (isDuplicate) {
            await session.sendText(
                message.from,
                "Ops! Parece que o número da TAG ou a placa informada já estão cadastrados. Se você tiver certeza dos dados, por favor, entre em contato com a administração para verificar. Caso contrário, você pode corrigir e recomeçar o processo."
            );
            // Reinicia o processo desde o início, se necessário

            // Remove o TAG da lista
            removeTagsById(existTag.id)

            existTag.status = "tag0";
            await startTAGRegister(existTag, message);
        } else {
            await session.sendText(
                message.from,
                "Perfeito! Agora, vou precisar que tire uma foto da TAG já instalada no carro para eu registrar."
            );
            existTag.status = "tag9";
        }
    } else {
        await session.sendText(
            message.from,
            "Certo, vamos apagar tudo e começar novamente, com calma dessa vez. 😊"
        );
        existTag.status = "tag0";
        await startTAGRegister(existTag, message);
    }
}


async function downloadAndResizeImage(client: Whatsapp, message: Message): Promise<Buffer | null> {
    try {
        // Baixa e decodifica o arquivo diretamente para um buffer
        const buffer = await client.decryptFile(message);

        // Redimensiona e faz o crop centralizado para 720x720
        const resizedBuffer = await sharp(buffer)
            .resize(720, 720, {
                fit: sharp.fit.cover, // Redimensiona com crop para um quadrado
                position: sharp.strategy.entropy, // Centraliza na área de maior "interesse" (usando entropia)
            })
            .toBuffer();

        return resizedBuffer;
    } catch (error) {
        console.error("Erro ao redimensionar a imagem:", error);
        return null;
    }
}

// Tirar foto da TAG
async function requestTagPhoto(existTag: TAG, message: Message) {
    if (message.type === "image" && message.body) {
        const imageData = await downloadAndResizeImage(session, message);
        if (imageData) {
            existTag.tagPhoto = imageData; // Salva a foto da TAG em alta resolução (Base64)
            await session.sendText(
                message.from,
                "Quase lá! Agora, eu preciso de uma foto do carro de frente, com a placa bem visível. Assim conseguimos validar tudo direitinho!"
            );
            existTag.status = "tag10";
        } else {
            await session.sendText(
                message.from,
                "Não consegui baixar a imagem. Por favor, envie novamente uma foto da TAG instalada no carro."
            );
        }
    } else {
        await session.sendText(
            message.from,
            "Parece que não recebi uma foto. Por favor, envie uma imagem da TAG instalada no carro."
        );
    }
}

// Tirar foto do veículo
async function requestVehiclePhoto(chatItem: MessageData, existTag: TAG, message: Message) {
    if (message.type === "image" && message.body) {
        const imageData = await downloadAndResizeImage(session, message);
        if (imageData) {
            existTag.vehiclePhoto = imageData; // Salva a foto do veículo em alta resolução (Base64)
            existTag.status = "finalizing";
            await finalizeProcess(chatItem, existTag);
        } else {
            await session.sendText(
                message.from,
                "Não consegui baixar a imagem. Por favor, envie uma foto do carro de frente com a placa visível."
            );
        }
    } else {
        await session.sendText(
            message.from,
            "Não recebi uma imagem. Envie uma foto do carro de frente com a placa visível."
        );
    }
}

// Finalizar processo
async function finalizeProcess(chatItem: MessageData, existTag: TAG) {
    const success = await grantVehicleAccess(
        existTag.cpf,
        existTag.number,
        existTag.vehicle.plate,
        existTag.vehicle.brand,
        existTag.vehicle.model,
        existTag.vehicle.color,
        existTag.tagPhoto,       
        existTag.vehiclePhoto
    );

    if (success) {
        await session.sendText(
            chatItem.id,
            "Prontinho! 🥳 O processo foi concluído com sucesso e a sua TAG será ativada em até 24 horas. Obrigado por sua paciência!"
        );
    } else {
        await session.sendText(
            chatItem.id,
            "Ocorreu um erro ao tentar concluir o processo. Por favor, entre em contato com o suporte."
        );
    }

    await endConversation(chatItem, existTag);
}

// Outras dúvidas
async function handleOtherInquiries(chatItem: MessageData) {
    const contactMessage = `No momento, ainda estou sendo treinada para responder a novas dúvidas 🙈. Mas fique tranquilo! Você pode entrar em contato diretamente com:\n\n👷‍♂️ *Zelador*: 17991177496\n👩‍💼 *Síndicas*: 17992538226\n\nEles vão te ajudar com o que precisar! 😊`;
    await session.sendText(chatItem.id, contactMessage);
    await endConversation(chatItem);
}

// Finalizar conversa
async function endConversation(chatItem: MessageData, existTag?: TAG) {
    // Evita encerrar novamente se a conversa já está marcada como 'end'
    if (chatItem.status === 'end') return;

    // Remove o TAG da lista
    removeTagsById(chatItem.id)
        
    // Envia uma mensagem de despedida
    const farewellMessage = 'Foi um prazer ajudar! 😊 Se precisar novamente, estou sempre aqui. Até logo! 👋';
    await session.sendText(chatItem.id, farewellMessage);

    // Atualiza o status do chat para 'end'
    chatItem.status = 'end';
}

// Reiniciar processo
async function restartProcess(message: Message, existTag: TAG) {
    await session.sendText(message.from, "Parece que houve um probleminha. Vamos recomeçar do início, tudo bem?");
    await session.sendText(message.from, "Para isso, por favor, informe novamente o CPF que será vinculado à TAG.");
    existTag.status = "tag1";
}

// Função para remover todas as entradas de TAG com o mesmo ID
function removeTagsById(id: string) {
    tagList = tagList.filter(tag => tag.id !== id);
}

// Função para obter a lista de chats
function getChatList(): MessageData[] {
    return chatList;
}

export { initializeBot, getChatList };
