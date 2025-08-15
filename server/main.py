import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from queue import PriorityQueue
import asyncio
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer
from uuid import uuid4
import argparse
from exp import Exp
import socketio
from trial import Trial
import json
import os, shutil
from logger import Logger
import atexit
import subprocess
import psutil
import copy
import time
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
import hpo_shap_analysis as hpo_shap_analysis


el = None

PRIVATE_KEY = "VAPID_KEY_REMOVED"

reserved = [] # list of progress
user_trial_que = PriorityQueue()

exp = None # Experiment Information
exp_list = [] # all experiments
app = FastAPI()
state, opt = None, None 
curr_trial = None # Current Trial
last_state = None # Last State
curr_user = None # Current User
subs = set()
global_page = None
restore_trial = None

client_exp = None # Experiment saw by client

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace the wildcard with the specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
EXP_PENDING = "pending"
EXP_RUNNING = "running"
EXP_FINISED = "finished"
EXP_RESERVED = "reserved"
EXP_PAUSED = "paused"
EXP_AUTO_PAUSED = "auto_paused"
def get_params():
    parser = argparse.ArgumentParser(description='BOHB Server')
    parser.add_argument('--host', type=str, default='0.0.0.0',
                        metavar='HOST', help='host for HyPockeTuner Server')
    parser.add_argument('--port', type=int, default=8080,
                        metavar='PORT', help='port for HyPockeTuner Server')
    parser.add_argument('--no-debug', dest='debug', action='store_false')
    parser.add_argument('--reset', dest='reset', action='store_true')
    parser.add_argument('--new', dest='new', action='store_true')
    parser.add_argument('--base-exp', type=str, default="base", dest="base_exp", help="base experiment configuration")
    parser.add_argument('--last-exp', type=str, default="lastExp.json", dest="last_exp", help="info of the last experiment")
    args, _ = parser.parse_known_args()
    
    return args     


###########################################################################
# socket
###########################################################################
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
connected_clients = {}  # set 대신 dict로 변경하여 더 많은 정보 저장
client_last_event_time = {}  # Track last event time per client

@sio.event
async def connect(sid: str, environ: dict):
    global connected_clients

    print(f"✅ Client connected: {sid}")
    # 클라이언트 정보를 더 자세히 저장
    connected_clients[sid] = {
        'connected_at': time.time(),
        'user_agent': environ.get('HTTP_USER_AGENT', 'Unknown'),
        'ip': environ.get('REMOTE_ADDR', 'Unknown')
    }
    print(f"📊 Total connected clients: {len(connected_clients)}")
    return {"success": True}

@sio.event
async def disconnect(sid: str):
    global connected_clients
    print(f"❌ Client disconnected: {sid}")
    # 연결된 클라이언트 목록에서 제거
    if sid in connected_clients:
        del connected_clients[sid]
    print(f"📊 Remaining connected clients: {len(connected_clients)}")
    return {"success": True}

import json
import time
from datetime import datetime
from typing import Any, Dict, List

def safe_serialize(obj: Any) -> Any:
    """
    객체를 JSON 직렬화 가능한 형태로 안전하게 변환
    """
    if obj is None:
        return None
    
    # 기본 타입들은 그대로 반환
    if isinstance(obj, (str, int, float, bool)):
        return obj
    
    # 함수는 문자열로 변환
    if callable(obj):
        return f"<function {getattr(obj, '__name__', 'unknown')}>"
    
    # datetime 객체 처리
    if isinstance(obj, datetime):
        return obj.timestamp()
    
    # 리스트 처리
    if isinstance(obj, (list, tuple)):
        return [safe_serialize(item) for item in obj]
    
    # 딕셔너리 처리
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            # 키도 안전하게 변환
            safe_key = str(key) if not isinstance(key, str) else key
            result[safe_key] = safe_serialize(value)
        return result
    
    # 객체의 __dict__ 속성이 있으면 사용
    if hasattr(obj, '__dict__'):
        return safe_serialize(obj.__dict__)
    
    # 그 외의 경우 문자열로 변환
    try:
        return str(obj)
    except:
        return f"<unserializable {type(obj).__name__}>"

def clean_data_for_json(data: Any) -> Any:
    """
    데이터를 JSON 전송을 위해 완전히 정화
    """
    try:
        # 먼저 안전하게 직렬화
        cleaned = safe_serialize(data)
        
        # JSON 변환 테스트
        json_str = json.dumps(cleaned, default=str)
        
        # 다시 파싱해서 반환 (검증 목적)
        return json.loads(json_str)
        
    except Exception as e:
        print(f"❌ Error cleaning data: {e}")
        return {"error": f"Data cleaning failed: {str(e)}"}

