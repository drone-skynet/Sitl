const dgram = require("dgram"); // UDP 서버를 위한 dgram 모듈
const mqtt = require("mqtt"); // MQTT 클라이언트를 위한 모듈
const conf = require("./conf"); // 설정 파일 불러오기

// MQTT 설정 (Mobius 브로커 설정)
//const mqttClient = mqtt.connect(conf.mobius.mqtt_broker_address); // Mobius가 실행 중인 서버의 IP로 변경
const mqttClient = mqtt.connect("mqtt://127.0.0.1:1883"); // 브로커의 IP 주소와 포트 번호
const mqttTopic = "drone/position"; // Mobius에서 구독할 주제

// UDP 서버 생성
const server = dgram.createSocket("udp4");

// UDP 서버에서 데이터 수신 처리
server.on("message", (msg, rinfo) => {
  console.log(`UDP 메시지 수신: ${msg} from ${rinfo.address}:${rinfo.port}`);

  // 수신한 데이터를 JSON 형식으로 변환
  const jsonData = JSON.stringify({
    data: msg.toString(),
    timestamp: Date.now(),
  });

  // MQTT를 통해 Mobius로 데이터 전송
  mqttClient.publish(mqttTopic, jsonData);
  console.log("MQTT로 데이터 전송:", jsonData);
});

// 오류 처리
server.on("error", (err) => {
  console.log(`서버 오류:\n${err.stack}`);
  server.close();
});

// 서버 시작 로그 출력
server.on("listening", () => {
  const address = server.address();
  console.log(`UDP 서버가 ${address.address}:${address.port}에서 실행 중`);
});

// 포트 번호 5005에서 데이터 수신
server.bind(5005);

// 기존 od-dr-tele-relay 기능은 유지
mqttClient.on("connect", () => {
  console.log("MQTT 클라이언트 연결됨");
  mqttClient.subscribe(mqttTopic, (err) => {
    if (!err) {
      console.log(`MQTT 주제 '${mqttTopic}' 구독 성공`);
    }
  });
});
