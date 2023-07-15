import udp from "dgram";
import { REQ_TYPES } from "./types.js";
const server = udp.createSocket("udp4"); // Cria socket usando IPV4
const PORT = 7788;
import {writeFileSync, appendFileSync} from 'fs'
const descarte = true // Habilitar decarte
const DELAY_THRESHOLD = 500; // Limite de atraso para simular congestionamento (em milissegundos)
const PERDA_PACOTES = descarte ? 0.2 : 0; // Probabilidade de perda de ACKs
let pacoteEsperado = 1
let bytesRecebitos = 0
const INTERVALO_MEDICAO = 2000

const arquivoMetricas = './metricas.txt'

const arquivoMontado = './arquivo_montado.txt'
server.on("listening", () => {
  const address = server.address();
  const port = address.port;

  console.log("Server escutando a porta ", port);
});

server.on("message", (msg, info) => {
  const pacote = JSON.parse(msg);
  const numeroPacode = pacote.numero
 
  

  if (pacote.tipo === REQ_TYPES.REQ && ((pacoteEsperado === numeroPacode && descarte))) {
    const message = {
      numero: pacote.numero,
      tipo: REQ_TYPES.ACK,
    };

    const ackResponse = Buffer.from(JSON.stringify(message));
    const randDelay = Math.random() * DELAY_THRESHOLD;

    setTimeout(() => {
      const descarte = Math.random() < PERDA_PACOTES;

      if (!descarte) {
        bytesRecebitos += msg.byteLength
        server.send(
          ackResponse,
          0,
          ackResponse.length,
          info.port,
          info.address,
          (error) => {
            if (error) {
              console.log(error);
              server.close();
            } else {
              console.log(`Pacote recebido ${pacote.numero} | ACK enviado`);
              appendFileSync(arquivoMontado,`${pacote.body}\n`)

            }
          }
        );
      } else {
        console.log("Perda de pacote...");
      }
      pacoteEsperado++
    }, randDelay);
  }else {
    if(!descarte){
      console.log("Pacote fora de ordem ou duplicado. Descartando pacote:", numeroPacode);

      // Enviar ACK para o último pacote esperado
      const ackPacket = {
        numero: pacoteEsperado - 1, // ACK para o último pacote esperado
        tipo: REQ_TYPES.ACK,
      };
      const ackResponse = Buffer.from(JSON.stringify(ackPacket));
      const ack = Buffer.from(JSON.stringify(ackPacket));
  
      server.send(ack, 0,  ackResponse.length,
        info.port,
        info.address);
    }
  }
});

let bytesRecebitosTotal = 0
server.bind(PORT, () => {
  setInterval(() => {
    bytesRecebitosTotal += bytesRecebitos
    const vazao = bytesRecebitos / (INTERVALO_MEDICAO / 1000); // Pacotes por segundo
    console.log(`Vazão: ${vazao} bytes/segundo`);
    appendFileSync(arquivoMetricas, `Média Bytes: ${vazao} bytes/s\n`)
    bytesRecebitos = 0
  }, INTERVALO_MEDICAO)
});