# Delt-Arcade FastAPI
# docs are located at http://localhost:8000/docs, website is on root.
# Alternatively, if you'd like to see it via ReDoc, go to http://localhost:8000/redoc

## DO NOT TOUCH THIS SCRIPT, DOING SO COULD HARM THE BACKEND OF DELT-ARCADE. ONLY EDIT IF YOU KNOW WHAT YOU'RE DOING!

## Before someone asks, yes, this is also hosting all the files we need. Simply solution


# .env Contents:
# MONGO_URI = Set this to your mongoDB instance.
# DB_NAME=delt_arcade (This should be done already in your instance.)
# WS_KEY= Generate this on your own, but put it here. Should be long.
# SCANNER_KEY = Another secret, but for the scanner.

# If you're coming here trying to figure out how to run it, simply just run "fastapi run".






import os, uuid, pymongo
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv, dotenv_values
from pydantic import BaseModel, Field
import jwt
from jwt import PyJWTError
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional


# Dotenv loading...
load_dotenv()
# Sets some defaults here.
MONGO_URI = os.environ.get('MONGO_URI')
SECRET_KEY = os.environ.get('WS_KEY')
ALGORITHM = "HS256" # Setting an algorithm to encode in for login tokens.
TOKEN_EXPIRE_HOURS = 8 # Change this based on how long you want tokens to expire.

#Mongo DB Work
client = pymongo.MongoClient(MONGO_URI)
db = client.get_database('delt-arcade')


# Settings Tags on each for easy knowledge.

tags_metadata = [
    {
        "name": "Hosting",
        "description": "Hosts things, all you really need to know. i.e. what pages are there."
    },
    {
        "name": "Authentication",
        "description": "Authenticates users."
    }
]
 

# Defining our app to run with FastAPI, plus anything required for it!
app = FastAPI(
    title = "Delt-Arcade API",
    description="Backend API Management for the Delt-Arcade website, scanner, and kiosk.",
    version="0.1.0",
    openapi_tags=tags_metadata
) 

# Middleware for if this is hosted on a domain.
origins = [
    "http://localhost",
    "http://deltarcade.local"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class RegisterUser(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = "Delt-Arcade User"
    email: str 

class LoginUser(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6)

class UserPublic(BaseModel):
    username: str 
    display_name: Optional[str] = "Delt-Arcade User"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Hypothetically, all should work. Do not delete any files, and nothing should go wrong.
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")



# Scripts to help with things required for authentication
def hash_password(password:str) -> str:
    # Hashes password for whenever registration happens
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    # Returns True or False whenever verified.
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_hours: int = TOKEN_EXPIRE_HOURS) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    to_encode.update({"exp":expire})
    return jwt.encde(to_encode, SECRET_KEY, ALGORITHM)



def get_user(username:str):
    col = db.get_collection("UserData")
    result = col.find_one({"username": username})
    if result == None:
        return False
    else:
        return result

def authenticate_user(username:str, password:str) -> Optional[dict]:
    user = get_user(username)
    if user == False or not verify_password(password, user["hash"]):
        return None
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Couldn't validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise cred_exc
    except PyJWTError:
        raise cred_exc
    user = get_user(username)
    if not user:
        raise cred_exc
    return UserPublic(username=user["username"], display_name=user["displayname"])

## Pages (This is mainly hosting purposes.)
@app.get("/", tags=["Hosting"])
async def root():
    return RedirectResponse(url="/login") # URL Redirect to the login

@app.get("/login", tags=["Hosting"])
async def login_page():
    return FileResponse("login.html", media_type="text/html")

@app.get("/register", tags=["Hosting"])
async def registration_page():
    return FileResponse("register_human.html", media_type="text/html")

@app.get("/register-ai", tags=["Hosting"])
async def registration_page():
    return FileResponse("register.html", media_type="text/html")

@app.get("/dashboard", tags=["Hosting"])
async def dashboard_redirect():
    return RedirectResponse(url="/dashboard/overview")

@app.get("/dashboard/overview", tags=["Hosting"])
async def admin_dashboard():
    return FileResponse("dashboard_overview.html", media_type="text/html")

@app.get("/dashboard/account", tags=["Hosting"])
async def admin_dashboard():
    return FileResponse("dashboard_account.html", media_type="text/html")

@app.get("/dashboard/cards", tags=["Hosting"])
async def admin_dashboard():
    return FileResponse("dashboard_cards.html", media_type="text/html")

@app.get("/dashboard/admin", tags=["Hosting"])
async def admin_dashboard():
    return FileResponse("dashboard_overview.html", media_type="text/html")

@app.get("/account", tags=["Hosting"])
async def account_page():
    return FileResponse("account.html", media_type="text/html")

## Authentication

@app.post("/auth/login")
async def login_function(body:LoginUser):
    try:    
        try:
            # Trying to Connect to server
            col = db.get_collection("User_Data")
        except:
            raise HTTPException(403, "Couldn't connect to DB")
        try:
            # Attempting to check the user.
            results = col.find_one({"username":body.username})
            if results != None:
                # Check the username.
                if results["username"] == body.username:
                    # Check the password now.
                    if verify_password(body.password, results["hash"]):
                        create_token()

        except:
            raise HTTPException(403, "Incorrect Username or password.")
    except:
        raise HTTPException(500, "Internal Server Error")
@app.post("/auth/register")
async def register_function(body:RegisterUser):
    try:    
        hashed = hash_password(body.password)
        try:
            col = db.get_collection("User_Data")
        except:
            raise HTTPException(403, detail="Couldn't connect to DB.")
        col.insert_one({"username":body.username, 
            "hash":hashed,
            "email":body.email, 
            "displayName":body.display_name})
    except:
        raise HTTPException(500, detail="Internal Server Error.")

@app.post("/auth/me", response_model=UserPublic)
def read_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user
