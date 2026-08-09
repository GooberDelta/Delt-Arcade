async function uploadpfp() {
    // Does an upload via a hidden input method.
    const input = document.getElementById("image_file");
    const img_pfp = document.getElementById("pfp_preview");
    await input.click()
    input.onchange = function() {
        const reader = new FileReader();
        reader.readAsDataURL(input.files[0]);
        reader.onloadend = function() {
            img_pfp.src = reader.result;
        };
    };
    
}


function showinfo() {
    const p = document.getElementById("change-text");
    const img = document.getElementById("upload-image");
    const div = document.getElementById("upload_bg");

    img.style.display = "block";
    p.style.display = "block";
    div.style.display = "block";
}

function hideinfo() {
    const p = document.getElementById("change-text");
    const img = document.getElementById("upload-image");
    const div = document.getElementById("upload_bg");

    img.style.display = "none";
    p.style.display = "none";
    div.style.display = "none";
}

async function submitinfo() {
  const dninput = document.getElementById("DN_Input");
  const uninput = document.getElementById("UN_Input");
  const emailinput = document.getElementById("EM_Input");
  const PWinput = document.getElementById("PW_Input");
  const RPWinput = document.getElementById("RPW_Input");
  const errormsg = document.getElementById("error_message");
  
  // Check for Password
  if (PWinput.value != RPWinput.value) {
    errormsg.style = "block";
    errormsg.textContent = "Passwords do not match.";
  };
  // Checks for @ symbol in emails
  if (emailinput.value.includes("@") == false) {
    errormsg.style = "block";
    errormsg.textContent = "Passwords do not match.";
  };

  // Uploads the profile picture
  const file = document.getElementById("image_file")
  if (file.files[0]) {
    const form = new FormData();
    form.append("file", file.files[0])
    fetch("/api/account/upload_pfp/",
      {
        method: "POST",
        body: form
      }

      );
  };
  const response = await fetch("/api/account/user/edit", {
    method: "POST", 
    body: JSON.stringify({
      displayname: dninput.value, 
      username: uninput.value, 
      password: PWinput.value,
      email:emailinput.value})
    }
  );
    
  if (response.message = "Success") {
    errormsg.style.backgroundColor = "#50e871"
    errormsg.style.borderColor = "#50e871"
    errormsg.textContent = "Updated profile successfully! Reloading in 5 seconds..."
    errormsg.style.display = "block";
    //setTimeout(location.reload(), 5000)

  }
  else {
    errormsg.textContent = "Error:" + errormsg.message
  }
}

async function gud() {
  const response = await fetch("/auth/me", {
    method: 'GET',
    credentials: 'include'
  })
  const userinfo = await response.json()
  let displayName = userinfo.display_name
  let username = userinfo.username
  let name = userinfo.name
  let admincheck = userinfo.isAdmin
  let user_id = userinfo.user_id
  let user_pfp_location = userinfo.user_pfp_location
  let email = userinfo.email
  console.log("displayname: " + displayName + " username: " + username + " name: " + name + "isadmin?: " + admincheck + " User ID: " + user_id + " User PFP filename: " + user_pfp_location)
  let displayNametext = document.getElementById("displayname")
  let dddisplay = document.getElementById('ddisplay')
  let usernametext = document.getElementById("username")
  let nametext = document.getElementById("nameTextHeader")
  let nav = document.getElementById("nav")
  let pfp = document.getElementById("profile-picture")
  if (admincheck == "true") {
    const newitem = document.createElement("li")
    newitem.innerHTML = '<a class="admin-button" href="/admin">Admin Panel</a>' //Adds the custom button
  }
  // required to have catch for nothing to happen, as you cannot have several "try"s linked
  try {displayNametext.innerHTML = displayName}
  catch{}
  try {usernametext.innerHTML = "@" + username}
  catch{}
  try{nametext.innerHTML = name}
  catch{}
  try{dddisplay.innerHTML = username + '</name><img src="/assets/webpage/dropdown_arrow.png"></button>'}
  catch{}
  try{pfp.src = "/assets/profile_picture/" + user_pfp_location}
  catch{console.warn("Profile Picture could not be loaded. Attempted to load: " + user_pfp_location)}

  //Edited part, adds the area to edit info
  const dninput = document.getElementById("DN_Input");
  const uninput = document.getElementById("UN_Input");
  const emailinput = document.getElementById("EM_Input");
  const PWinput = document.getElementById("PW_Input");
  const RPWinput = document.getElementById("RPW_Input");

  //sets all the info for the areas
  dninput.value = displayName;
  uninput.value = username;
  emailinput.value = email;
}
