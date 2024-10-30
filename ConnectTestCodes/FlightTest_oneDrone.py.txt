from pymavlink import mavutil
import time
import socket
import json

# SITL 주소 및 포트 설정
SITL_HOST = '127.0.0.1'
SITL_PORT = 14552

# MAVLink 시스템 및 컴포넌트 ID
SYS_ID = 1
COMP_ID = 1

# OneDrone UDP 서버 설정
ONEDRONE_UDP_IP = "127.0.0.1"  # OneDrone 서버 IP 주소
ONEDRONE_UDP_PORT = 5005       # OneDrone 서버에서 수신할 포트 번호

# UDP 소켓 생성
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# MAVLink 연결 생성
master = mavutil.mavlink_connection('udpout:{}:{}'.format(SITL_HOST, SITL_PORT))

# GUIDED 모드 전환 함수
def set_guided_mode():
    master.mav.command_long_send(
        SYS_ID,
        COMP_ID,
        mavutil.mavlink.MAV_CMD_DO_SET_MODE,
        0,
        1, 4, 0, 0, 0, 0, 0
    )
    print("GUIDED 모드 전환 명령 전송 완료")
    time.sleep(2)
    arm_drone()

# 드론 ARM 함수
def arm_drone():
    master.mav.command_long_send(
        SYS_ID,
        COMP_ID,
        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        0,
        1, 0, 0, 0, 0, 0, 0
    )
    print("드론 ARM 명령 전송 완료")
    time.sleep(2)
    takeoff_drone(20)  # 목표 고도 20미터로 이륙

# 드론 이륙 함수
def takeoff_drone(altitude):
    master.mav.command_long_send(
        SYS_ID,
        COMP_ID,
        mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
        0,
        0, 0, 0, 0, 0, 0, altitude
    )
    print(f"드론 이륙 명령 전송 완료 - 목표 고도: {altitude}미터")
    time.sleep(10)  # 이륙 대기 시간
    move_to_position(-35.360489, 149.169093, altitude)  # 특정 좌표로 이동

# 드론 특정 좌표로 이동 함수
def move_to_position(lat, lon, alt):
    master.mav.set_position_target_global_int_send(
        0,
        SYS_ID,
        COMP_ID,
        mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT,
        int(0b110111111000),
        int(lat * 1e7),
        int(lon * 1e7),
        alt,
        0, 0, 0,
        0, 0, 0,
        0, 0
    )
    print(f"드론이 목표 위치로 이동 중 - 위도: {lat}, 경도: {lon}, 고도: {alt}")
    monitor_and_send_position(lat, lon, alt)

# 드론의 현재 위치 모니터링 및 OneDrone으로 데이터 전송 함수
def monitor_and_send_position(target_lat, target_lon, target_alt):
    while True:
        msg = master.recv_match(type='GLOBAL_POSITION_INT', blocking=True)
        if msg:
            current_lat = msg.lat / 1e7
            current_lon = msg.lon / 1e7
            current_alt = msg.relative_alt / 1e3  # 고도는 mm 단위를 m로 변환

            print(f"현재 위치 - 위도: {current_lat}, 경도: {current_lon}, 고도: {current_alt}")

            # 드론 위치 데이터를 JSON 형식으로 생성
            data = {
                "latitude": current_lat,
                "longitude": current_lon,
                "altitude": current_alt
            }

            # UDP로 OneDrone으로 데이터 전송
            try:
                udp_socket.sendto(json.dumps(data).encode(), (ONEDRONE_UDP_IP, ONEDRONE_UDP_PORT))
                print(f"데이터 전송 성공 - 위도: {current_lat}, 경도: {current_lon}, 고도: {current_alt}")
            except Exception as e:
                print(f"데이터 전송 오류: {e}")

            # 목표 위치와 비교하여 도착 여부 확인
            if (abs(current_lat - target_lat) < 0.0001 and
                    abs(current_lon - target_lon) < 0.0001 and
                    abs(current_alt - target_alt) < 1):
                print("목표 지점 도착 완료. 착륙 시도 중...")
                land_drone()
                break

            time.sleep(1)

# 드론 착륙 함수
def land_drone():
    master.mav.command_long_send(
        SYS_ID,
        COMP_ID,
        mavutil.mavlink.MAV_CMD_NAV_LAND,
        0,
        0, 0, 0, 0, 0, 0, 0
    )
    print("드론 착륙 명령 전송 완료")

if __name__ == '__main__':
    print(f"MAVLink 클라이언트가 {SITL_HOST}:{SITL_PORT}에 연결 중")
    set_guided_mode()  # GUIDED 모드로 전환 후 ARM 및 이륙, 이동, 착륙 수행
