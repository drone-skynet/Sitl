// 필요한 모듈을 로드합니다
const dgram = require('dgram'); // UDP 통신을 위한 모듈

// MAVLink 메시지를 전송하기 위한 설정
const mavPort = 14552; // SITL의 MAVLink 포트
const mavAddress = '127.0.0.1'; // SITL이 실행 중인 주소

// MAVLink 메시지 수신을 위한 UDP 소켓 생성
const client = dgram.createSocket('udp4');

// 메시지 수신 시 호출되는 이벤트 핸들러 등록
client.on('message', (msg, rinfo) => {
  console.log(`수신된 메시지: ${msg.toString('hex')}`);
  console.log(`수신된 주소: ${rinfo.address}:${rinfo.port}`);
});

// 오류 처리
client.on('error', (err) => {
  console.log(`소켓 오류: ${err}`);
  client.close();
});

// 소켓 바인딩 (모든 IP로부터 수신 가능)
client.bind(mavPort, mavAddress, () => {
  console.log(`UDP 소켓이 ${mavAddress}:${mavPort}에 바인딩되었습니다.`);
});

console.log('SITL과의 연결 확인 중...');
