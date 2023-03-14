const getScript = document.currentScript
const pageTool = getScript.dataset.tool
const lang = getScript.dataset.lang
const inputBox = document.querySelector('#Inputbox')
const addFiles = document.querySelector('.add-more-files')
const gdrive = document.querySelector('#filepicker')
const fileDropBox = document.querySelector('.custom-box')
const workspace = document.querySelector('.workspace')
const selectedFilesList = document.querySelector('.selectedFilesList')
const downloadButton = document.querySelector('#download-button')
const submitButton = document.querySelector('#submit-button')
const showProcessingFiles = document.querySelector('.files-processing-list')
let zipFileType = null
let renderFileTypes = null
let root = document.querySelector(':root')
root.style.setProperty('--maincolor', fileDropBox.dataset.color)


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
const dropbox = document.getElementById('dropbox')
dropbox.addEventListener(
  'click',
  async (getDropBoxFile, showLoader, closeLoader) => {
    const getFile = chooseFromDropbox()
  }
)


const getFile = (file) => {
  handleFile(file)
}
fileDropBox.addEventListener('dragover', (e) => {
  e.preventDefault()
})
fileDropBox.addEventListener('drop', (e) => {
  e.preventDefault()
  handleFile(e.dataTransfer.files[0])
})
const fileOnChange = () => {
  handleFile(file.files)
}
inputBox.onclick = function () {
  document.querySelector('#file').click()
}
const fileOnChange2 = () => {
  addMoreFiles(document.querySelector('#file2').files)
}
addFiles.onclick = function () {
  document.querySelector('#file2').click()
}
var files = []
let fileName = ''
let blobList = []
const addMoreFiles = (addFiles) => {
  handleFile(addFiles)
}
const onSubmit = (files) => {
  blobList = []
  Promise.all(
    files.map((item, index) => {
      document.querySelector(
        `#loader-${index}`
      ).innerHTML = `<span class="processing">processing</span>
            <div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>`
      return new Promise((resolve, reject) => {
        batchConversion(item, index).then(([indexValue, blob, type]) => {
          blobList.push({ blob: blob, fileName: item })
          document.querySelector(
            `#loader-${indexValue}`
          ).innerHTML = `<span class="done">finished</span>`
          document.querySelector(`#download-${indexValue}`).style.display =
            'inline-block'
          resolve()
        })
      }).catch((error) => {
        console.log(error)
      })
    })
  ).then(() => {
    document.querySelector('.bottom-section-container').style.display = 'flex'
    document.querySelector('.bottom-section-container').style.padding =
      '20px .75rem'
    document.querySelector('#download-zip').style.display = 'block'
    let zip = new JSZip()
    let zipFiles = zip.folder(`safeimagekit-batch-images`)

    blobList.map((item) => {
      zipFiles.file(
        `safeimagekit-batch-${item.fileName.name.split('.')[0]}.${zipFileType ? zipFileType : 'png'
        }`,
        getBase64String(item.blob),
        { base64: true }
      )
    })

    document.querySelector('#download-zip').addEventListener('click', () => {
      zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, `safeimagekit-batch-conversion.zip`)
        if (lang === 'en') {
          window.location.href = `/download?tool=${pageTool}`
        } else {
          window.location.href = `/${lang}/download?tool=${pageTool}`
        }
      })
    })
  })
}
let renderFileTypesHtml = ` <option value="png">png</option>
<option value="jpg">jpg</option>
<option value="jpeg">jpeg</option>
<option value="webp">webp</option>
`

const renderFiles = (files) => {
  if (renderFileTypes !== null) {
    renderFileTypesHtml = ''
    renderFileTypes.map((i) => {
      renderFileTypesHtml += `<option value="${i}">${i}</option>`
    })
  }
  files.map((file, index) => {
    if (file) {
      let filename = file.name
      if (file.name.split(".")[0].length > 10) {
        let fName = file.name.split(".")[0]
        let fExtention = file.name.split(".")[1]
        filename = fName.substr(0, 9) + "..." + fName.substr(-3) + "." + fExtention

      }
      let loader = 'Ready'
      showProcessingFiles.innerHTML += `
                        <tr>
                        <th scope="row" class="file-icon-row">
                            <img src="/assets/images/file.png" alt="file" class="file-icon">
                        </th>
                        <td class="fileName">${filename}</td>
                        <td id=loader-${index} class="file-processing"><span class="ready">${loader}</span></td>
                        <td>
                        <div class="download-format ">
        <select name="image-format" id="image-format">
           ${renderFileTypesHtml}
        </select>
    </div>
                        
                        </td>
                        <td class="file-download-button text-right">
                            <button style="display:none;" id=download-${index} data-type="image" onclick="handleDownload(this)" class="btn download-file-btn">
                            <svg class="download-icon" width="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                                        fill="currentColor">
                                        <path
                                            d="M18 20H5V15H6V19H17V15H18V20ZM12 4V15.19L14.3 13L15 13.6667L11.5 17L8 13.6667L8.7 13L11 15.19V4H12Z">
                                        </path>
                                    </svg> Download
                            </button>
                        </td>
                    </tr>
                        `
    }
  })
}

const handleFile = (file) => {
  showProcessingFiles.innerHTML = ''
  if (file) {
    for (let i = 0; i < file.length; i++) {
      files.push(file[i])
      stopLoading()
      workspace.style.display = 'block'
      document.querySelector('#file').style.display = 'block'
      let listItem = document.createElement('li')
      listItem.style.listStyle = 'none'
      let getFileSize = formatBytes(file[i].size)
      listItem.innerHTML = `${file[i].name} (${getFileSize})`
      // selectedFilesList.appendChild(listItem)
    }
  }
  renderFiles(files)
  submitButton.addEventListener('click', () => onSubmit(files))
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
const handleDownload = (e) => {
  let find = blobList[Number(e.id.replace(/^\D+/g, ''))].blob
  let fileName = blobList[Number(e.id.replace(/^\D+/g, ''))].fileName.name

  let format = document.querySelector('#image-format').value

  switch (e.dataset.type) {
    case 'image':
      let a = document.createElement('a')
      a.href = find
      a.download = `safeimagekit-batch-${fileName.split('.')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      break
    default:
      break
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

const getBase64String = (dataURL) => {
  const idx = dataURL.indexOf('base64,') + 'base64,'.length
  return dataURL.substring(idx)
}
const dataURLtoBlob = (dataurl) => {
  let arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}
