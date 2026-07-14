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