# 개선된 request_current_state 함수
@sio.event
async def request_current_state(sid: str):
    global connected_clients, exp_list, client_exp, exp, last_state, global_page, curr_user, reserved
    print(f"📥 Request current state from client: {sid}")
    
    # 클라이언트가 실제로 연결되어 있는지 확인
    if sid not in connected_clients:
        print(f"⚠️ Warning: {sid} not in connected_clients list")
        connected_clients[sid] = {'connected_at': time.time()}
    
    
    try:
        # 사용자 설정 파일 존재 확인
        config_path = f"./users/{curr_user}/config/list.json"
        kernel_path = f"./users/{curr_user}/config/kernel_info.json"
        
        if not os.path.exists(config_path):
            print(f"❌ Config file not found: {config_path}")
            await sio.emit("initial_state", {"error": "Config not found"}, room=sid)
            return
        
        if not os.path.exists(kernel_path):
            print(f"❌ Kernel info file not found: {kernel_path}")
            await sio.emit("initial_state", {"error": "Kernel info not found"}, room=sid)
            return

        # 설정 파일들 로드
        with open(config_path, "r") as f:
            exp_option = json.load(f)
        with open(kernel_path, "r") as f:
            kernel_info = json.load(f)

        # 실험 리스트 처리 - 안전한 직렬화
        exp_summary_list = []
        if exp_list:
            for ep in exp_list:
                try:
                    summary = ep.summary()
                    # 안전하게 정화
                    clean_summary = clean_data_for_json(summary)
                    exp_summary_list.append(clean_summary)
                except Exception as e:
                    print(f"❌ Error processing experiment {getattr(ep, 'id', 'unknown')}: {e}")
                    continue

        # 현재 실험 처리
        curr_exp = None
        if client_exp:
            for _exp in exp_list:
                if hasattr(_exp, 'id') and hasattr(client_exp, 'id') and _exp.id == client_exp.id:
                    try:
                        exp_json = _exp.to_json()
                        # 안전하게 정화
                        exp_json['runningExp'] = exp.id if exp and exp.id == _exp.id else None
                        curr_exp = clean_data_for_json(exp_json)
                        break
                    except Exception as e:
                        print(f"❌ Error processing current experiment: {e}")
                        curr_exp = None
                        break

        # 최종 데이터 구성 - 각각 안전하게 정화
        response_data = {
            "exp_option": clean_data_for_json(exp_option),
            "exp_list": exp_summary_list,  # 이미 정화됨
            "curr_exp": curr_exp,  # 이미 정화됨
            "kernel_info": clean_data_for_json(kernel_info),
            "global_page": clean_data_for_json(global_page),
            "reserved": clean_data_for_json(reserved) if reserved else []
        }

        # 최종 JSON 직렬화 테스트
        try:
            test_json = json.dumps(response_data, default=str)
            print(f"✅ JSON serialization test passed, size: {len(test_json)} bytes")
        except Exception as e:
            print(f"❌ Final JSON test failed: {e}")
            # 최소한의 안전한 데이터로 대체
            response_data = {
                "exp_option": {},
                "exp_list": [],
                "curr_exp": None,
                "kernel_info": {},
                "global_page": None,
                "reserved": [],
                "error": f"Final serialization failed: {str(e)}"
            }

        global_page = None
        
        print(f"📤 Sending cleaned initial state to {sid}")
        await sio.emit("initial_state", response_data, room=sid)
        print(f"✅ Initial state sent successfully to {sid}")
        
    except Exception as e:
        print(f"❌ Critical error in request_current_state: {e}")
        import traceback
        traceback.print_exc()
        
        # 에러 발생 시 최소한의 응답
        try:
            error_response = {
                "exp_list": [],
                "curr_exp": None,
                "exp_option": {},
                "kernel_info": {},
                "global_page": None,
                "reserved": [],
                "error": str(e)
            }
            await sio.emit("initial_state", error_response, room=sid)
            print(f"📤 Sent error response to {sid}")
        except Exception as emit_error:
            print(f"💀 Failed to send even error response: {emit_error}")


# @app.get("/load_information")
# async def load_information():
#     global curr_user, global_page
#     with open(f"./users/{curr_user}/config/list.json", "r") as f:
#         exp_option = json.load(f)
#     with open(f"./users/{curr_user}/config/kernel_info.json", "r") as f:
#         kernel_info = json.load(f)

#     exp_summary_list = [ep.summary() for ep in exp_list]
#     curr_exp = None

#     if client_exp != None:
#         print("!!!!!!!!!!!!!!!!!!!!!! load information", client_exp.id)
    
#     if client_exp:
#         for _exp in exp_list:
#             if _exp.id == client_exp.id:
#                 curr_exp = _exp.to_json()

#     data = {"exp_option": exp_option, "exp_list": exp_summary_list, "curr_exp": curr_exp,  "kernel_info": kernel_info, "global_page": global_page}
#     global_page = None
#     return {"success": True, "data": data}

# async def broadcast(callback):
#     for cb in callback:
#         await sio.emit("event", cb)
#         data={}
#         if cb["key"] == "push":
#             data['key'] = cb['value']['title']
#             data['value'] = {}
#             data['value']['content'] = cb['value']['content']
#             data['value']['exp'] = cb['expId']
#             pushAll(data)
#             server_log("push", data=data)


def pushAll(data):
    global subs
    for sub_string in subs:
        sub = json.loads(sub_string)
        try:
            res = webpush(
            sub, data=json.dumps(data),
            vapid_private_key=PRIVATE_KEY,
            vapid_claims={"sub": "mailto:hdh12345@g.skku.edu"}
        )
        except Exception as e:
            print("push error", e)
            import traceback    
            traceback.print_exc()

async def broadcast(callback):
    for cb in callback:
        await sio.emit("event", cb)
        data={}
        if cb["key"] == "push":
            data['key'] = cb['value']['title']
            data['value'] = {}
            data['value']['content'] = cb['value']['content']
            data['value']['exp'] = cb['expId']
            pushAll(data)
            server_log("push", data=data)


async def send_callbacks(exp_id: str):
    global exp_list
    callback_exp = next((e for e in exp_list if e.id == exp_id), None)
    print("send_callbacks", callback_exp)
    print("send_callbacks", callback_exp.state.callback)
    print("length =====> ", len(callback_exp.state.callback))
    
    if callback_exp and len(callback_exp.state.callback):
        await broadcast(callback_exp.state.callback)
        callback_exp.state.all_callbacks += callback_exp.state.callback
        
        callback_exp.state.callback = []
        callback_exp.save()


def get_gpu_usage(device_id=0):
    """
    Get GPU memory usage, volatile GPU utilization, and temperature for a specific GPU device.
    :param device_id: ID of the GPU device. Default is 0.
    :return: Used memory, total memory in MB, volatile GPU utilization in %, and temperature in Celsius.
    """
    result = subprocess.check_output(['nvidia-smi', '--query-gpu=memory.used,memory.total,utilization.gpu,temperature.gpu', '--format=csv,nounits,noheader']).decode('utf-8')
    # print(f"nvidia-smi output: {result}")  # 로깅을 추가합니다.
    
    # 공백으로 문자열을 분할하고 결과를 저장합니다.
    results = [x.strip() for x in result.split('\n') if x]
    used_memory, total_memory, gpu_utilization, temperature = map(int, results[device_id].split(','))
    return used_memory, total_memory, gpu_utilization, temperature


###########################################################################
# server starting
###########################################################################

def load_exps(u_id):
    global exp_list, el, exp, client_exp
    exp_list = [Exp(None, id=ep, user=u_id) for ep in os.listdir(f"./users/{u_id}/experiments")]
    exp_list.sort(key=lambda x: float(x.created_at), reverse=True)
    data = [ep.summary() for ep in exp_list]
    el = Logger(f"./users/{u_id}/log/")
    server_log("load_exps", data)
    
    # for ep in exp_list:
    #     print(ep.summary())

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_check_for_gpu())
    asyncio.create_task(check_disk_usage())
    asyncio.create_task(periodic_check_for_timeout())
async def periodic_check_for_gpu():
    print("start periodic check: gpu")
    from datetime import datetime
    global exp
    all_util = []
    all_temp = []
    cnt = 0
    while True:
        print("check for gpu")
        if exp:
            current_time = datetime.now().timestamp()
            used, total, util, temp = get_gpu_usage()
            exp.state.add_callback("gpu", {"used": used, "total": total, "util": util, "temp": temp, "time": current_time})
            all_util.append(float(util))
            all_temp.append(float(temp))
            cnt += 1
            if cnt == 30:
                print("all util", all_util, "all temp", all_temp)
                utilization = sum(all_util)/len(all_util)
                temperature = sum(all_temp)/len(all_temp)
                exp.state.check_cond(utilization=utilization, temperature=temperature)
                # exp.state.check_cond(utilization=sum(all_util)/len(all_util), temperature=sum(temp)/len(temp))
                all_util = []
                all_temp = []
                cnt = 0
        await asyncio.sleep(10)


