from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import Session, SQLModel, create_engine, select
from passlib.context import CryptContext
from jose import jwt
from typing import List
from models import User
from schemas import UserCreate, PublicKeyUpdate
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB
sqlite_file_name = "database.db"
engine = create_engine(f"sqlite:///{sqlite_file_name}", echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def hash_password(password: str) -> str: return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

# JWT
SECRET_KEY = "jacobhorne.jth_secret_key"
def create_access_token(data: dict): return jwt.encode(data, SECRET_KEY, algorithm="HS256")

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except RuntimeError:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

@app.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    await manager.connect(websocket)
    await manager.broadcast(f"{username} joined the chat")
    try:
        while True:
            data = await websocket.receive_text()
            # Forward key payloads as-is so clients can detect them
            if data.startswith("[KEY] "):
                await manager.broadcast(data)
                continue
            # Otherwise tag as encrypted chat text
            await manager.broadcast(f"[Encrypted] {username}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"{username} left the chat")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/register")
def register(user: UserCreate):
    with Session(engine) as session:
        user_exists = session.exec(select(User).where(User.username == user.username)).first()
        if user_exists:
            raise HTTPException(status_code=400, detail="Username already exists")
        new_user = User(username=user.username, hashed_password=hash_password(user.password))
        session.add(new_user); session.commit(); session.refresh(new_user)
        return {"id": new_user.id, "username": new_user.username}

@app.post("/login")
def login(user: UserCreate):
    with Session(engine) as session:
        db_user = session.exec(select(User).where(User.username == user.username)).first()
        if not db_user or not verify_password(user.password, db_user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": db_user.username})
        return {"access_token": token, "token_type": "bearer"}

@app.post("/public_key")
def upload_public_key(data: PublicKeyUpdate):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == data.username)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.public_key = data.public_key
        session.add(user); session.commit()
        return {"message": "Public key saved"}

@app.get("/public_key/{username}")
def get_public_key(username: str):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if not user or not user.public_key:
            raise HTTPException(status_code=404, detail="Public key not found")
        return {"username": user.username, "public_key": user.public_key}
