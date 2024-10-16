const dgram = require('dgram');
const { MAVLink } = require('node-mavlink');
const mavlinkSchema = require('node-mavlink/mavlink-messages/common'); // MAVLink 메시지 정의

// UDP 소켓 생성
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트 설정
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;

// MAVLink 시스템 및 컴포넌트 ID 설정
const SYS_ID = 1;
const COMP_ID = 1;

// MAVLink 인스턴스 생성
const mavlink = new MAVLink(null, SYS_ID, COMP_ID);

// GUIDED 모드 전환 함수
function setGuidedMode() {
    const guidedCommand = new mavlinkSchema.CommandLong({
        target_system: SYS_ID,
        target_component: COMP_ID,
        command: 176, // MAV_CMD_DO_SET_MODE
        confirmation: 0,
        param1: 1,    // GUIDED 모드
        param2: 4,    // 모드 설정
    });

    const buffer = Buffer.from(guidedCommand.pack(mavlink));
    client.send(buffer, 0, buffer.length, SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('GUIDED 모드 전환 오류:', err);
        } else {
            console.log('GUIDED 모드 전환 완료');
            armDrone();  // GUIDED 모드 설정 후 드론 ARM
        }
    });
}

// 드론을 ARM 상태로 전환하는 함수
function armDrone() {
    const armCommand = new mavlinkSchema.CommandLong({
        target_system: SYS_ID,
        target_component: COMP_ID,
        command: 400, // MAV_CMD_COMPONENT_ARM_DISARM
        confirmation: 0,
        param1: 1,    // ARM
    });

    const buffer = Buffer.from(armCommand.pack(mavlink));
    client.send(buffer, 0, buffer.length, SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('드론 ARM 명령 전송 오류:', err);
        } else {
            console.log('드론 ARM 명령 전송 완료');
        }
    });
}

// 수신된 MAVLink 메시지를 처리하는 함수
client.on('message', (msg) => {
    try {
        mavlink.parse(msg); // 수신된 메시지를 MAVLink 인스턴스를 통해 파싱
    } catch (err) {
        console.error('MAVLink 메시지 파싱 오류:', err);
    }
});

// MAVLink 메시지를 수신할 때마다 호출되는 이벤트 핸들러
mavlink.on('message', (message) => {
    console.log('수신된 메시지:', message);
    // 메시지의 타입에 따라 추가 처리를 구현할 수 있습니다.
    if (message.name === 'HEARTBEAT') {
        console.log(`Heartbeat - 타입: ${message.type}, 오토파일럿: ${message.autopilot}`);
    } else if (message.name === 'GPS_RAW_INT') {
        console.log(`GPS 데이터 - 위도: ${message.lat / 1e7}, 경도: ${message.lon / 1e7}, 고도: ${message.alt / 1e3}`);
    }
});

// UDP 소켓 설정
client.bind(14554, SITL_HOST, () => {
    console.log(`UDP 클라이언트가 포트 14554에서 수신 대기 중`);
    setGuidedMode();  // GUIDED 모드로 전환 후 ARM 명령
});
