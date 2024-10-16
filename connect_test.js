// 필요한 모듈을 로드합니다
const dgram = require('dgram'); // UDP 통신을 위한 모듈

// MAVLink 메시지를 전송하기 위한 설정
const mavPort = 14550; // SITL의 MAVLink 포트
const mavAddress = '127.0.0.1'; // SITL이 실행 중인 주소

// MAVLink 메시지 전송을 위한 UDP 소켓 생성
const client = dgram.createSocket('udp4');

// 연결 테스트를 위한 임의의 메시지 전송 함수
sendTestMessage = () => {
  const message = Buffer.from('Hello SITL!'); // SITL로 보낼 메시지 생성
  client.send(message, 0, message.length, mavPort, mavAddress, (err) => {
    if (err) {
      console.error('메시지 전송 중 오류 발생:', err);
    } else {
      console.log('SITL로 메시지 전송 완료:', message.toString());
    }
  });
};

// 메시지 전송 실행
sendTestMessage();