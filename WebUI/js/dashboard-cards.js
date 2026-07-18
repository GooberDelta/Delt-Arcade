const response = await fetch("/auth/me", {
    method: 'GET',
    credentials: 'include'
  })
const userid = response.userid
async function add_card() {
    const card_name_elem = document.getElementById("card_name");
    const card_id_elem = document.getElementById("card_name");
    const card_name_elem = document.getElementById("card_name");
    const card_name_elem = document.getElementById("card_name");

    
    const response = await fetch("/api/card/user/add_card", {
    method: 'POST',
    body: JSON.stringify({user_id: userid})
  });
}

async function remove_card() {
    console.log("WIP")
}
