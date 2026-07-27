function authcheck() {
  fetch("/auth/default/cook_login", {
    method: 'GET',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => console.log(data))
}
//gud = GetUserData
async function gud() {
  const response = await fetch("/auth/me", {
    method: 'GET',
    credentials: 'include'
  })
  const userinfo = await response.json()
  let displayName = userinfo.display_name
  let username = userinfo.username
  let name = userinfo.name
  let admincheck = userinfo.isAdmin
  let user_id = userinfo.user_id
  let user_pfp_location = userinfo.user_pfp_location
  console.log("displayname: " + displayName + " username: " + username + " name: " + name + "isadmin?: " + admincheck + " User ID: " + user_id + " User PFP filename: " + user_pfp_location)
  let displayNametext = document.getElementById("displayname")
  let dddisplay = document.getElementById('ddisplay')
  let usernametext = document.getElementById("username")
  let nametext = document.getElementById("nameTextHeader")
  let nav = document.getElementById("nav")
  let pfp = document.getElementById("profile-picture")
  if (admincheck == "true") {
    const newitem = document.createElement("li")
    newitem.innerHTML = '<a class="admin-button" href="/admin">Admin Panel</a>' //Adds the custom button
  }
  // required to have catch for nothing to happen, as you cannot have several "try"s linked
  try {displayNametext.innerHTML = displayName}
  catch{}
  try {usernametext.innerHTML = "@" + username}
  catch{}
  try{nametext.innerHTML = name}
  catch{}
  try{dddisplay.innerHTML = username + '</name><img src="/assets/webpage/dropdown_arrow.png"></button>'}
  catch{}
  try{pfp.src = "/assets/webpage/" + user_pfp_location}
  catch{console.warn("Profile Picture could not be loaded. Attempted to load: " + user_pfp_location)}
}
