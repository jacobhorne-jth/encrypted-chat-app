from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class PublicKeyUpdate(BaseModel):
    username: str
    public_key: str
