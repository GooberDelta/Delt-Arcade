let uri = "http://127.0.0.1:8000"

function register() {
	// Form Areas.
	let username = document.getElementById("username");
	let displayName = document.getElementById("displayname");
	let email = document.getElementById("email");
	let pw = document.getElementById("pw");
	let rtpw = document.getElementById("rtpw");
	//Error message.
	let errmsg = document.getElementById("error_message");
	

	// Checking for any non-filled out info.
	if (username.value == "") {
		console.error("Username isn't filled out.");
		errmsg.style.display = "block";
		errmsg.textContent = "A username is required.";
	}
	else if (email.value == "") {
		console.error("Email isn't filled out.");
		errmsg.style.display = "block";
		errmsg.textContent = "An Email is required.";
	}
	// Checking for email
	else if (email.value.includes("@") == false) {
		console.error("Email is not real.")
		errmsg.style.display = "block";
		errmsg.textContent = "Please enter a valid email."
	}
	else if (pw.value == "") {
		console.error("No password entered.")
		errmsg.style.display = "block";
		errmsg.textContent = "A password is required.";
	}
	// Let's make sure the passwords are the same.
	else if (pw.value != rtpw.value) {
		console.error("Passwords did not match.");
		errmsg.style.display = "block";
		errmsg.textContent = "The passwords do not match.";
	}
	else {
		console.log("Registration test passed!")

		// Sending Data to backend.
		errmsg.style.display = "none";
		const response = fetch(uri + "/auth/register", {
      		method: "POST",
      		body: JSON.stringify({
        	username:username.value, 
        	password:pw.value,
        	display_name:displayName.value,
        	email:email.value 
        }),
      	headers: {
        	"Content-type": "application/json; charset=UTF-8"
      		}
    	});
    	console.log("Sent Data in a POST request.");
    	new Promise(r => setTimeout(r, 2000));
    	window.location("/dashboard/overview");
    }
}
