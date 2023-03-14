const button = document.getElementById('btn')
let script = document.currentScript
let fileName = script.dataset.filename
let permalink = script.dataset.permalink

const params = new URLSearchParams(window.location.search)
button.addEventListener("click", (e) => {
    window.location = window.location.protocol + "//" + window.location.host +
        `${permalink}` + '/' + "result" + '?' + 'fileName' + "=" + btoa(fileName);
})