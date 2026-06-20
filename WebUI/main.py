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
from jose import jwt, JWTError
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, HTTPException
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

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None

class UserPublic(BaseModel):
    username: str 
    display_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


pwd_context = CryptContext(schemes=["bcrypt"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Hypothetically, all should work. Do not delete any files, and nothing should go wrong.
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
## Pages (This is mainly hosting purposes.)
@app.get("/", tags=["Hosting"])
async def root():
    return RedirectResponse(url="/login") # URL Redirect to the login

@app.get("/login", tags=["Hosting"])
async def login_page():
    return FileResponse("login_human.html", media_type="text/html")

@app.get("/register", tags=["Hosting"])
async def registration_page():
    return FileResponse("register.html", media_type="text/html")

@app.get("/dashboard-admin", tags=["Hosting"])
async def admin_dashboard():
    return FileResponse("dashboard-admin.html", media_type="text/html")

@app.get("/dashboard-guest", tags=["Hosting"])
async def guest_dashboard():
    return FileResponse("dashboard-guest.html", media_type="text/html")

@app.get("/account", tags=["Hosting"])
async def account_page():
    return FileResponse("account.html", media_type="text/html")

## Authentication

@app.post("/auth/login")
async def login_function(username:str, pw:str):
    print("Not available as of right now.")
    raise HTTPException(401, detail="Unauthorized.")

