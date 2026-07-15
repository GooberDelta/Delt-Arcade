async function logout() {
    const response = await fetch("/auth/logout", {
    method: 'POST',
    credentials: 'include',
  })
  const responseq = await response.json()
  if (responseq.Message == "User was logged out successfully!") {
    let text = document.getElementById("Text-logout");
    text.innerHTML = "You have been logged out! Redirecting in 5 seconds...";
    setTimeout(() => {
      window.location.href = "/login"
    }, 5000);
  }
  else {
    console.log("Failed to find response message.")
  }
}
