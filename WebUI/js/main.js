function authenticate() {
    fetch("/auth/me", {
    method: 'GET',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => console.log(data))
}

function cookie_check() {
  fetch("/auth/default/cook_login", {
    method: 'GET',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => console.log(data))
}

async function gud() {
  const response = await fetch("/auth/me", {
    method: 'GET',
    credentials: 'include'
  })
  const userinfo = response.json()
  let displayName = userinfo.displayName
  let username = userinfo.username
  let name = userinfo.name
  let admincheck = userinfo.isAdmin
  
}