async def check_disk_usage():
    print("Starting disk usage monitoring")
    from datetime import datetime
    while True:
        if exp:
            disk = psutil.disk_usage('/')
            used_percent = disk.percent
            used_gb = disk.used / (1024 * 1024 * 1024)  # Convert to GB
            total_gb = disk.total / (1024 * 1024 * 1024)  # Convert to GB
            
            current_time = datetime.now().timestamp()
            exp.state.add_callback("disk", {"used": used_gb, "total": total_gb, "util": used_percent, "time": current_time})

            exp.state.check_cond(disk_usage=used_percent)
            print(f"Disk usage: {used_percent:.1f}% ({used_gb:.1f}GB / {total_gb:.1f}GB)")
        
        await asyncio.sleep(300)

async def periodic_check_for_timeout():
    print("start periodic check: timeout")
    from datetime import datetime
    global exp_list
    
    while True:
        await asyncio.sleep(30)
        print("====================== periodic check for timeout")
        print("check for time out")
        for ep in exp_list:
            ep.state.check_timeout()
            await send_callbacks(ep.id)
                

@app.get('/')
async def main():
    return {"message": "Welcom to BOHB server!"}

###########################################################################
# push subscribe
###########################################################################
from pywebpush import webpush

@app.post('/subscribe')
async def subscribe(request: Request):
    global subs, exp, curr_user, client_exp, client_exp, el
    data = await request.json()
    sub = str(data)
    # print("subscribe", sub)
    subs.add(sub)
    # print("subs length:", len(subs))
    # el.log("Subscribe", ip=request.client.host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=sub)
    server_log("subscribe", ip=request.client.host,  data=sub)
    if exp:
        exp.state.subs = subs
        
    return {"success": True}


@app.post('/test/push')
async def test_push(request: Request):
    global subs
    data = await request.json()
    # print("test push", data)
    sub = json.loads(data)
    res = webpush(sub, data='{"key": "test_noti", "value": {"content": "Target accuracy 0.351 has been reached. Now: 0.452", "id": -1}, "CALLBACK": "https://vis.skku.edu/read"}',
                vapid_private_key=PRIVATE_KEY,
                vapid_claims={"sub": "mailto:hdh12345@g.skku.edu"})
    return {"success": True}


    
@app.post("/visibility")
async def visibility(request: Request):
    global exp_list, el, exp, client_exp
    data = await request.json()
    page = data['page']
    server_log("visibility", ip=request.client.host, data=data)
    print("visibility checking...." , data)
    if client_exp is None :
        print("visibility checking.... no experiment selected")
        return {"success": False, "message": "No experiment is selected"}
    else:
        print("visibility updating....", data, client_exp.id)
        visibility_exp = next((e for e in exp_list if e.id == client_exp.id), None)
        if visibility_exp is None:
            return {"success": False, "message": "Experiment not found"}
        visibility_exp.state.add_callback("visibility", data)
        visibility_exp.save()
        # send_callbacks(visibility_exp.id)
        await send_callbacks(visibility_exp.id)

    return {"success":True}
    

@app.post("/capture")
async def capture(request: Request):
    global exp_list, el, exp, client_exp
    data = await request.json()
    capture_exp = next((e for e in exp_list if e.id == data['expId']), None)
    capture_exp.capture(data)
    return {"success": True}
###########################################################################
# login and authentication
###########################################################################

# 활성 사용자 세션 관리
active_sessions = {}  # {user_id: {"login_time": timestamp, "last_activity": timestamp}}

def validate_user_exists(user_id: str) -> bool:
    """사용자 디렉토리가 존재하는지 확인"""
    return os.path.exists(f"./users/{user_id}")

def create_user_directories(user_id: str) -> bool:
    """사용자 디렉토리 구조 생성"""
    try:
        base_path = f"./users/{user_id}"
        os.makedirs(base_path, exist_ok=True)
        os.makedirs(f"{base_path}/experiments", exist_ok=True)
        os.makedirs(f"{base_path}/log", exist_ok=True)
        os.makedirs(f"{base_path}/config", exist_ok=True)
        os.makedirs(f"{base_path}/trash", exist_ok=True)
        
        # 기본 설정 파일 복사 (존재하는 경우)
        if os.path.exists("./config/list.json"):
            shutil.copy("./config/list.json", f"{base_path}/config/list.json")
        if os.path.exists("./config/kernel_info.json"):
            shutil.copy("./config/kernel_info.json", f"{base_path}/config/kernel_info.json")
            
        return True
    except Exception as e:
        print(f"사용자 디렉토리 생성 실패: {e}")
        return False

def update_user_activity(user_id: str):
    """사용자 활동 시간 업데이트"""
    if user_id in active_sessions:
        active_sessions[user_id]["last_activity"] = time.time()

# HTTP Bearer token 스키마
security = HTTPBearer(auto_error=False)

async def get_current_user(request: Request, token: HTTPBearer = Depends(security)):
    """
    현재 인증된 사용자를 반환하는 의존성 함수
    토큰이 없거나 유효하지 않으면 None 반환
    """
    # Authorization 헤더에서 토큰 추출
    auth_header = request.headers.get("Authorization")
    user_token = None
    
    if auth_header and auth_header.startswith("Bearer "):
        user_token = auth_header.split(" ")[1]
    elif token and token.credentials:
        user_token = token.credentials
    
    # URL 쿼리 파라미터에서도 토큰 확인 (필요한 경우)
    if not user_token:
        user_token = request.query_params.get("token")
    
    if not user_token:
        return None
    
    # 토큰 검증 (현재는 사용자 ID와 동일)
    if validate_user_exists(user_token) and user_token in active_sessions:
        update_user_activity(user_token)
        return user_token
    
    return None

async def require_auth(current_user: str = Depends(get_current_user)):
    """
    인증이 필요한 엔드포인트에서 사용하는 의존성
    인증되지 않은 경우 401 오류 발생
    """
    if not current_user:
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please login first."
        )
    return current_user

async def get_optional_user(current_user: str = Depends(get_current_user)):
    """
    인증이 선택적인 엔드포인트에서 사용하는 의존성
    인증되지 않아도 None 반환
    """
    return current_user

