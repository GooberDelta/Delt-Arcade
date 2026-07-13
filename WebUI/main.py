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
from fastapi import FastAPI, APIRouter, HTTPException, status, Depends, Response, Cookie, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import bcrypt
from typing import Annotated


# Dotenv loading...
load_dotenv()
# Sets some defaults here.
MONGO_URI = os.environ.get('MONGO_URI')
SECRET_KEY = "t0JqrdAbsTnoobKbxk7ZEtP66G4hsXbSQTJiA8itMpWdHmshWywfZWRSDRxcNroc3jOqH7ycm0bKsIBuFQNoVkJK4kI9kbYEFzOozCAGvvXDwQcSym6VcJzjGENv03G7qVZBM7ChEg0RSA9BNipgxRuX4HEPeWTV" # for sanity I am setting my own secret.
ALGORITHM = "HS256" # Setting an algorithm to encode in for login tokens.
TOKEN_EXPIRE_HOURS = 8 # Change this based on how long you want tokens to expire.

#Mongo DB Work
client = pymongo.MongoClient("mongodb://100.127.8.21:27017")
db = client.get_database('Delt-Arcade')


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
    username: str 
    password: str 

class UserPublic(BaseModel):
    username: str 
    display_name: Optional[str] = "Delt-Arcade User"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Hypothetically, all should work. Do not delete any files, and nothing should go wrong.
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")


## Pages (This is mainly hosting purposes.)
@app.get("/", tags=["Hosting"])
async def root():
    return RedirectResponse(url="/auth/cook_login") # URL Redirect to the login

@app.get("/login", tags=["Hosting"])
async def login_page():
    return FileResponse("login.html", media_type="text/html")
    

@app.get("/register", tags=["Hosting"])
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
    return FileResponse("dashboard_admin.html", media_type="text/html")

@app.get("/account", tags=["Hosting"])
async def account_page():
    return FileResponse("account.html", media_type="text/html")

@app.get("/admin", tags=["Hosting"])
async def root():
    return FileResponse("dashboard_admin_root.html", media_type="text/html")

@app.get("/admin/card-manager", tags=["Hosting"])
async def root():
    return FileResponse("dashboard_admin_cardmanage.html", media_type="text/html")

@app.get("/admin/account-manager", tags=["Hosting"])
async def root():
    return FileResponse("dashboard_admin_accountmanage.html", media_type="text/html")

@app.get("/admin/game-manager", tags=["Hosting"])
async def root():
    return FileResponse("dashboard_admin_gamemanage.html", media_type="text/html")

@app.get("/admin/arcade-manager", tags=["Hosting"])
async def root():
    return FileResponse("dashboard_admin_arcademanage.html", media_type="text/html")    

## Authentication

@app.get("/auth/cook_login")
async def cookie_read(session_token:Annotated[str| None, Cookie()] = None):
    user_col = db["userData"]
    if user_col.find_one({"token": session_token}):
        return RedirectResponse(url="/dashboard/overview")
    else:
        return RedirectResponse(url="/login")
   
@app.get("auth/me")
async def user_info(session_token:Annotated[str| None, Cookie()] = None):
    if session_token == None:
        RedirectResponse("/login")
    else:
        user_col = db["UserData"]
        results = user_col.find_one({"token": session_token}) 
        username = results["username"]
        display_name = results["displayname"]
        return({"username": username, "display_name": display_name})





@app.post("/auth/login")
async def login_function(body:LoginUser, response:Response):
   user_col = db["userData"]
   found_user = user_col.find_one({"username": body.username})
   if not found_user or not bcrypt.checkpw(body.password.encode(), found_user["hash"].encode()):
        raise HTTPException(400, "Invalid Credentials")
   
   token = jwt.encode({"user_id": found_user["user_id"]}, SECRET_KEY, algorithm=ALGORITHM)
   response.set_cookie(key="session_token", value=token )
   return {"message":"Login Successful!"}

@app.post("/auth/register")
async def register_function(body:RegisterUser):
    user_col = db["userData"]
    # Check for email, and if one is found, send an error.
    if user_col.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email is already in use.")
    # Checks for username, if one is found, send an error.
    if user_col.find_one({"username": body.username}):
        raise HTTPException(status_code=400, detail="Username is already in use.")

    # Start building the things needed for the account
    hashed_pw = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    uid = str(uuid.uuid4())
    token = jwt.encode({"userid":uid}, SECRET_KEY, algorithm=ALGORITHM)

    user_col.insert_one({
        "user_id": uid,
        "email": body.email,
        "hash": hashed_pw.decode(),
        "token": token,
        "displayname": body.display_name,
        "username": body.username
        })
    response.set_cookie(key="session_token",value=token)
    return {"token": token, "user_id": uid}


