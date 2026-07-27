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






import os, uuid, pymongo, time, json
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
    },
    {
        "name": "Cards",
        "description": "API Related to cards."
    },
    {
        "name": "Games",
        "description": "API Related to games."
    },
    {
        "name": "Arcade Info",
        "description": "API Related to arcade info."
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

class cardData(BaseModel):
    card_id: str
    user_id: str
    theme: str
    isMaintanence: bool


# Hypothetically, all should work. Do not delete any files, and nothing should go wrong.
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")


## Pages (This is mainly hosting purposes.)
@app.get("/", tags=["Hosting"])
async def root():
    return RedirectResponse(url="/auth/login/cook_login") # URL Redirect to the login

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

@app.get("/logout", tags=["Hosting"])
async def root():
    return FileResponse("logout.html", media_type="text/html")   

## Authentication

@app.get("/auth/login/cook_login", tags=["Authentication"])
async def cookie_read(session_token:Annotated[str| None, Cookie()] = None):
    user_col = db["userData"]
    if user_col.find_one({"token": session_token}):
        return RedirectResponse(url="/dashboard/overview")
    else:
        return RedirectResponse(url="/login")

@app.get("/auth/default/cook_login", tags=["Authentication"])
async def cookie_read(session_token:Annotated[str| None, Cookie()] = None):
    user_col = db["userData"]
    if user_col.find_one({"token": session_token}):
        return {"message":"user authed!"}
    else:
        return RedirectResponse(url="/login")
   
@app.get("/auth/me", tags=["Authentication"])
async def user_info(session_token:Annotated[str| None, Cookie()] = None):
    if session_token == None:
        RedirectResponse("/login")
    else:
        user_col = db["userData"]
        results = user_col.find_one({"token": session_token}) 
        username = results["username"]
        displayName = results["displayname"]
        name = results["name"]
        isadmin = results["isAdmin"]
        user_id = results["user_id"]
        pfp_location = results["user_pfp_name"]
        return({"username": username, "display_name": displayName, "name":name, "isAdmin": isadmin, "user_id":user_id, "user_pfp_location": pfp_location})

@app.post("/auth/logout", tags=["Authentication"])
async def logout_user(response:Response, session_token:Annotated[str| None, Cookie()] = None):
    # Grabs column, Updates token in DB, and then removes the cookie from the person requesting.
    user_col = db["userData"]
    query = {"token": session_token}
    user_col.update_one(query, {"$set": {'token': ''}})
    response.delete_cookie(key="session_token")
    return({"Message": "User was logged out successfully!"})


@app.post("/auth/login", tags=["Authentication"])
async def login_function(body:LoginUser, response:Response):
   user_col = db["userData"]
   found_user = user_col.find_one({"username": body.username})
   if not found_user or not bcrypt.checkpw(body.password.encode(), found_user["hash"].encode()):
        raise HTTPException(400, "Invalid Credentials")
   token = jwt.encode({"user_id": found_user["user_id"]}, SECRET_KEY, algorithm=ALGORITHM)
   response.set_cookie(key="session_token", value=token )
   user_col.update_one({"username":body.username},{"$set": {"token": token}})
   return {"message":"Login Successful!"}

@app.post("/auth/register", tags=["Authentication"])
async def register_function(body:RegisterUser, response:Response):
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
        "username": body.username,
        "name": body.name,
        "isAdmin": False
        })
    response.set_cookie(key="session_token",value=token)
    return({"message":"User is now registered!"})


# Card API
@app.get("/api/card/get_card/{card_id}", tags=["Cards"])
async def master_add_card(card_id: str):
    card_col = db["cardData"]
    results = card_col.find_one({"id":card_id})
    if not results:
        return({"error":"Card was not found."})
    friendlyName = results["cardFriendlyName"]
    owner = results["owner"]
    balance = results["balance"]
    theme = results["card-look"]
    ismaintanence = results["isMaintanence"]
    return({"friendlyName":friendlyName, "owner": owner, "balance": balance, "theme": theme, "isMaintanence": ismaintanence})


@app.get("/api/card/get_cards/{user_id}", tags=["Cards"])
async def get_all_cards(user_id: str):
    user_col = db["userData"]
    user_results = user_col.find_one({"user_id":user_id})
    if not user_results:
        return({"error": "User not found."})
    cards_owned = user_results["cardsOwned"]
    return({"cardsOwned":cards_owned})


@app.post("/api/card/master/add_card", tags=["Cards"])
async def user_add_card(body:cardData, resaccountponse:Response):
    card_col = db["cardData"]
    try:
        card_col.insert_one({
            "id":body.card_id,
            "owner":body.user_id,
            "balance":0.0,
            "theme": body.theme,
            "isMaintanence": body.isMaintanence
        })
    except:
        return({"error": "Couldn't make card."})

@app.delete("/api/card/master/remove_card/{card_id}", tags=["Cards"])
async def master_remove_card(card_id: str):
    card_col = db["cardData"]
    card_result = card_col.delete_one({"id":card_id})
    if not card_result:
        return({"error":"Card Not Found"})

@app.delete("/api/card/remove_card", tags=["Cards"])
async def user_remove_card(card_id: int, user_id: str, response:Response):
    card_col = db["cardData"]
    card_col.find_one({"id":card_id})


# Account API
@app.post("/api/account/master/edit", tags=["Accounts"])
async def edit_account():
    print("WIP")

@app.delete("/api/account/master/remove", tags=["Accounts"])
async def remove_account():
    print("WIP")

@app.get("/api/account/{user_id}", tags=["Accounts"])
async def get_account_info():
    print("WIP")

# Games API
@app.post("/api/games/master/edit", tags=["Games"])
async def edit_game_info():
    print("WIP")

@app.delete("/api/games/master/remove", tags=["Games"])
async def remove_game():
    print("WIP")

@app.get("/api/games/{game_name}", tags=["Games"])
async def get_game_info():
    print("WIP")

# Arcade Info API
@app.post("/api/arcade_info/master/edit", tags=["Arcade Info"])
async def edit_arcade_info():
    print("WIP")

@app.get("/api/arcade_info", tags=["Arcade Info"])
async def get_arcade_info():
    print("WIP")