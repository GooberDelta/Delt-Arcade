function logout() {
    fetch("/auth/logout", {
    method: 'POST',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => console.log(data))
}
