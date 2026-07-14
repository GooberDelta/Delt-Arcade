async function login() {
    let errmsg = document.getElementById("error_message");
    let userbody = document.getElementById("un");
    let passbody = document.getElementById("pw");
    const response = await fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username:userbody.value, 
        password:passbody.value 
        }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    })
    console.log("Status Code: " + response.status);
    if (response.status = "200") {
      window.location.href = "/dashboard/overview"
    }
    else if (response.status == "401") {
      errmsg.style.display = "block";
      errmsg.textContent = "Unauthorized"
      console.error("The server responded with 401.")
    }
    else {
      console.error("Couldn't Connect to server.")
      errmsg.style.display = "block";
      errmsg.textContent = "Couldn't connect to server."
    }
}

function authcheck () {
  let cookies = document.cookies
  fetch("/auth/login/cook_login", {
    method: 'GET',
    credentials: 'include',
  })
  .then(response => response.json())
  .then(data => console.log(data))
}