@app.get("/login/{id}")
async def login(id: str, request: Request):
    global curr_user
    client_host = request.client.host
    
    print(f"로그인 시도: {id} from {client_host}")
    
    if not id or len(id.strip()) == 0:
        return {"success": False, "message": "사용자 ID가 필요합니다"}
    
    id = id.strip()
    
    if not validate_user_exists(id):
        return {"success": False, "message": "존재하지 않는 사용자입니다"}
    
    try:
        # 현재 사용자 설정 및 실험 로드
        if curr_user != id:
            curr_user = id
            load_exps(id)
        
        # 세션 정보 업데이트
        current_time = time.time()
        active_sessions[id] = {
            "login_time": current_time,
            "last_activity": current_time,
            "ip": client_host
        }
        
        server_log("user_login", ip=client_host, data={"user_id": id, "login_time": current_time})
        
        return {
            "success": True, 
            "message": "로그인 성공",
            "user_id": id,
            "login_time": current_time
        }
        
    except Exception as e:
        print(f"로그인 처리 중 오류: {e}")
        server_log("login_error", ip=client_host, data={"user_id": id, "error": str(e)})
        return {"success": False, "message": "로그인 처리 중 오류가 발생했습니다"}

@app.get("/add_user/{id}/{pw}")
async def add_user(id: str, pw: str, request: Request):
    client_host = request.client.host
    
    print(f"회원가입 시도: {id} from {client_host}")
    
    if not id or len(id.strip()) == 0:
        return {"success": False, "message": "사용자 ID가 필요합니다"}
    
    if not pw or len(pw.strip()) == 0:
        return {"success": False, "message": "비밀번호가 필요합니다"}
    
    id = id.strip()
    
    # 간단한 비밀번호 검증 (실제 운영에서는 더 강력한 검증 필요)
    if pw != "xoals0409!":
        return {"success": False, "message": "잘못된 비밀번호입니다"}
    
    if validate_user_exists(id):
        return {"success": False, "message": "이미 존재하는 사용자 ID입니다"}
    
    try:
        if create_user_directories(id):
            server_log("user_signup", ip=client_host, data={"user_id": id})
            return {
                "success": True, 
                "message": "회원가입이 완료되었습니다",
                "user_id": id
            }
        else:
            return {"success": False, "message": "사용자 계정 생성에 실패했습니다"}
            
    except Exception as e:
        print(f"회원가입 처리 중 오류: {e}")
        server_log("signup_error", ip=client_host, data={"user_id": id, "error": str(e)})
        return {"success": False, "message": "회원가입 처리 중 오류가 발생했습니다"}

@app.get("/check_token/{token}")
async def check_token(token: str, request: Request):
    client_host = request.client.host
    
    if not token or len(token.strip()) == 0:
        return {"success": False, "message": "토큰이 필요합니다"}
    
    token = token.strip()
    
    # 현재는 토큰이 사용자 ID와 동일하게 처리
    if not validate_user_exists(token):
        return {"success": False, "message": "유효하지 않은 토큰입니다"}
    
    # 세션 확인 및 활동 시간 업데이트
    if token in active_sessions:
        update_user_activity(token)
        return {
            "success": True, 
            "message": "유효한 토큰입니다",
            "user_id": token,
            "last_activity": active_sessions[token]["last_activity"]
        }
    else:
        return {"success": False, "message": "세션이 만료되었습니다"}

@app.get("/logout/{user_id}")
async def logout(user_id: str, request: Request):
    global curr_user
    client_host = request.client.host
    
    if user_id in active_sessions:
        del active_sessions[user_id]
    
    if curr_user == user_id:
        curr_user = None
    
    server_log("user_logout", ip=client_host, data={"user_id": user_id})
    
    return {
        "success": True, 
        "message": "로그아웃되었습니다"
    }

@app.get("/session/info")
async def get_session_info(request: Request):
    """현재 활성 세션 정보 반환 (관리자용)"""
    client_host = request.client.host
    
    # 간단한 세션 정보만 반환 (보안상 민감한 정보 제외)
    session_summary = {
        "active_users": len(active_sessions),
        "current_user": curr_user,
        "sessions": {
            user_id: {
                "login_time": session["login_time"],
                "last_activity": session["last_activity"]
            }
            for user_id, session in active_sessions.items()
        }
    }
    
    return {
        "success": True,
        "data": session_summary
    }
###########################################################################
# load initial information for client
###########################################################################
@app.get("/global_page")
def global_page():
    global global_page
    global_page = "noti"
    return {"success": True, "data": global_page}

@app.get("/load_information")
async def load_information(current_user: str = Depends(require_auth)):
    global exp_list, client_exp, exp, last_state, global_page
    
    try:
        with open(f"./users/{current_user}/config/list.json", "r") as f:
            exp_option = json.load(f)
        with open(f"./users/{current_user}/config/kernel_info.json", "r") as f:
            kernel_info = json.load(f)

        exp_summary_list = [ep.summary() for ep in exp_list]
        curr_exp = None

        if client_exp != None:
            print("!!!!!!!!!!!!!!!!!!!!!! load information", client_exp.id)
        
        if client_exp:
            for _exp in exp_list:
                if _exp.id == client_exp.id:
                    curr_exp = _exp.to_json()
        
        if exp is not None:
            client_exp['runningExp'] = exp.id

        data = {"exp_option": exp_option, "exp_list": exp_summary_list, "curr_exp": curr_exp,  "kernel_info": kernel_info, "global_page": global_page}
        global_page = None
        return {"success": True, "data": data}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="사용자 설정 파일을 찾을 수 없습니다")
    except Exception as e:
        print(f"정보 로드 중 오류: {e}")
        raise HTTPException(status_code=500, detail="정보 로드 중 오류가 발생했습니다")

@app.get("/load_kernel")
async def load_kernel(current_user: str = Depends(require_auth)):
    try:
        with open(f"./users/{current_user}/config/kernel_info.json", "r") as f:
            kernel_info = json.load(f)
        return {"success": True, "kernel_info": kernel_info}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="커널 정보 파일을 찾을 수 없습니다")
    except Exception as e:
        print(f"커널 정보 로드 중 오류: {e}")
        raise HTTPException(status_code=500, detail="커널 정보 로드 중 오류가 발생했습니다")

###########################################################################
# load experiment setting for new experiment
###########################################################################
# @app.get("/new_exp/{model}/{dataset}")
# async def new_exp(model: str, dataset: str):
#     if model == "mnist_kernel" and dataset == "mnist":
#         with open("./config/mnist_kernel.json", "r") as f:
#             data = json.load(f)

