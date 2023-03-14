const getScript = document.currentScript
const pageTool = getScript.dataset.tool
const downloadName = ""
const lang = getScript.dataset.lang
const inputBox = document.querySelector('#Inputbox')
const fileDropBox = document.querySelector('.custom-box')
const cropModal = document.querySelector('.crop-image-modal-container')
const exampleModal = document.querySelector('.example-images-modal-container')
const workspace = document.getElementById('workspace')
const canvasPanel = document.getElementById('canvas-panel')
const download = document.querySelector('#download-button')
const form = document.querySelector('#effect-form')
let files = []
let cropWidth = null
let cropHeight = null
let cropper = null
let cropInputWidth = null
let index = 0
let cropInputHeight = null
let image = null
const showLoader = () => {
  showLoading()
}
const closeLoader = () => { }
const clickInput = (e) => {
  console.log(`#file-${e.dataset.index}`)
  document.querySelector(`#file-${e.dataset.index}`).click()
}
let featureData = null
fetch('/assets/js/photo-effects.json')
  .then((response) => response.json())
  .then((data) => {
    featureData = data.find((i) => i.name === form.dataset.featureName)
    console.log(featureData)
  })
const fileOnChange = (e) => {
  index = Number(e.dataset.index)
  let reader = new FileReader()
  reader.onload = (event) => {
    cropModal.style.display = 'flex'
    if (cropper === null) {
      cropImage(event.target.result, e.id)
    } else {
      updateCropper(event.target.result, e.id)
    }
  }
  reader.readAsDataURL(e.files[0])
}
const closeModal = () => {
  cropModal.style.display = 'none'
  document.body.style.overflow = "auto"
}
const closeExamplesModal = () => {
  exampleModal.style.display = 'none'
}
form.addEventListener('submit', (e) => {
  e.preventDefault()
  drawImage()
})
const drawInputImage = (ctx, item, indexValue) => {
  return new Promise((resolve, reject) => {
    let image = document.createElement('img')
    image.src = files[indexValue]
    image.onload = () => {
      ctx.save()
      image.width = Number(item.width)
      image.height = Number(item.height)
      if (item.filter) {
        ctx.filter = item.filter
      }
      if (item.rotate) {
        ctx.rotate((item.rotate * Math.PI) / 180)
      }
      let perspectiveKey = 'perspective' in item
      if (!perspectiveKey) {
        ctx.drawImage(
          image,
          Number(item.x),
          Number(item.y),
          image.width,
          image.height
        )
      }
      if (item.translate) {
        ctx.translate(item.translate.x, item.translate.y)
      }
      if (perspectiveKey) {
        let p = new Perspective(ctx, image)
        p.draw([
          [item.perspective.topLeft.x, item.perspective.topLeft.y],
          [item.perspective.topRight.x, item.perspective.topRight.y],
          [item.perspective.bottomRight.x, item.perspective.bottomRight.y],
          [item.perspective.bottomLeft.x, item.perspective.bottomLeft.y],
        ])
      }
      if (item.skew) {
        ctx.setTransform(1, item.skew.x, item.skew.y, 1, 0, 0)
      }
      ctx.restore()
      resolve()
    }
  })
}
const drawImage = () => {
  workspace.style.display = 'block'
  document.querySelector('#upper-panel').style.display = 'none'
  document.querySelector('#saving-data').style.display = 'flex'
  let img = new Image()
  img.src = featureData.effectImagePath
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    Promise.all(
      featureData.elements.map((item, indexValue) => {
        if (item.type === 'image') {
          return new Promise((resolve, reject) => {
            drawInputImage(ctx, item, indexValue, canvas).then(() => {
              resolve()
            })
          })
        }
      })
    ).then(() => {
      ctx.filter = 'none'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      featureData.elements.map((item, indexValue) => {
        if (item.type === 'text') {
          let myFont = new FontFace(item.font, `url(${item.fontPath})`)
          myFont.load().then(function (font) {
            ctx.save()
            document.fonts.add(font)
            let textValue = document.querySelector(`#${item.id}`).value
            if (textValue.length > 10 && item.fontSizeOption1) {
              item.fontSize = item.fontSizeOption1
            }
            if (textValue.length > 12 && item.fontSizeOption2) {
              item.fontSize = item.fontSizeOption2
            }
            if (textValue.length > 15 && item.fontSizeOption3) {
              item.fontSize = item.fontSizeOption3
            }
            if (textValue.length > 20 && item.fontSizeOption4) {
              item.fontSize = item.fontSizeOption4
            }
            ctx.font = `${item.fontSize}px ${item.font}`
            if (item.shadowColor) {
              ctx.shadowColor = `${item.shadowColor}`
            }
            if (item.shadowOffsetX) {
              ctx.shadowOffsetX = 3
            }
            if (item.shadowOffsetY) {
              ctx.shadowOffsetY = 3
            }
            if (item.shadowBlur) {
              ctx.shadowBlur = 2
            }
            if (item.rotate) {
              ctx.rotate((item.rotate * Math.PI) / 180)
            }
            ctx.textAlign = 'center'
            ctx.fillStyle = `${item.color}`
            ctx.fillText(textValue, item.x, item.y)
            ctx.restore()
          })
        }
        if (item.type === 'rectangle') {
        }
      })
      canvasPanel.innerHTML = ''
      document.querySelector('#saving-data').style.display = 'none'
      canvasPanel.appendChild(canvas)
    })
  }
}
const cropImage = (result, id) => {
  document.body.style.overflow = "hidden"
  let image = new Image()
  image.onload = () => {
    let img = document.createElement('img')
    img.src = result
    img.id = 'image'
    document.querySelector('.crop-image-modal-body').appendChild(img)
    cropper = new Cropper(img, {
      viewMode: 3,
      ready() {
        let find = featureData.elements.find((i) => i.id === id)
        console.log(find)
        cropper.setAspectRatio(Number(find.width) / Number(find.height))
        cropModal.style.display = 'flex'
        this.cropper.crop()
      },
      crop(event) {
        cropWidth = Math.round(event.detail.width)
        cropHeight = Math.round(event.detail.height)
      },
    })
  }
  image.src = result
}
const updateCropper = (result, id) => {
  cropper.destroy()
  document.querySelector('.crop-image-modal-body').innerHTML = ''
  cropImage(result, id)
}
document.querySelector('#crop').addEventListener('click', () => {
  let cropperImg = cropper
    .getCroppedCanvas({
      width: cropWidth,
      height: cropHeight,
    })
    .toDataURL()
  files[index - 1] = cropperImg
  document.querySelector(`#image-pre-${index}`).src = cropperImg
  document.querySelector(`#image-pre-${index}`).style.display = 'block'
  document.querySelector(`#cam-${index}`).style.display = 'none'
  cropModal.style.display = 'none'
  document.body.style.overflow = "auto"
})
const openExamplesModal = () => {
  exampleModal.style.display = 'flex'
}
let inputFile = ''
const handleFile = (file) => {
  cropModal.style.display = 'flex'
  document.querySelector('#file-loader').style.display = 'flex'
  document.querySelector('.file-input').style.display = 'none'
  inputFile = file
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target.result) {
        cropImage(e.target.result)
      }
    }
    reader.readAsDataURL(file)
  }
}
const showLoading = () => {
  document.querySelector('#file-loader').style.display = 'flex'
  document.querySelector('.file-input').style.display = 'none'
}
const stopLoading = () => {
  fileDropBox.style.display = 'none'
}
download.addEventListener('click', () => {
  let canvas = document.querySelector('canvas')
  let url = canvas.toDataURL(`image/png`)
  let a = document.createElement('a')
  a.href = url
  a.download = `${downloadName}-image.png`
  document.body.appendChild(a)
  a.click()
  if (lang === 'en') {
    window.location.href = `/download?tool=${pageTool}`
  } else {
    window.location.href = `/${lang}/download?tool=${pageTool}`
  }
})