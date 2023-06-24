import udp from "dgram";
import { logInfos } from "./utils/logs.js";
const server = udp.createSocket("udp4"); // Cria socket usando IPV4
const PORT = 7788;

const pacotesRecebidos = new Set();
let numPacoteEsperado = 1;

server.on("listening", () => {
  const address = server.address();
  const port = address.port;

  console.log("Server escutando a porta ", port);
});

server.on("message", (msg, info) => {
  const numPacote = msg.readUInt32LE(0);
  // console.log(numPacoteEsperado);
  // console.log(numPacote);

  if (numPacoteEsperado === numPacote) {
    const pacoteACK = Buffer.alloc(4);
    pacoteACK.writeUInt32LE(numPacote, 0);
    //setTimeout(() => {
    server.send(
      pacoteACK,
      0,
      pacoteACK.length,
      info.port,
      "localhost",
      (error) => {
        if (error) {
          console.log(error);
          server.close();
        }
        pacotesRecebidos.add(numPacote);
        numPacoteEsperado++;
        console.log("Pacote recebido | Enviando ACK:", numPacote);
      }
    );
    //}, 500);
  } else {
    console.log("Pacote duplicado");
    console.log("Descartando: ", numPacote);
  }
});

server.bind(PORT);