#     await broadcast([{"key": "options", "value": data, "id": str(uuid4())}])
#     return {"success": True}

###########################################################################
# Experiment methods: add, get, delete, start
###########################################################################

async def manage_exp(request, exp_id, action, immediately=False):
    global exp, exp_list, reserved, el, client_exp, restore_trial, curr_trial
    if request is None:
        client_host = None
    else:
        client_host = request.client.host
    if exp is None: # 진행중인 실험이 없을 때
        if action == "start":
            exp = next((e for e in exp_list if e.id == exp_id), None)
            exp.start()
            server_log("start_exp", ip=client_host, data={"exp_id": exp.id})
            await send_callbacks(exp.id)
        elif action == "resume":
            exp = next((e for e in exp_list if e.id == exp_id), None)
            exp.resume()
            server_log("resume_exp", ip=client_host, data={"exp_id": exp.id})
            await send_callbacks(exp.id)
    else: # 진행중인 실험이 있을 때
        if immediately:
            # exp.auto_pause()
            # server_log("pause_exp", ip=client_host, data={"exp_id": exp.id})
            # reserved.insert(0, exp.id)
            # server_log("reserve_exp", ip=client_host, data={"exp_id": exp.id, "reserved": reserved})

            # 현재 실행 중인 실험 일시정지
            old_exp = exp
            exp.pause()
            # Only restore BOHB trials, not user trials
            if curr_trial and not curr_trial.is_user_trial:
                exp.restore_trial(restore_trial, curr_trial)
            elif curr_trial and curr_trial.is_user_trial:
                # Notify client that user trial was killed
                user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
                if user_trial_exp:
                    curr_trial.end_time = datetime.now().timestamp()
                    kill_data = curr_trial.to_dict()
                    kill_data['status'] = 'killed'
                    kill_data['loss'] = 'None'
                    kill_data['metric'] = 'None'
                    user_trial_exp.state.add_callback("trialKilled", kill_data)
                    print(f"User trial {curr_trial.id} killed due to experiment switch")
            server_log("pause_exp", ip=client_host, data={"exp_id": exp.id})
            await send_callbacks(old_exp.id)
            
            # 새 실험 즉시 시작
            exp = next((e for e in exp_list if e.id == exp_id), None)
            if action == "start":
                exp.start()
                server_log("start_exp", ip=client_host, data={"exp_id": exp.id})
            elif action == "resume":
                exp.resume()
                server_log("resume_exp", ip=client_host, data={"exp_id": exp.id})
            await send_callbacks(exp.id)
        else:
            start_exp = next((e for e in exp_list if e.id == exp_id), None)
            start_exp.reserve()
            reserved.append(start_exp.id)
            server_log("reserve_exp", ip=client_host, data={"exp_id": start_exp.id, "reserved": reserved})
            await send_callbacks(start_exp.id)

    data = [ep.summary() for ep in exp_list]
    await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])

@app.post("/new_exp/add")
async def add_experiment(request: Request, data: dict, current_user: str = Depends(require_auth)):
    global exp_list, curr_user, exp, client_exp, reserved, el
    client_host = request.client.host
    
    # 현재 사용자 설정
    curr_user = current_user
    
    server_log("add_exp", ip=client_host, data=data)
    newExp = Exp(data, user=current_user)
    newExp.load()
    newExp.state.init_info()
    newExp.save()
    exp_list.insert(0, newExp)

    await manage_exp(request, newExp.id, "start")
    return {"success": True}


    # id = newExp.id
    # if exp is None: # 진행중인 실험이 없을 때
    #     exp = next((e for e in exp_list if e.id == id), None)
    #     exp.start()
    #     server_log("start_exp", ip=client_host, data={"exp_id": exp.id})
    #     await send_callbacks(exp.id)

    # else: # 진행중인 실험이 있을 때
    #     start_exp = next((e for e in exp_list if e.id == id), None)
    #     start_exp.reserve()
    #     reserved.append(start_exp.id)
    #     server_log("reserve_exp", ip=client_host, data={"exp_id": start_exp.id, "reserved": reserved})
    #     await send_callbacks(start_exp.id)
    # data = [ep.summary() for ep in exp_list]
    # await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
    # with open(f"./users/{curr_user}/config/kernel_info.json", "r") as f:
    #     kernel_info = json.load(f)
    # return {"success": True,  "kernel_info": kernel_info }

@app.post("/redefine_exp/add")
async def add_redefine_experiment(request: Request, data: dict, current_user: str = Depends(require_auth)):
    global exp_list, curr_user, exp, client_exp, reserved, el
    client_host = request.client.host
    

    client_exp.redefine(data)
    # 현재 사용자 설정
    curr_user = current_user
    
    server_log("add_exp", ip=client_host, data=data)
    newExp = Exp(data, user=current_user)
    newExp.load()
    newExp.state.init_info()
    newExp.save()
    exp_list.insert(0, newExp)

    await manage_exp(request, newExp.id, "start")
    return {"success": True}

@app.post("/new_exp/add_launch")
async def add_experiment_launch(request: Request, data: dict, current_user: str = Depends(require_auth)):
    global exp_list, curr_user, exp, reserved, subs, el
    client_host = request.client.host
    
    # 현재 사용자 설정
    curr_user = current_user
    
    server_log("launch_immediately_exp", ip=client_host, data=data)
    newExp = Exp(data, user=current_user)
    newExp.load()
    newExp.state.init_info()
    newExp.save()
    exp_list.insert(0, newExp)
    id = newExp.id
    await manage_exp(request, id, "start", immediately=True)
    return {"success": True}

@app.post("/redefine_exp/add_launch")
async def add_redefine_experiment_launch(request: Request, data: dict, current_user: str = Depends(require_auth)):
    global exp_list, curr_user, exp, reserved, subs, el
    client_host = request.client.host
    
    client_exp.redefine(data)
    
    # 현재 사용자 설정
    curr_user = current_user
    
    server_log("launch_immediately_exp_redefine", ip=client_host, data=data)
    newExp = Exp(data, user=current_user)
    newExp.load()
    newExp.state.init_info()
    newExp.save()
    exp_list.insert(0, newExp)
    id = newExp.id
    await manage_exp(request, id, "start", immediately=True)
    return {"success": True}
    # if exp is None: # 진행중인 실험이 없을 때
    #     exp =  next((e for e in exp_list if e.id == id), None)
    #     exp.start()
    #     server_log("start_exp", ip=client_host, data={"exp_id": exp.id})
    #     await send_callbacks(exp.id)

    # else: # 진행중인 실험이 있을 때
    #     exp.auto_pause()
    #     server_log("pause_exp", ip=client_host, data={"exp_id": exp.id})
    #     reserved.insert(0, exp.id)
    #     server_log("reserve_exp", data={"exp_id": exp.id, "reserved": reserved})

    #     start_exp = next((e for e in exp_list if e.id == id), None)
    #     reserved.insert(0, start_exp.id)
    #     server_log("reserve_exp", ip=client_host, data={"exp_id": start_exp.id, "reserved": reserved})
    #     await send_callbacks(exp.id)
    # data = [ep.summary() for ep in exp_list]
    # await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
    # with open(f"./users/{curr_user}/config/kernel_info.json", "r") as f:
    #     kernel_info = json.load(f)
        
    # return {"success": True,  "kernel_info": kernel_info }

