function setTheme(theme) {
    let button = document.getElementById("btn-darkmode");
    if (theme === "light") {
        document.getElementById("css-dark").rel = "stylesheet alternate";
        button.innerHTML = "🌙";
    } else if (theme === "dark") {
        document.getElementById("css-dark").rel = "stylesheet";
        button.innerHTML = "☀️";
    }
}

window.onload = function() {
    let currentTheme = localStorage.getItem("theme");
    setTheme(currentTheme);
}

let isInEditMode = false;
function togglePostEdit() {
    let postDesc = document.getElementById("postdesc");
    postDesc.style.display = isInEditMode ? "block" : "none";
    let editPostForm = document.getElementById("editpostform");
    editPostForm.style.display = isInEditMode ? "none" : "block";
    let postDescForm = document.getElementById("postdescform");
    postDescForm.innerHTML = postDesc.innerHTML;
    let editButton = document.getElementById("editbtn");
    editButton.innerHTML = isInEditMode ? "Edytuj" : "Anuluj";
    isInEditMode = !isInEditMode;
}

function toggleTheme() {
    let currentTheme = localStorage.getItem("theme");
    if(currentTheme === undefined || currentTheme === null) {
        currentTheme = "light";
    }
    if (currentTheme === "dark") {
        currentTheme = "light";
    } else {
        currentTheme = "dark";
    }
    setTheme(currentTheme);
    localStorage.setItem("theme", currentTheme);
}

async function rate(id, score)
{
    //console.log("Rating " + id + " with " + score);
    const response = await fetch('/addrating', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ artid: id, rating: score })
    });
    console.log(response);
    if (response.ok) {
        const data = await response.json();
        document.getElementById("ratingtext").innerHTML = `<b>${data.rating}</b>`;
    } else if(response.status == 500) {
        response.text().then(text => {
            alert(text);
        });
    } else if(response.status == 401) {
        alert("Musisz być zalogowany aby ocenić post!");
    }
}