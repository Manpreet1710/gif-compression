let script = document.currentScript
const params = new URLSearchParams(window.location.search)
let type = params.get('fileName')
let jsonFileName = atob(type);
let folderName = script.dataset.foldername
let fileName = jsonFileName
let lang = script.dataset.lang

let home_h1 = document.querySelector(".home-top-h1")
let home_h2 = document.querySelector(".home-top-h2")
let home_img = document.querySelector(".home-img")

const getSeodata = async () => {
    let URL = '/data' + '/' + folderName + '/' + lang + '/' + fileName + '.json'
    const data = await fetch(URL)
    const seoData = await data.json()

    home_h1.innerHTML = seoData.h1
    home_h2.innerHTML = seoData.h2

    document.head.querySelector('meta[property="og:title"]').setAttribute("content", seoData.TITLE);
    document.head.querySelector('meta[name="description"]').setAttribute("content", seoData.META);
    document.head.querySelector('meta[name="twitter:title"]').setAttribute("content", seoData.TITLE);
    document.head.querySelector('meta[name="twitter:description"]').setAttribute("content", seoData.META);


    if (seoData.img) {
        home_img.src = seoData.img
        home_img.setAttribute("alt", seoData.imgalt)
        home_img.style.width = seoData.imgwidth
        home_img.style.height = seoData.imgheight
    }

    document.title = seoData.TITLE

}
getSeodata()