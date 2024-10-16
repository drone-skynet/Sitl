const dgram = require('dgram');
const Mavlink = require('mavlink');
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;

// MAVLink 인스턴스 생성
const mav = new Mavlink();
mav.on('message', (message) => {
    console.log('디코딩된 메시지:', message);  // 디코딩된 메시지 출력
});

// 메시지 버퍼
let messageBuffer = [];

// 메시지 수신 시 버퍼에 저장
client.on('message', (msg) => {
    console.log('수신된 메시지:', msg);
    messageBuffer.push(...msg);
});

// 5초마다 메시지 디코딩
setInterval(() => {
    try {
        if (messageBuffer.length > 0) {
            messageBuffer.forEach((byte) => mav.parseByte(byte)); // 바이트 단위로 메시지 파싱
            messageBuffer = []; // 버퍼 비우기
        }
    } catch (err) {
        console.error('메시지 디코딩 오류:', err.message);
    }
}, 5000);

// UDP 소켓 설정
client.bind(14553, SITL_HOST, () => {
    console.log('UDP 클라이언트가 포트 14553에서 수신 대기 중');
});
