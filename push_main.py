import pymongo, threading, logging, queue, time, pynput, pygetwindow
from pynput import keyboard
import tkinter as tk
from PIL import Image, ImageTk

#Setting up logger and queue
logger = logging.getLogger("Delts-DIY-Scanner")
scene_q = queue.Queue()
card_q = queue.Queue()
def pynput_task(sq, cq):
    # Troubleshooting output.
    print("[debug] Starting pynput keyboard listener")
    # Debug systems!
    is_reading_card = False
    cb = []
    def on_press(key):
        #Vars for ID System reading
        nonlocal is_reading_card, cb, cq
        #REMAKING THE SYSTEM CAUSE I CAN'T HAVE IT EASY
        try:
            kc = key.char
        except AttributeError:
            if is_reading_card == True and key == keyboard.Key.enter:
               print("Testing")
               #Append all the characters for the ID.
               scanid = "".join(cb) 
               #put card in a queue to run in the background to setup things.
               print(f"Sending {scanid} to queue to be checked.")
               cq.put(scanid)
               is_reading_card = False
               cb.clear()
            # if anything else, ignore.
            return
        if not is_reading_card:
            #Wait for the trigger.
            if kc == ".":
                print("Card tapped. Grabbing ID.")
                #Set to reading.
                is_reading_card = True
                #Set the screen correctly.
                sq.put("CARD_SCAN")
        else:
            #Time to read the data. Just append, simple work.
            print(f"[debug] input found: {kc}")
            cb.append(kc)
        
    #setup listener to work
    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()
# Sets the default screen, needed due to how tkinter processes the systems. "Unfortunate, but it's whatever." - Delta
def set_default():
    scene_q.put("GOTO_ATTRACT")
# This checks the card queue for the card scanning system.
def check_scan_queue():
    #Attempt to find an ID.
    try:
        #Check if we got an ID
        scanid = card_q.get(block=False)

        #if we get one, continue on, go verify!
        print(f"checking card and sending: {scanid}")
        check_card(scanid)
    #If queue is empty, just continue onwards and wait.
    except:
        pass
    #Run 100 ms after.
    root.after(100, check_scan_queue)

# This is the function that gets called as soon as the scan button is pressed.
def scan_card():
    def on_press(key):
        #while card is being scanned, it should be typing numbers for id after identifier.
        cb = []
        try:
            #Appends the key pressed.
            cb.append(str(key.char))
            print(key.char)
        # If there is a non-standard key, go here
        except AttributeError:
            #if keyboard enter pressed, then check card, clear buffer, and then stop running input reader.
            if key == keyboard.Key.enter:
                scannedid = "".join(cb)
                print(f"Sending {scannedid} to checker.")
                check_card(scannedid)
                return False
            else:
                pass
    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()


def process_queue():
    #checks queue for 'messages' from the listener. Used for controlling Screens.
    try:
        message = scene_q.get_nowait()
        #Check Messages and set image accordingly
        if message == "GOTO_ATTRACT":
            global cred_label
            print("Going to attract...")
            canv.itemconfig(csnl, text="")
            imagep = "attract.png"
            img_pil = Image.open(imagep)
            img_tk = ImageTk.PhotoImage(img_pil)
            canv.itemconfig(il, image=img_tk)
            canv.image = img_tk
            canv.itemconfig(cred_label, text=f"{creditneed} Credits", font=("Roboto", 41, "bold"), fill="#00FAFA")
        if message == "CARD_SCAN":
            print("Sending #2")
            imagep = "reading.png"
            img_pil = Image.open(imagep)
            img_tk = ImageTk.PhotoImage(img_pil)
            canv.itemconfig(il, image=img_tk)
            canv.itemconfig(cred_label, text="")
            canv.image = img_tk
        if message == "SUCCESS_READ":
            print("Sending #3")
            imagep = "success.png"
            img_pil = Image.open(imagep)
            img_tk = ImageTk.PhotoImage(img_pil)
            canv.itemconfig(il, image=img_tk)
            canv.image = img_tk
            canv.itemconfig(csnl, text=f"Hello {player_name}, Enjoy\n your play!", fill="#64FF34")
            canv.itemconfig(cred_label, text=f"{newcreds} Credits Left", font=("Roboto", 32, "bold"), fill="#64FF34")
            root.after(4000, set_default)
        if message == "READ_FAIL":
            print("Sending #4")
            imagep = "failure-reading.png"
            img_pil = Image.open(imagep)
            img_tk = ImageTk.PhotoImage(img_pil)
            canv.itemconfig(il, image=img_tk)
            canv.image = img_tk
            root.after(4000, set_default)
        if message == "INSUFF_BAL":
            print("Sending #5")
            imagep = "insufficient.png"
            img_pil = Image.open(imagep)
            img_tk = ImageTk.PhotoImage(img_pil)
            canv.itemconfig(il, image=img_tk)
            canv.itemconfig(cred_label, text=f"{playercredits} Credits Left", font=("Roboto", 32, "bold"), fill="#FF7F7B")
            canv.image = img_tk
            root.after(4000, set_default)
        if message == "img_6":
            print("Maintanence mode is a WIP, in turn, nothing changes.")
    except queue.Empty:
        # Nothing new, we'll check again later.
        pass
    finally:
        #Check again in 20 ms, about 50 times per second.
        #Close to instant.
        root.after(20, process_queue)
