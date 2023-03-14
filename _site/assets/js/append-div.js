function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling)
}
let themeContentBox = document.getElementById('theme-content-box')
const div = document.createElement('div')
const profitablecpmgateId = ''
div.setAttribute('id', `container-${profitablecpmgateId}`)
insertAfter(themeContentBox, div)
