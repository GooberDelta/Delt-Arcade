function register() {
	// Form Areas.
	let username = document.getElementById("username");
	let displayName = document.getElementById("dn");
	let pw = document.getElementById("pw");
	let rtpw = document.getElementById("rtpw");
	//Error messages.

	// Let's make sure the passwords are the same.
	if (pw.value() == rtpw.value()) {
		console.log("Passwords were verified.")
	}
	else {
		console.error("Passwords did not match.")
	}
}