def check_card(cardid):
     #Gets the card ID from the argument, and checks it.
     q1 = {"cardid": f"{cardid}"}
     #Debug print
     print(f"Trying to find thing, cardid put in: {cardid}")
     #Checks with database
     result = cardProfiles.find_one(q1)
     #If the result of this is nothing, go to the failed to read screen.
     if result is None:
        print("NOt found")
        scene_q.put("READ_FAIL")
     else:
        global playercredits
        global newcreds
        global player_name
        playercredits = result["credits"]
        player_name = result["UserName"]
        if playercredits < creditneed:
            print("Insufficient Bal")
            scene_q.put("INSUFF_BAL")
        elif playercredits >= creditneed:
            print("Scucess")
            print("Deducting credits from user.")
            newcreds = playercredits - creditneed
            try:
                cardProfiles.update_one(q1, {'$set': {'credits':newcreds}})
            except:
                print("[Warn]: Failed to take from user. Try deducing manually")
            scene_q.put("SUCCESS_READ")
            kb = keyboard.Controller()
            try:
                app_windows = pygetwindow.getWindowsWithTitle("Project Outfox") # REPLACE WITH YOUR GAME NAME, E.X STEPMANIA, ITGMANIA
                if app_windows:
                    print("Focusing Outfox")
                    app_windows[0].activate()
                else:
                    print ("app not found")
            except Exception as e:
                print(f"Error focusing App: {e}")
            time.sleep(0.1)
            print("Pressing [") 
            kb.press("[") # REPLACE "[" WITH YOUR INSERT CREDIT BUTTON!
            time.sleep(0.1)
            print("Releasing [")
            kb.release("[")
                





    
def start_pynput_listener():
    listener_thread = threading.Thread(
        target=pynput_task,
        args=(scene_q, card_q),
        daemon=True
    )
    listener_thread.start()
def start_card_reader():
    listener_thread = threading.Thread(
        target=check_scan_queue,
        daemon=True
    )
    listener_thread.start()
def start_scanning():
    listener_thread = threading.Thread(
        target=scan_card,
        daemon=True
    )
    listener_thread.start()


def bootup():
    global creditneed
    global client
    global cardProfiles
    print("Connecting to pymongo...")
    logger.info("Connecting to pymongo...")
    uri = "[PUT YOUR MONGODB URI FOR YOUR USER HERE]" # <-
    client = pymongo.MongoClient(uri)
    try:
        print("Connecting to db...")
        logger.info("Connecting to db...")
        db = client.get_database("arcade-scanner")
        print("Grabbing Games Collection...")
        logger.info("Grabbing Games Collection...")
        game = db.get_collection("Games")
        print("Grabbing Profiles...")
        logger.info("Grabbing Profiles...")
        cardProfiles = db.get_collection("Profiles")
        q1 = {"gameName": "OutFox"} # OutFox is the default set, but you can set this to something else. make it match your DB. 
        print("Attempting to find game...")
        logger.info("Attempting to find game...")
        gamedoc = game.find_one(q1)
        try:
            print("Found game!")
            logger.info("Found game! Set Price accordingly.")
            creditneed = gamedoc["creditPrice"]
        except:
            print("Credits failed to be found. Setting to default of 5.")
            logger.warning("Credits failed to be found. Setting to default of 5.")
            creditneed = 5
        root.after(2000, set_default)
        
    except Exception as e:
        print("Couldn't pull up database, throwing error.")
        logger.error(f"{e}")
        logger.error("Possibly a PyMongo Issue, read exeception for details.")
        # Code to disable card reader goes here.

#setting up logger
logging.basicConfig(filename="latest.log", level=logging.ERROR)
#Setting up Tkinter Window
root = tk.Tk()
root.title("Delts-DIY-Scanner")
root.geometry("500x300")
root.resizable(False, False)
canv = tk.Canvas(root,width=580,height=380)
image = "boot-up.png"
ogi = Image.open(image)
tk_image = ImageTk.PhotoImage(ogi)
il = canv.create_image(0,0,image=tk_image,anchor="nw")
cred_label = canv.create_text(250, 270, text="", font=("Roboto", 41, "bold"))
csnl = canv.create_text(270, 130, text="", font=("Roboto", 32, "bold"))
canv.pack()
bootup()
start_pynput_listener()
start_card_reader()
process_queue()




root.mainloop()

