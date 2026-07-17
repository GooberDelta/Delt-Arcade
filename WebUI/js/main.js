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
  console.log("displayname: " + displayName + " username: " + username + " name: " + name + "isadmin?: " + admincheck)
  let displayNametext = document.getElementById("displayname")
  let dddisplay = document.getElementById('ddisplay')
  let usernametext = document.getElementById("username")
  let nametext = document.getElementById("nameTextHeader")
  let nav = document.getElementById("nav")
  if (admincheck == "true") {
    const newitem = document.createElement("li")
    newitem.innerHTML = '<a class="admin-button" href="/admin">Admin Panel</a>' //Adds the custom button
  }
  try {displayNametext.innerHTML = displayName}
  catch{}
  try {usernametext.innerHTML = "@" + username}
  catch{}
  try{dddisplay.innerHTML = username + '</name><img src="/assets/webpage/dropdown_arrow.png"></button>'}
  catch{}
}
