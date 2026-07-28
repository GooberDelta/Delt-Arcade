// guifd, theme_output, and get_all_cards from dashboard-cards.js, modified for use on dashboard
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

async function theme_output(theme = String) {
  // This is an internal function that will help in the long run. it's pretty simple. Set any themes in here for the card, and then set the filename. i.e. themeName:fileName
  const theme_list = {teal: 'card_teal.png', purple: 'card_purple.png', teal_and_purple: "teal-and-purple-card.png"}
  try {
    return(theme_list[theme])
  }
  catch {
    return("Item not found.")
  }
}


async function get_all_cards(uid) {
  const response = await fetch("/api/card/get_cards/" + uid, {
    method: 'GET',
    credentials: 'include'
  });
  const responsej = await response.json();
  const allCards = await responsej.cardsOwned;
  console.log(allCards);
  const div = document.getElementById("Card-List");
  if (allCards.length > 0) {div.innerHTML = "";}
  for (let i=0; i < allCards.length; i++) {
    cardid = allCards[i]
    //All Net Request Vars
    const response = await fetch("/api/card/get_card/" + cardid);
    const responsej = await response.json();
    const friendlyName = responsej.friendlyName;
    const theme = responsej.theme;
    const balance = responsej.balance;
    // Editing WebUI
    console.log(theme)
    const image_file_name = await theme_output(theme)
    const element = document.createElement("div")
    element.classList.add("card_dashboard_list")
    element.innerHTML = '<img src="/assets/webpage/' + image_file_name + '" style="height:50px;padding-left: 40px;"><p style="padding-right: 20px;">' + friendlyName + '</p><p><b>Balance: ' + balance + ' credits</b></p>'
    div.appendChild(element)
    

  }

}
