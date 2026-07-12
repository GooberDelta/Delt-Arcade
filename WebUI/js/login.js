let uri = "http://127.0.0.1:8000"

function login() {
    let errmsg = document.getElementById("error_message");
    let userbody = document.getElementById("un");
    let passbody = document.getElementById("pw");
    const response = fetch(uri + "/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username:userbody.value, 
        password:passbody.value 
        }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    })
    console.log(response.status);
    if (response.status == "200 OK") {
      window.location("/dashboard/overview")
    }
    else if (response.status == "401 Unauthorized") {
      errmsg.style.display = "block";
      errmsg.textContent = "Unauthorized"
      console.error("The server responded with 401.")
    }
    else {
      errmsg.style.display = "block";
      errmsg.textContent = "The server cannot be reached, please check the console for more information."
      console.error("Couldn't Connect to server.")
    }
}