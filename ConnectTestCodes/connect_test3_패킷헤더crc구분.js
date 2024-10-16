const dgram = require('dgram');
const mavlink = require('/home/shining17/ardupilot/mavlink1');  // mavlink1.js 파일 사용
const Mavlink = require('mavlink');  // node-mavlink 라이브러리 사용
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;

// MAVLink 시스템 및 컴포넌트 ID
const SYS_ID = 1;
const COMP_ID = 1;

// MAVLink 인스턴스 생성 (송신용)
const mav = new mavlink.mavlink10();
mav.signing = {
    sign_outgoing: false,
    timestamp: 0,
    link_id: 0,
    secret_key: null
};

// MAVLink 인스턴스 생성 (수신용)
const mavParser = new Mavlink(1, 1);  // 시스템 ID와 컴포넌트 ID로 파서 초기화

// 수신된 메시지를 파싱하여 쌓아두기 위한 버퍼
let buffer = Buffer.alloc(0);

// GUIDED 모드로 전환
function setGuidedMode() {
    const guidedCommand = new mavlink.mavlink10.messages.command_long(
        SYS_ID, COMP_ID, 176, 0, 1, 4, 0, 0, 0, 0, 0
    );

    client.send(Buffer.from(guidedCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('GUIDED 모드 전환 오류:', err);
        } else {
            console.log('GUIDED 모드 전환 완료');
            armDrone();  // GUIDED 모드가 된 후에 ARM 명령
        }
    });
}

// 드론을 ARM 상태로 전환
function armDrone() {
    const armCommand = new mavlink.mavlink10.messages.command_long(
        SYS_ID, COMP_ID, 400, 0, 1, 0, 0, 0, 0, 0, 0
    );

    client.send(Buffer.from(armCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('드론 ARM 명령 전송 오류:', err);
        } else {
            console.log('드론 ARM 명령 전송 완료');
        }
    });
}

// 수신된 메시지를 파싱하여 출력
client.on('message', (msg) => {
    console.log("수신된 원본 메시지:", msg.toString('hex'));  // 수신된 메시지를 로그로 출력

    // 수신된 데이터를 버퍼에 추가
    buffer = Buffer.concat([buffer, msg]);

    try {
        // 수신된 데이터를 버퍼에 쌓고 메시지가 완전히 도착할 때까지 기다린 후 파싱
        while (buffer.length > 0) {
            if (buffer[0] === 0xFD) { // MAVLink v2 메시지 처리
                const headerLength = 10;  // 헤더 길이 (v2)
                
                // 페이로드 길이를 헤더에서 추출
                const payloadLength = buffer[1];  

                // 전체 메시지 길이 계산 (헤더 + 페이로드 + CRC)
                const totalLength = headerLength + payloadLength + 2; // CRC는 항상 2바이트

                // 버퍼가 전체 메시지를 포함하고 있는지 확인
                if (buffer.length < totalLength) {
                    // 전체 메시지를 아직 수신하지 않은 경우, 다음 루프에서 처리
                    break;
                }

                // 헤더 추출
                const header = buffer.slice(0, headerLength);
                console.log("헤더:", header.toString('hex'));

                // 페이로드 추출
                const payload = buffer.slice(headerLength, headerLength + payloadLength);
                console.log("페이로드:", payload.toString('hex'));

                // CRC 추출
                const crc = buffer.slice(headerLength + payloadLength, totalLength);
                console.log("CRC:", crc.toString('hex'));

                // 파싱이 완료된 메시지는 버퍼에서 제거
                buffer = buffer.slice(totalLength);
            } else {
                console.log("알 수 없는 메시지 형식 또는 MAVLink v1 메시지");
                buffer = buffer.slice(1); // 첫 바이트를 버리고 다음을 확인
            }
        }
    } catch (err) {
        console.error('메시지 파싱 오류:', err);
    }
});

// MAVLink에서 디코딩된 메시지를 처리하는 이벤트 등록
mavParser.on('message', (message) => {
    console.log('디코딩된 메시지:', message);
});

// UDP 소켓 설정
client.bind(14554, SITL_HOST, () => {
    console.log(`UDP 클라이언트가 포트 14554에서 수신 대기 중`);
    setGuidedMode();  // GUIDED 모드로 전환 후 ARM
});