@app.get("/exp/get/{id}")
async def get_experiment(request: Request, id: str):
    global exp_list, client_exp, exp, curr_user , el
    client_host = request.client.host
    get_exp = next((e for e in exp_list if e.id == id), None)
    if get_exp:
        client_exp = get_exp
        server_log("get_exp", ip=client_host, data={"exp_id": id})
        data = get_exp.to_json()
        data['runningExp'] = exp.id if exp  else None
        return data
    else:
        server_log("get_exp_fail", ip=client_host, data={"exp_id": id})
        return {"success": False}

@app.get("/exp/delete/{id}")
async def delete_experiment(request: Request, id: str):
    global exp_list, exp, curr_user, reserved, el
    client_host = request.client.host
    # global que
    print("delete experiment", id)
    if exp and exp.id == id:
        exp.pause()
        server_log("pause_exp", ip=client_host, data={"exp_id": id})
        await send_callbacks(id)
    if reserved and id in reserved:
        reserved.remove(id)
        server_log("unreserve_exp", ip=client_host, data={"exp_id": id, "reserved": reserved})
    if os.path.exists(f"./users/{curr_user}/experiments/{id}"):
        os.makedirs(f"./users/{curr_user}/trash/{id}")
        try:
            shutil.move(f"./users/{curr_user}/experiments/{id}", f"./users/{curr_user}/trash/{id}")
        except:
            return {"success": False}
    exp_list = [ep for ep in exp_list if ep.id != id]
    data = [ep.summary() for ep in exp_list]
    server_log("delete_exp", ip=client_host, data={"exp_id": id})
    await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
    return {"success": True}

@app.get('/exp/start/{id}')
async def exp_start(request: Request, id: str):
    await manage_exp(request, id , "start", immediately=True)
    return {"success": True}


@app.get('/exp/pause/{id}')
async def exp_pause(request: Request, id: str):
    global exp, exp_list, reserved, curr_trial, el, client_exp, restore_trial
    client_host = request.client.host   
    if exp and exp.id == id:
        exp.pause()
        # Only restore BOHB trials, not user trials
        if curr_trial and not curr_trial.is_user_trial:
            exp.restore_trial(restore_trial, curr_trial)
        elif curr_trial and curr_trial.is_user_trial:
            # Notify client that user trial was killed
            user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
            if user_trial_exp:
                curr_trial.end_time = datetime.now().timestamp()
                kill_data = curr_trial.to_dict()
                kill_data['status'] = 'killed'
                kill_data['loss'] = 'None'
                kill_data['metric'] = 'None'
                user_trial_exp.state.add_callback("trialKilled", kill_data)
                print(f"User trial {curr_trial.id} killed due to experiment pause")
        server_log("pause_exp", ip=client_host, data={"exp_id": id})
    else :
        pause_exp = next((e for e in exp_list if e.id == id), None)
        pause_exp.pause()
        # Only restore BOHB trials, not user trials
        if curr_trial and not curr_trial.is_user_trial:
            pause_exp.restore_trial(restore_trial, curr_trial)
        elif curr_trial and curr_trial.is_user_trial:
            # Notify client that user trial was killed
            if pause_exp:
                curr_trial.end_time = datetime.now().timestamp()
                kill_data = curr_trial.to_dict()
                kill_data['status'] = 'killed'
                kill_data['loss'] = 'None'
                kill_data['metric'] = 'None'
                pause_exp.state.add_callback("trialKilled", kill_data)
                print(f"User trial {curr_trial.id} killed due to experiment pause")
        server_log("pause_exp", ip=client_host, data={"exp_id": id})

    await send_callbacks(id)
    data = [ep.summary() for ep in exp_list]
    await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
    return {"success": True}

@app.get('/exp/reserve/{id}')
async def exp_reserve(request: Request, id: str):
    await manage_exp(request, id, "reserve")
    return {"success": True}

@app.get('/exp/unreserve/{id}')
async def exp_unreserve(request: Request, id: str):
    global exp, exp_list, reserved, curr_trial, el, client_exp
    client_host = request.client.host
    print("unreserve experiment", id)
    unreserve_exp = next((e for e in exp_list if e.id == id), None)
    if id in reserved:
        reserved.remove(id)
    unreserve_exp.unreserve()
    server_log("unreserve_exp", ip=client_host, data={"exp_id": id, "reserved": reserved})
    await send_callbacks(id)
    data = [ep.summary() for ep in exp_list]
    await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
    return {"success": True}

@app.get('/exp/resume/{id}')
async def exp_resume(request: Request, id: str):
    await manage_exp(request, id, "resume", immediately=True)
    return {"success": True}


###########################################################################
# User methods: user trial, narrow configspace
###########################################################################

@app.post('/trial/user')
async def trial_user(request: Request, data:dict):
    global subs, user_trial_que, el, exp_list, client_exp, exp, curr_user, restore_trial, curr_trial
    client_host = request.client.host
    user_exp_id = data['exp_id']
    user_trial_exp = next((e for e in exp_list if e.id == user_exp_id), None)
    user_trial_exp.state.subs = subs
    # config = {}
    # for hparam in data['config']:
    #     for h in user_trial_exp.state.configspace.hyperparameters:
    #         if h.name == hparam['name']:
    #             if h.dont_pass:
    #                 pass
    #             else:
    #                 config[hparam['name']] = hparam['value'][0]
    # user_trial = {
    #     'exp_id': user_trial_exp.id,
    #     'id': data['id'],
    #     'iter': data['iter'],
    #     'config': config
    #     }
    user_trial_exp.restore_trial(restore_trial, curr_trial)
    user_trial = user_trial_exp.add_user_trial(data)
    # el.log("Add User Trial", ip=client_host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=user_trial)
    server_log("add_user_trial", ip=client_host, data=user_trial)
    user_trial_que.put((0, user_trial))

    await send_callbacks(user_trial_exp.id)
    return {"success": True}
    
    
