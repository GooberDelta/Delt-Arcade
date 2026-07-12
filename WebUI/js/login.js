let uri = "http://127.0.0.1:8000"

async function login() {
    let errmsg = document.getElementById("error_message");
    let userbody = document.getElementById("un");
    let passbody = document.getElementById("pw");
    const response = await fetch(uri + "/auth/login", {
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
    if (response.status = "") {
      window.location("/dashboard/overview")
    }
    else if (response.status == "401 Unauthorized") {
      errmsg.style.display = "block";
      errmsg.textContent = "Unauthorized"
      console.error("The server responded with 401.")
    }
    else {
      const data = response
      .then((result) => {
        console.log(data)
      })
      errmsg.style.display = "block";
      console.log("The data is: " + data)
      errmsg.textContent = data
      console.error("Couldn't Connect to server.")
    }
}