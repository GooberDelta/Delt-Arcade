async function guifd() {
  // Get User ID and Fetch Data = GUIFD
  const response = await fetch("/auth/me", {
    method: 'GET',
    credentials: 'include'
  });
  const responsej = await response.json();
  const uid = responsej.user_id;
  get_all_cards(uid);

  
}


async function add_card() {
    const card_name_elem = document.getElementById("card_name");
    const card_id_elem = document.getElementById("card_id");
    
    const response = await fetch("/api/card/user/add_card", {
    method: 'POST',
    body: JSON.stringify({"user_id": userid, "card_id": card_id_elem.value})
  });
}

async function theme_output(theme = String) {
  // This is an internal function that will help in the long run. it's pretty simple. Set any themes in here for the card, and then set the filename. i.e. themeName:fileName
  const theme_list = {teal: 'card_teal.png', purple: 'card_purple.png'}
  try {
    return(theme_list[theme])
  }
  catch {
    return("Item not found.")
  }
}


async function get_card_info(card_id = String) {
  const response = await fetch("/api/card/get_card/000" + card_id);

  const responsej = await response.json()
  const friendlyName = responsej.friendlyName
  const balance = responsej.balance
  const theme = responsej.theme
  console.log(theme)
  const image_file_name = await theme_output(theme)
  

  // Adding/editing the elements.
  const details_area = document.getElementById("card-area")
  details_area.innerHTML = "" //Clearing the div element
  const html = '<h1>Currently Selected Card</h1> <br><br>\
        <p>' + friendlyName + '</p>\
        <img src="/assets/webpage/' + image_file_name + '" style="height:150px">\
        <p id ="bal">Balance: <b><bal id="baltext">' + balance + '</bal> Credits</b></p>\
        <button id="lockbutton", onclick="lock_card(' + card_id +')">Lock this Card</button>\
        <button id="removebutton" onclick="remove_card(' + card_id +')">Remove this card from your account</button>\
        </div>'
  details_area.innerHTML = html //setting all of the new elements
}

async function remove_card() {
    console.log("WIP");
}

async function start_add_process() {
  const fade_elem_popup = document.getElementById("bg_fade");
  const forum_elem_popup = document.getElementById("add_forum");

  fade_elem_popup.style("display:block;")
  forum_elem_popup.style("display:block;")
}

async function get_all_cards(uid) {
  const response = await fetch("/api/card/get_cards/" + uid, {
    method: 'GET',
    credentials: 'include'
  });
  const responsej = await response.json();
  const allCards = await responsej.cardsOwned;
  console.log(allCards);
  const list = document.getElementById("Card-List");

  for (let i=0; i < allCards.length; i++) {
    cardid = allCards[i]
    //All Net Request Vars
    const response = await fetch("/api/card/get_card/" + cardid);
    const responsej = await response.json();
    const friendlyName = responsej.friendlyName;
    const theme = responsej.theme;
    // Editing WebUI
    console.log(theme)
    const image_file_name = await theme_output(theme)
    const element = document.createElement("li", "class='cardInList'")
    element.innerHTML = '<button class="cardInList" onclick="get_card_info('+ cardid +')"> <img src="/assets/webpage/' + image_file_name + '" style="height:50px"><p style="padding-right: 20px;">' + friendlyName + '</p></button>'
    list.appendChild(element)
    

  }

}