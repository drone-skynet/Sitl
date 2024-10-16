const dgram = require('dgram');
const mavlink = require('/home/shining17/ardupilot/mavlink1');  // 업로드한 mavlink1.js 파일 불러오기
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;  // SITL 포트 확인

// MAVLink 시스템 및 컴포넌트 ID
const SYS_ID = 1;  // 드론의 시스템 ID
const COMP_ID = 1; // 드론의 컴포넌트 ID

// MAVLink 인스턴스 생성
const mav = new mavlink.mavlink10();  // mavlink10 인스턴스를 생성

// MAVLink 객체에 `signing` 속성 추가 (서명 작업 생략)
mav.signing = {
    sign_outgoing: false,
    timestamp: 0,
    link_id: 0,
    secret_key: null
};

// MAVLink 메시지 생성 및 전송 (GUIDED 모드로 변경)
function setGuidedMode() {
    const base_mode = 1;  // 기본 모드 플래그 (ARM 된 상태 등)
    const custom_mode = 4;  // GUIDED 모드를 나타내는 custom_mode 값 (ArduPilot에서 4로 설정됨)

    const commandLong = new mavlink.mavlink10.messages.command_long(
        SYS_ID,           // 시스템 ID
        COMP_ID,          // 컴포넌트 ID
        176,              // MAV_CMD_DO_SET_MODE 명령 번호
        0,                // 확인 플래그 (0은 확인 안 함)
        base_mode,        // 기본 모드 플래그
        custom_mode,      // GUIDED 모드를 위한 custom_mode 값
        0, 0, 0, 0, 0     // 나머지 파라미터는 0으로 설정
    );

    // 메시지를 패킷으로 변환
    const packet = commandLong.pack(mav);

    // UDP 소켓을 통해 메시지를 SITL로 전송
    client.send(Buffer.from(packet), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('메시지 전송 오류:', err);
        } else {
            console.log('GUIDED 모드로 변경 명령 전송 완료');
        }
        client.close();  // 전송 후 UDP 소켓 닫기
    });
}

// UDP 소켓 설정 (클라이언트 포트는 SITL 포트와 다르게 설정)
client.bind(14553, SITL_HOST, () => {
    console.log(`UDP 클라이언트가 포트 14553에서 수신 대기 중`);

    // GUIDED 모드로 전환 실행
    setGuidedMode();
});
