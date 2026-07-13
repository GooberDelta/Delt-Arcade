function authenticate() {
    fetch("/auth/me", {
    method: 'GET',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => console.log(data))
}
