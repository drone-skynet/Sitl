const dgram = require('dgram');
const mavlink = require('/home/shining17/ardupilot/mavlink1');  // 기존에 사용하던 mavlink1.js
const MavlinkParser = require('mavlink');  // 수신할 때 사용할 MAVLink 파서
const client = dgram.createSocket('udp4');

// SITL 주소 및 포트
const SITL_HOST = '127.0.0.1';
const SITL_PORT = 14552;

// MAVLink 시스템 및 컴포넌트 ID
const SYS_ID = 1;
const COMP_ID = 1;

// 이동 목표 좌표
const TARGET_LAT = -35.362240;
const TARGET_LON = 149.162167;
const TARGET_ALT = 10;  // 목표 고도 설정

// MAVLink 인스턴스 생성 (수신 및 전송용 구분)
const mav = new mavlink.mavlink10();  // 전송용
mav.signing = {
    sign_outgoing: false,
    timestamp: 0,
    link_id: 0,
    secret_key: null
};

// 드론 위치 지속 모니터링 변수
let currentLat = 0;
let currentLon = 0;
let currentAlt = 0;
let landed = false; // 착륙 여부 확인

// MAVLink 파서 인스턴스 생성 (수신용)
const mavlinkParser = new MavlinkParser();
mavlinkParser.on('message', (message) => {
    if (message.name === 'GLOBAL_POSITION_INT') {
        currentLat = message.lat / 1e7;
        currentLon = message.lon / 1e7;
        currentAlt = message.relative_alt / 1000;

        const distance = getDistance(currentLat, currentLon, TARGET_LAT, TARGET_LON);
        console.log(`현재 위치: 위도 ${currentLat}, 경도 ${currentLon}, 고도 ${currentAlt}, 거리: ${distance}m`);

        // 목표 지점에 도착했을 때 착륙 (거리 15m 이내)
        if (distance < 15 && Math.abs(currentAlt - TARGET_ALT) < 2 && !landed) {
            console.log('목표 지점 도착. 착륙 시작.');
            land();
        }
    }
});

// 메시지 수신 및 파싱
client.on('message', (msg) => {
    try {
        for (let i = 0; i < msg.length; i++) {
            mavlinkParser.parseByte(msg[i]);  // 메시지를 파서로 처리
        }
    } catch (err) {
        console.error('메시지 디코딩 오류:', err);
    }
});

// 두 좌표 간의 거리 계산 함수
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

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
            armDrone();
        }
    });
}

// 드론 ARM 및 스로틀 활성화
function armDrone() {
    const armCommand = new mavlink.mavlink10.messages.command_long(
        SYS_ID, COMP_ID, 400, 0, 1, 0, 0, 0, 0, 0, 0
    );

    client.send(Buffer.from(armCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('드론 ARM 명령 전송 오류:', err);
        } else {
            console.log('드론 ARM 명령 전송 완료');
            takeoff(TARGET_ALT);
        }
    });
}

// 드론 이륙
function takeoff(altitude) {
    const takeoffCommand = new mavlink.mavlink10.messages.command_long(
        SYS_ID, COMP_ID, 22, 0, 0, 0, 0, 0, 0, 0, altitude
    );

    client.send(Buffer.from(takeoffCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('이륙 명령 전송 오류:', err);
        } else {
            console.log(`드론 ${altitude}m로 이륙 명령 전송 완료`);
            setTimeout(() => {
                moveTo(TARGET_LAT, TARGET_LON, TARGET_ALT);
            }, 5000);
        }
    });
}

// 특정 좌표로 이동
function moveTo(latitude, longitude, altitude) {
    const moveCommand = new mavlink.mavlink10.messages.set_position_target_global_int(
        0, SYS_ID, COMP_ID, 6, 0b0000111111111000,
        latitude * 1e7, longitude * 1e7, altitude,
        0, 0, 0, 0, 0, 0, 0, 0
    );

    client.send(Buffer.from(moveCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('이동 명령 전송 오류:', err);
        } else {
            console.log(`드론이 위도 ${latitude}, 경도 ${longitude}, 고도 ${altitude}m로 이동 명령 전송 완료`);
        }
    });
}

// 드론 착륙
function land() {
    const landCommand = new mavlink.mavlink10.messages.command_long(
        SYS_ID, COMP_ID, 21, 0, 0, 0, 0, 0, 0, 0, 0
    );

    client.send(Buffer.from(landCommand.pack(mav)), SITL_PORT, SITL_HOST, (err) => {
        if (err) {
            console.error('착륙 명령 전송 오류:', err);
        } else {
            console.log('드론 착륙 명령 전송 완료');
            landed = true;  // 착륙 완료 상태 설정
        }
    });
}

// UDP 소켓 설정
client.bind(14553, SITL_HOST, () => {
    console.log(`UDP 클라이언트가 포트 14553에서 수신 대기 중`);
    setGuidedMode();
});