@app.post('/narrow_configspace')
async def narrow_configspace(request: Request, data: dict):
    global exp_list, el, exp, client_exp, curr_user
    client_host = request.client.host
    exp_id = data['exp_id']
    narrow_configspace_exp = next((e for e in exp_list if e.id == exp_id), None)
    narrow_configspace_exp.narrow_configspace(data['config'])
    # el.log("Narrow Configspace", ip=client_host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=data)
    server_log("narrow_configspace", ip=client_host, data=data)
    await send_callbacks(narrow_configspace_exp.id)
    return {"success": True}

###########################################################################
# Notification condition methods: add, edit, delete
###########################################################################
@app.post("/add_condition")
def add_condition(request:Request, data: dict):
    global exp_list, el, exp, client_exp, curr_user
    client_host = request.client.host
    cond_exp = next((e for e in exp_list if e.id == data["exp_id"]), None)
    cond_exp.add_condition(data)
    # el.log("Add Condition", ip=client_host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=data)
    server_log("add_condition", ip=client_host, data=data)
    
    return {"success": True}

@app.post("/edit_condition")
def edit_condition(request:Request, data: dict): # data = {"id": uuid, "active": True/False}
    global exp_list, el, exp, client_exp, curr_user

    cond_exp = next((e for e in exp_list if e.id == data["exp_id"]), None)
    cond_exp.edit_condition(data)
    # el.log("Edit Condition", ip=request.client.host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=data)
    server_log("edit_condition", ip=request.client.host, data=data)
    return {"success": True}

@app.post("/remove_condition")
def delete_condition(request:Request, data: dict): # data = {"id": uuid}
    global exp_list, el, exp, client_exp, curr_user
    cond_exp = next((e for e in exp_list if e.id == data["exp_id"]), None)
    cond_exp.remove_condition(data)
    # el.log("Remove Condition", ip=request.client.host, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=data)
    server_log("delete_condition", ip=request.client.host, data=data)

    return {"success": True}


@app.post('/log')
async def log(request:Request):
    # print("log", request)
    payload = await request.json()
    # print(payload)
    event_name, data = payload["event_name"], payload["data"]
    host = request.client.host

    server_log(event_name, ip=host, data=data)

    # direction, event_name, data = payload["direction"], payload["event_name"], payload["data"]

    # print(event_name, data)
    # el.log(direction, event_name, data)
    

    return {'success': True}

def server_log(event_name, ip=None, data=None):
    global el, exp, client_exp, curr_user
    if el is None:
        return
    el.log(event_name, ip=ip, user_id=curr_user, curr_exp=exp, client_exp=client_exp, data=data)

###########################################################################
# Worker methods: get trial, register trial, report trial
###########################################################################

@app.get('/trials/first')
async def trials_first():
    global exp, curr_trial, reserved, user_trial_que, el, client_exp, restore_trial
    trial = None
    if user_trial_que.qsize() != 0:
        trial = user_trial_que.get()
        restore_trial = trial
        trial = trial[1]
        user_exp_id, trial_id, budget, config = trial['exp_id'], trial['id'], trial['iter'], trial['config']
        user_exp = next((e for e in exp_list if e.id == user_exp_id), None)
        user_exp.state.current_trial_type = 'user'
        curr_trial = Trial(trial_id, -1, -1, -1, config, budget, user_exp_id, True, user_exp.model, user_exp.dataset)
        # curr_trial.start_time = datetime.now().timestamp()
        # user_exp.state.current_trial = curr_trial
        return {"success": True, "trial":[-1, -1, -1]}
    elif exp:  # exp = None인 부분 확인하기
        if exp.exp_state == EXP_PAUSED or exp.exp_state == EXP_AUTO_PAUSED or exp.que.qsize() == 0:
            exp = None
            return {"success": False}
        else:
            if exp.state.current_trial != None and exp.state.current_trial.is_paused:
                print("current trial is paused trial ============================================")
                curr_trial = exp.state.current_trial
                # Check if it's a paused user trial - if so, skip it and get next BOHB trial
                if curr_trial.is_user_trial:
                    print("Skipping paused user trial, getting next BOHB trial")
                    exp.state.current_trial = None  # Clear the paused user trial
                    # Continue to get next BOHB trial below
                else:
                    # It's a paused BOHB trial, restore it
                    exp.state.current_trial_type = 'bohb'
                    return {"success": True, "trial":[curr_trial.bracket_id, curr_trial.round_id, curr_trial.trial_id]}
            trial = exp.que.get()
            restore_trial = trial 
    else:
        if (reserved):
            id= reserved.pop(0)
            server_log("unreserve_exp", data={"exp_id": id, "reserved": reserved})
            _exp = next((e for e in exp_list if e.id == id), None)
            if _exp and (_exp.exp_state == EXP_PAUSED or _exp.exp_state == EXP_AUTO_PAUSED):
                await exp_resume(None, id)
            elif _exp and _exp.exp_state == EXP_FINISED:
                return {"success": False}
            else:
                await exp_start(None, id)
        print("There is no experiment running")
        return{"success": False}
    
    if trial[1] == f"{exp.id} end":
        exp.end()
        server_log("finish_exp", data={"finish exp id": exp.id})
        await send_callbacks(exp.id)
        exp = None
        curr_trial = None
        data = [ep.summary() for ep in exp_list]
        await broadcast([{"key": "experiment_list", "value": data, "id": str(uuid4())}])
        return {"success": False}
    elif trial:
        exp.state.current_trial_type = 'bohb'
        trial = trial[1]
        curr_trial = Trial(str(uuid4()), trial[0], trial[1], trial[2])
        exp.state.current_trial = curr_trial
        return {"success": True, "trial":trial}
    else:
        print("There is no experiment running")
        return{"success": False}



