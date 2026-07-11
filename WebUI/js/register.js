function register() {
	// Form Areas.
	let username = document.getElementById("username").value;
	let displayName = document.getElementById("dn").value;
	let email = document.getElementById("email").value;
	let pw = document.getElementById("pw").value;
	let rtpw = document.getElementById("rtpw").value;
	//Error messages.
	let errmsg = document.getElementById("error_message");
	// Checking for email
	if (email.includes("@")) {
		console.log("email is a real email.")
	}
	else {
		console.error("Email is not real.")
		errmsg.style.display = "block";
		errmsg.textContent = "Please enter a valid email."
	}
	// Let's make sure the passwords are the same.
	if (pw.value == rtpw) {
		console.log("Passwords were verified.");
	}
	else {
		console.error("Passwords did not match.");
		errmsg.style.display = "block";
		errmsg.textContent = "The passwords do not match.";
	}
}
