// Replace after Render deploy:
const API = "https://YOUR-RENDER-URL.onrender.com";

async function requestOTP(){
  const identifier = document.getElementById("identifier").value;
  const res = await fetch(API + "/request-otp", {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({identifier})
  });
  document.getElementById("otpMsg").innerText = "OTP sent (check Render logs)";
}

async function verifyOTP(){
  const identifier = document.getElementById("identifier").value;
  const otp = document.getElementById("otp").value;

  const res = await fetch(API + "/verify-otp", {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({identifier,otp})
  });

  const j = await res.json();
  if(j.sessionToken){
    localStorage.setItem("session", j.sessionToken);
    document.getElementById("verifyMsg").innerText = "Verified ✔";
  } else {
    document.getElementById("verifyMsg").innerText = j.error;
  }
}

async function vote(choice){
  const sessionToken = localStorage.getItem("session");

  const res = await fetch(API + "/vote", {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({sessionToken, choice})
  });

  const j = await res.json();
  document.getElementById("voteMsg").innerText = j.message || j.error;
}

async function getResults(){
  const key = document.getElementById("adminkey").value;

  const res = await fetch(API + "/admin/results?key=" + key);
  const j = await res.json();
  document.getElementById("resultBox").innerText = JSON.stringify(j,null,2);
}
