import udp from "dgram";
import { REQ_TYPES } from "./types.js";
import {readFileSync} from 'fs'
const client = udp.createSocket("udp4"); // Cria socket usando IPV4
const PORT = 7788;

let JANELA_ENVIO = 4;
const SSTHRESH = 16; // Limiar de Slow Start Threshold
let isSlowStart = true; // Flag para indicar se está no modo de Slow Start
const TIMEOUT = 2000; // Intervalo de tempo para timeout (em milissegundos)
let timeout; // Referência para o objeto de timeout
let isCongestionAvoidance = false; // Flag para indicar se está no modo de Congestion Avoidance
let dupAcks = 0; // Contador de ACKs duplicados
let pacotesEnviados = 0;
let pacotesConfirmados = 0;
let pacotesNConfirmados = 0;
let numSequencia = 0
let bufferRemetente = []; // Buffer do remetente
const tamanhoPacote = 1024 //Bytes
const controle = true // Ativa controle de congestionamento

async function envio(numPacote, conteudo) {
  numSequencia = numPacote;

  const message = {
    numero: numPacote,
    body: conteudo.toString(),
    tipo: REQ_TYPES.REQ,
  };

  const pacote = Buffer.from(JSON.stringify(message));
  bufferRemetente.push({ pacote, numPacote, confirmado: false });

  const sendPacket = () => {
    client.send(pacote, 0, pacote.length, PORT, "localhost", (error) => {
      if (error) {
        console.log(error);
      } else {
        pacotesEnviados++;
        pacotesNConfirmados++;
        console.log("Pacote enviado:", numPacote);
      }
    });
  };

  sendPacket();

  timeout = setTimeout(() => {
     // Verificar se o pacote foi confirmado antes de retransmiti-lo
     const packet = bufferRemetente.find((obj) => obj.numPacote === numPacote);
     if (packet && !packet.confirmado) {
       console.log("Timeout do pacote:", numPacote);
       clearTimeout(timeout);
       timeout = null;
 
       if (isCongestionAvoidance) {
         // Timeout ocorreu no modo de Congestion Avoidance: reduz a janela de envio pela metade
         console.log("Timeout detectado durante Congestion Avoidance. Reduzindo tamanho da janela de envio pela metade.");
         JANELA_ENVIO = Math.ceil(JANELA_ENVIO / 2);
         console.log("Novo tamanho da janela de envio:", JANELA_ENVIO);
       }
       // Retransmite o pacote
       sendPacket();
     }
  }, TIMEOUT);
}

function confirmarPacote(numPacote) {
  const pacoteIndex = bufferRemetente.findIndex(
    (obj) => obj.numPacote === numPacote
  );

  if(!controle)  {
    // Apenas confirma o pacote e 
    // não faz nenhum tratamento pois os controle de congestionamento está desativado
    bufferRemetente[pacoteIndex].confirmado = true
    return
  }

  if (pacoteIndex !== -1 && controle) {
    const pacote = bufferRemetente[pacoteIndex];

    if (isCongestionAvoidance && pacote.confirmado) {
      dupAcks++;
      if (dupAcks === 3) {
        // Tratamento de 3 ACKs duplicados: reduz a janela de envio pela metade
        console.log(
          "Detecção de 3 ACKs duplicados. Reduzindo tamanho da janela de envio pela metade."
        );
        JANELA_ENVIO = Math.ceil(JANELA_ENVIO / 2);
        console.log("Novo tamanho da janela de envio:", JANELA_ENVIO);
        dupAcks = 0; // Reinicia o contador de ACKs duplicados

        console.log('Ativando Slow Start')
        isSlowStart = true;
      }
    }else if(isCongestionAvoidance){
      JANELA_ENVIO += 1;
      console.log("Aumentando tamanho da janela de envio:", JANELA_ENVIO);
    }


    if (isSlowStart) {
      if (pacotesConfirmados >= JANELA_ENVIO) {
        JANELA_ENVIO *= 2; 
        console.log("Aumentado janela de envio:", JANELA_ENVIO);

        if(JANELA_ENVIO >= SSTHRESH){
          isSlowStart = false;
          isCongestionAvoidance = true // Fim do Slow Start, entra no modo de Congestion Avoidance
          JANELA_ENVIO = pacotesConfirmados + 1; // Ajusta a janela de envio para o próximo pacote após o Slow Start
          console.log("Fim do Slow Start. Modo de Congestion Avoidance ativado.");
        }
        pacotesConfirmados = 0
      }
    } 

    console.log(`Pacote ${numPacote} confirmado`);
    bufferRemetente[pacoteIndex].confirmado = true
  

    pacotesConfirmados++;
    pacotesNConfirmados--;
  } else {
    return;
  }
}

client.on("message", (msg) => {
  const serverMensagem = JSON.parse(msg);
  const ackPacketNumber = serverMensagem.numero; // Le o número de sequência do pacote de ACK recebido

  confirmarPacote(ackPacketNumber);
});

// Caminho para o arquivo de texto
const caminhoArquivo = './arquivo.txt'; 
// Le o conteúdo do arquivo em um buffer
const conteudoArquivo = readFileSync(caminhoArquivo);

const tamanhoTotal = Math.ceil(conteudoArquivo.length / tamanhoPacote);
function enviarPacotes(numPacote) {
  if(numPacote === tamanhoTotal) return
  setTimeout(async () => {
    const inicio = numPacote * tamanhoPacote;
    const fim = Math.min((numPacote + 1) * tamanhoPacote, conteudoArquivo.length);
    const pacote = conteudoArquivo.slice(inicio, fim);

    await envio(numPacote, pacote);
    enviarPacotes(numPacote + 1);
  }, 500);
}

enviarPacotes(1)