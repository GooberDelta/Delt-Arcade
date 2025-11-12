<img width="896" height="60" alt="text2-8" src="https://github.com/user-attachments/assets/a9f74ca7-d9f9-4d01-a983-5a4415838d3e" />

## A sideproject by Delta for home arcades to add immersion.
> [!WARNING]
> This is a heavy WIP system. All could change in the future. As of right now, this is where the repo stands. I do not recommend **AT ALL** using this in a real arcade.

This is a simple card scanner program that uses an RFID scanner that is PnP and acts like a USB keyboard.

## How does it work?
The program is simple, and works like so: 
1. It awaits a "." to be pressed (via a scan, as all ID's on cards start with ".")
2. It reads keyboard actions until enter is pressed via a keyboard listener (pynput).
3. It checks back with a database for the ID, and deducts credits from the user (pymongo/MongoDB).

## What do I need to run this?
This should work with any PnP (Plug n Play) RFID card reader.
1. Setup a MongoDB Server (Either setup Community Edition to run locally <ins>**OR**</ins> setup community on a server to talk back to/setup MongoDB Atlas, all methods work just fine.)
2. Set the connection URI based on the setup you have with MongoDB
3. Setup the Database "arcade-scanner" and use the 2 example collections. Import them in the collections "Games" and "Profiles".
4. Run the script. If all goes well, you should be brought to the attract screen. Your console output (if you so choose) will output "Going to attract...", and you should see something like this:
<img width="300" height="200" alt="Delt-DIY-Scanner Attract Screen" src="https://github.com/user-attachments/assets/e120f347-ad43-4b37-88b8-ff16afd62094" />

## Extra Notes:
### Code edits: 
**PLEASE READ: YOU NEED TO EDIT SOME PARTS OF THIS SCRIPT TO WORK WITH YOUR GAME OF CHOICE. AND THIS IS ONLY BUILT FOR WINDOWS. ANY OTHER VERSIONS ARE NOT OFFICIALLY SUPPORTED BY ME.**

<br><br>Some lines to edit:<br>
`(182) app_windows = pygetwindow.getWindowsWithTitle("Project Outfox") # REPLACE WITH YOUR GAME NAME, E.X STEPMANIA, ITGMANIA`<br>
`(192) kb.press("[") # REPLACE "[" WITH YOUR INSERT CREDIT BUTTON!`<br>
`(242) q1 = {"gameName": "OutFox"} # OutFox is the default set, but you can set this to something else. make it match your DB. `<br>
### Hardware Tested:

I have tested this with this reader and card from Amazon. You could probably find a better one to use, but this project works great for any generic PnP (Plug N Play) RFID card reader.
- [Card Reader](https://www.amazon.com/dp/B01MZYYDUV)
- [Cards](https://www.amazon.com/dp/B0F295RX6D)

### Trello for Progress
We now have a trello for Progress on this project. I would highly recommend viewing it if you find interest in this project.
<br>[Trello for Repo](https://trello.com/b/yHQq2UDu)
