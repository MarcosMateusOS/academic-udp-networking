import udp from "dgram";
const client = udp.createSocket("udp4"); // Cria socket usando IPV4
const PORT = 7788;
const PACOTES_MAX = 3;
const TAM_PACOTE = 1024;
const JANELA_ENVIO = 2;

let pacotesEnviados = 0;
let pacotesConfirmados = 0;
let pacotesNConfirmados = 0;
let janelaEnvio = JANELA_ENVIO;
let numSequencia = 0;

async function envio(numPacote) {
  numSequencia = numPacote;
  if (pacotesConfirmados > pacotesEnviados) {
    console.log("Todos os pacotes foram enviados.");
    return;
  }

  if (pacotesNConfirmados > pacotesConfirmados) {
    console.log("Congestionamento detectado. Aguardando confirmações...");
    return;
  }

  const pacote = Buffer.alloc(TAM_PACOTE);
  pacote.writeUInt32LE(numPacote, 0);

  //setInterval(() => {
  client.send(pacote, 0, pacote.length, PORT, "localhost", (error) => {
    if (error) {
      console.log(error);
    } else {
      pacotesEnviados++;
      console.log("Pacote enviado:", numPacote);

      if (pacotesEnviados === janelaEnvio) {
        janelaEnvio *= 2;
        console.log("Aumentado janela de envio:", janelaEnvio);
      }
    }
  });
  //}, 1000);
}

client.on("message", (msg) => {
  const ackPacketNumber = msg.readUInt32LE(0); // Ler o número de sequência do pacote de ACK recebido
  pacotesConfirmados++;
  pacotesNConfirmados++;
  // Realizar ações adicionais com base na confirmação de ACK recebida, se necessário
});

for (let numPacote = 1; numPacote <= 10; numPacote++) {
  setTimeout(() => {
    envio(numPacote);
  }, 1000);
}
console.log("Finalizado!");
