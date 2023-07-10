import udp from "dgram";
import { REQ_TYPES } from "./types.js";
const server = udp.createSocket("udp4"); // Cria socket usando IPV4
const PORT = 7788;

const descarte = false // Habilitar decarte
const DELAY_THRESHOLD = 500; // Limite de atraso para simular congestionamento (em milissegundos)
const PERDA_PACOTES = descarte ? 0.2 : 0; // Probabilidade de perda de ACKs
let pacoteEsperado = 1

server.on("listening", () => {
  const address = server.address();
  const port = address.port;

  console.log("Server escutando a porta ", port);
});

server.on("message", (msg, info) => {
  const pacote = JSON.parse(msg);
  const numeroPacode = pacote.numero
 
  

  if (pacote.tipo === REQ_TYPES.REQ && pacoteEsperado === numeroPacode) {
    const message = {
      numero: pacote.numero,
      tipo: REQ_TYPES.ACK,
    };

    const ackResponse = Buffer.from(JSON.stringify(message));
    const randDelay = Math.random() * DELAY_THRESHOLD;

    setTimeout(() => {
      const descarte = Math.random() < PERDA_PACOTES;

      if (!descarte) {
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
            }
          }
        );
      } else {
        console.log("Perda de pacote...");
      }
      pacoteEsperado++
    }, randDelay);
  }else {
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
});

server.bind(PORT);
