const getScript = document.currentScript
const pageTool = getScript.dataset.tool
const lang = getScript.dataset.lang
const gdrive = document.querySelector('#filepicker')
const inputBox = document.querySelector('#Inputbox')
const fileDropBox = document.querySelector('.custom-box')
const cropBoxPanel = document.getElementById('crop-box-panel')
const downloadButton = document.querySelector('#download-button')
let cropper = null
const workspace = document.querySelector('.workspace')
const canvasPanel = document.getElementById('canvas-box-panel')
let inputFile = ''
let fileName = "";
let image = null;


const showLoader = () => {
    showLoading()
}
const closeLoader = () => { }
const mimeTypes = 'image/png,image/jpg,image/jpeg,image/webp'
const filemimes = ['.png', '.webp', '.jpg', '.jpeg']
gdrive.addEventListener(
    'click',
    (getFile, mimeTypes, showLoader, closeLoader) => {
        const data = loadPicker()
    }
)
const getDropBoxFile = (file) => {
    handleFile(file)
}
const getFile = (file) => {
    handleFile(file)
}
const fileOnChange = () => {
    handleFile(file.files[0])
}
const dropbox = document.getElementById('dropbox')
dropbox.addEventListener(
    'click',
    async (getDropBoxFile, showLoader, closeLoader) => {
        const getFile = chooseFromDropbox()
    }
)
inputBox.onclick = function () {
    document.querySelector('#file').click()
}
fileDropBox.addEventListener('dragover', (e) => {
    e.preventDefault()
})
fileDropBox.addEventListener('drop', (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
})

let canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')

const drawImage = (inputFile) => {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, image.width, image.height)
    canvas.toBlob(
        (blob) => {
            let image = new Image()
            image.src = window.URL.createObjectURL(inputFile)
            image.onload = () => {
                let img = document.createElement("img")
                img.src = URL.createObjectURL(inputFile)
                canvasPanel.appendChild(img)
            }
        }
    )

}

const handleFile = (file) => {
    let reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = function (e) {
        image = new Image()
        image.src = e.target.result
        image.onload = function () {
            drawImage(file)
            stopLoading()
            workspace.style.display = "block"
        }
    }
}

const showLoading = () => {
    document.querySelector('#file-loader').style.display = 'flex'
    document.querySelector('.file-input').style.display = 'none'
}
const stopLoading = () => {
    fileDropBox.style.display = 'none'
}
const showDropDown = document.querySelector('.file-pick-dropdown')
const icon = document.querySelector('.arrow-sign')
const dropDown = document.querySelector('.file-picker-dropdown')
showDropDown.addEventListener('click', () => {
    addScripts()
    if (dropDown.style.display !== 'none') {
        dropDown.style.display = 'none'
        icon.classList.remove('fa-angle-up')
        icon.classList.add('fa-angle-down')
    } else {
        dropDown.style.display = 'block'
        icon.classList.remove('fa-angle-down')
        icon.classList.add('fa-angle-up')
    }
})
const handleDownload = () => {
    document.getElementById('saving-data').style.display = 'block'
    canvasPanel.style.display = 'none'
    let gif = new GIF({
        workers: 2,
        workerScript: "/js/gif.worker.js",
        quality: 10
    })
    gif.addFrame(canvas, { delay: 50 })
    gif.on('finished', blob => {
        let url = URL.createObjectURL(blob)
        console.log(url);
        let a = document.createElement('a')
        a.href = url
        a.download = `${inputFile.name.split('.')[0]}-safeimagekit.${document.querySelector("#image-format").value}`
        document.body.appendChild(a)
        a.click()
    })
    gif.render()
}
downloadButton.addEventListener('click', handleDownload);