@app.get('/trials/register')
async def register_trial():
    global exp, curr_trial, exp_list

    if curr_trial is None:
        return {"success": False}
    if  curr_trial and curr_trial.is_user_trial:
        data = {"params": curr_trial.config, "budget": curr_trial.budget, "model": curr_trial.model, "dataset": curr_trial.dataset, "curr_exp": curr_trial.exp_id, "sample": "none"}
    elif curr_trial.is_paused:
        print("current trial is paused trial ============================================ register_trial")
        data = {"params": curr_trial.config, "budget": curr_trial.budget, "model": exp.model, "dataset": exp.dataset, "curr_exp": exp.id, "sample": curr_trial.sample}
    else:
        print("current trial is not paused trial ============================================ step")
        exp.state, ret = exp.opt.step(exp.state)
        await send_callbacks(exp.id)
        if ret==None:
            return # experiment done
        print("current trial id: ", curr_trial.id)
        print(f"current event: {curr_trial.bracket_id}-{curr_trial.round_id}-{curr_trial.trial_id}")

        curr_trial.config=ret[0].to_dict()
        curr_trial.budget=int(exp.state.r_i)
        curr_trial.sample=ret[1]
        data = {"params": ret[0].to_dict(), "budget": int(exp.state.r_i), "model": exp.model, "dataset": exp.dataset, "curr_exp": exp.id, "sample": ret[1]}
    
    if curr_trial.is_user_trial:
        user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
        print("current user trial id: ", curr_trial.id)
        curr_trial.start_time = datetime.now().timestamp()
        user_trial_exp.state.add_callback("trialStart", curr_trial.to_dict())
        user_trial_exp.save()
        await send_callbacks(user_trial_exp.id)
    else:
        exp.state.current_trial = curr_trial
        exp.state.current_trial_type = 'bohb'
        curr_trial.start_time = datetime.now().timestamp()
        exp.state.add_callback("trialStart", curr_trial.to_dict())
        exp.save()
        await send_callbacks(exp.id)

    
    return {"success":True, "data": data}



@app.get('/trials/report/result/{loss}/{metric}', tags=['loss', 'metric'])
async def trials_report(loss: float, metric: float):
    global exp, curr_trial, el, client_exp, curr_user, exp_list, restore_trial
    if curr_trial is None:
        return {"success": False}  
    if curr_trial.is_user_trial:
        server_log("finish_user_trial", data={"exp_id": curr_trial.exp_id, "config": curr_trial.config,"loss": loss, "metric": metric})
        user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
        await user_trial_exp.report_trial(curr_trial, loss, metric, True)
        await send_callbacks(user_trial_exp.id)
        
        # Clear restore_trial if it was a user trial to prevent infinite user trial loop
        if restore_trial and len(restore_trial) > 1 and restore_trial[1].get('exp_id') == curr_trial.exp_id:
            restore_trial = None
            print("Cleared restore_trial after user trial completion")
        
        # Clear current trial after user trial completion
        curr_trial = None
        print("Cleared curr_trial after user trial completion")
    else:
        if (exp.exp_state == EXP_PAUSED or exp.exp_state == EXP_AUTO_PAUSED):
            print("experiment is paused, cannot report result")
            return {"success": True}
        else:
            server_log("finish_bohb_trial", data={"id": f"[{curr_trial.bracket_id}, {curr_trial.round_id}, {curr_trial.trial_id}]", "config": curr_trial.config, "loss": loss, "metric": metric})
            await exp.report_trial(curr_trial, loss, metric)

            trials = exp.trials_for_shap()
            # SHAP 분석
            if len(trials) >= 2:  # 최소 2개 trial 필요
                shap_result = await hpo_shap_analysis.calculate_shap_value(trials)
                
                if shap_result:  # None이 아닌 경우
                    # 이제 shap_result는 JSON 직렬화 가능한 dict
                    exp.state.add_callback("shap", shap_result)
                    print("SHAP 분석 결과가 클라이언트로 전송되었습니다.")
                else:
                    print("SHAP 분석 실패 또는 데이터 부족")
            else:
                print("SHAP 분석을 위한 trial 수 부족")

            curr_trial = None
            exp.state.current_trial = None
            await send_callbacks(exp.id)
    
    return {"success":True}

@app.get('/trials/report/progress/{curr_epoch}/{total_epoch}', tags=['curr_epoch', 'total_epoch'])
async def trials_report(curr_epoch: int, total_epoch: int):
    global exp, curr_trial, el, client_exp, curr_user, exp_list
    if curr_trial is None:
        return {"success": False}  
    if curr_trial.is_user_trial:
        user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
        user_trial_exp.report_progress(curr_trial, curr_epoch, total_epoch)
        await send_callbacks(user_trial_exp.id)
    else:
        if (exp.exp_state == EXP_PAUSED or exp.exp_state == EXP_AUTO_PAUSED):
            print("experiment is paused, cannot report progress")
        else:
            exp.report_progress(curr_trial, curr_epoch, total_epoch)
            await send_callbacks(exp.id)
    
    return {"success":True}

@app.get('/trials/paused/{exp_id}', tags=["exp_id"])
async def trials_paused(exp_id: str):
    global exp, curr_trial, el, client_exp, curr_user, exp_list, restore_trial, user_trial_que
    print("check if paused", exp_id)
    # if curr_trial.is_user_trial:
    #     return {"paused": False}
    paused_exp = next((e for e in exp_list if e.id == exp_id), None)

    if paused_exp.exp_state == EXP_PAUSED or paused_exp.exp_state == EXP_AUTO_PAUSED or user_trial_que.qsize() != 0:
        print("experiment is paused")
        return {"paused": True}
    else:
        print("experiment is not paused")
        return {"paused": False}

@app.post('/trials/report/error')
async def error_report(data:dict):
    err_msg = data["error"]
    global exp, curr_trial, el, client_exp, curr_user, exp_list, restore_trial
    
    if curr_trial.is_user_trial:
        server_log("error_user_trial", data={"exp_id": curr_trial.exp_id, "config": curr_trial.config, "error": err_msg})
        user_trial_exp = next((e for e in exp_list if e.id == curr_trial.exp_id), None)
        user_trial_exp.report_error(curr_trial, err_msg, True)
        await send_callbacks(user_trial_exp.id)
        
        # Clear restore_trial if it was a user trial to prevent infinite user trial loop
        if restore_trial and len(restore_trial) > 1 and restore_trial[1].get('exp_id') == curr_trial.exp_id:
            restore_trial = None
            print("Cleared restore_trial after user trial error")
        
        # Clear current trial after user trial error
        curr_trial = None
        print("Cleared curr_trial after user trial error")
    else:
        server_log("error_bohb_trial", data={"id": f"[{curr_trial.bracket_id}, {curr_trial.round_id}, {curr_trial.trial_id}]", "config": curr_trial.config, "error": err_msg})
        exp.report_error(curr_trial, err_msg)
        await send_callbacks(exp.id)
    return {"success":True}
   

# uvicorn main:socket_app --port 8888
# https: uvicorn main:socket_app --host 0.0.0.0 --port 8999 --ssl-keyfile ../client-files/private.key --ssl-certfile ../client-files/certificate.pem
if __name__=="__main__":
    args = get_params()
    # uvicorn.run("main:socket_app", host=args.host, port=args.port, ssl_keyfile="../client-files/localhost+2-key.pem", ssl_certfile="../client-files/localhost+2.pem")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=args.port, ssl_keyfile="./private.pem", ssl_certfile="./certificate.pem")
