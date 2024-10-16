const dgram = require('dgram');
const mavlink = require('mavlink');  // node-mavlink 라이브러리 사용
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;  // 일반적으로 SITL에서 사용하는 포트

// MAVLink 인스턴스 생성 (시스템 및 컴포넌트 ID 설정)
const SYS_ID = 1;
const COMP_ID = 1;
const mav = new mavlink(1, 1);  // 시스템 ID와 컴포넌트 ID를 설정합니다

// MAVLink 메시지 수신 이벤트 등록
client.on('message', (msg) => {
    console.log('수신된 원본 메시지:', msg);  // 원본 메시지 출력

    try {
        // 수신된 메시지를 디코딩
        mav.parseBuffer(msg);
    } catch (err) {
        console.error('메시지 디코딩 오류:', err);
    }
});

// MAVLink에서 디코딩된 메시지를 처리하는 이벤트 등록
mav.on('message', (message) => {
    console.log('디코딩된 메시지:', message);
});

// 드론을 GUIDED 모드로 설정하는 함수
function setGuidedMode() {
    const modeMessage = new mavlink.messages.set_mode(
        SYS_ID,           // target_system: 시스템 ID
        1,                // base_mode: MAV_MODE_FLAG_CUSTOM_MODE_ENABLED
        4                 // custom_mode: GUIDED 모드 (ArduCopter에서 GUIDED 모드의 custom_mode는 4)
    );

    const buffer = Buffer.from(modeMessage.pack(SYS_ID, COMP_ID));
    client.send(buffer, 0, buffer.length, SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('GUIDED 모드 설정 중 오류:', err);
        } else {
            console.log('GUIDED 모드 설정 메시지 전송 성공');
        }
    });
}

// UDP 소켓 설정 및 드론 GUIDED 모드 설정
client.bind(14553, SITL_HOST, () => {
    console.log(`UDP 클라이언트가 ${SITL_HOST}:${SITL_PORT}에서 수신 대기 중`);

    // 드론을 GUIDED 모드로 설정
    setGuidedMode();
});
