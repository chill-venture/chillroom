// Start Resizer between video and chat bar
const resize = document.getElementById("dragMe")
const leftSide = resize.previousElementSibling
const rightSide = resize.nextElementSibling

// The current position of mouse
let x = 0
let y = 0

// Width of left side
let leftWidth = 0

// Handle the mousedown event
// that's triggered when user drags the resizer
const mouseDownHandler = function (e) {
    // Get the current mouse position
    x = e.clientX
    y = e.clientY
    leftWidth = leftSide.getBoundingClientRect().width

    // Attach the listeners to `document`
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)
}

const mouseMoveHandler = function (e) {
    // How far the mouse has been moved
    const dx = e.clientX - x
    const dy = e.clientY - y

    const newLeftWidth =
        ((leftWidth + dx) * 100) /
        resize.parentNode.getBoundingClientRect().width
    leftSide.style.width = `${newLeftWidth}%`

    document.body.style.cursor = "col-resize"
    leftSide.style.userSelect = "none"
    leftSide.style.pointerEvents = "none"

    rightSide.style.userSelect = "none"
    rightSide.style.pointerEvents = "none"
}

const mouseUpHandler = function () {
    resize.style.removeProperty("cursor")
    document.body.style.removeProperty("cursor")

    leftSide.style.removeProperty("user-select")
    leftSide.style.removeProperty("pointer-events")

    rightSide.style.removeProperty("user-select")
    rightSide.style.removeProperty("pointer-events")

    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener("mousemove", mouseMoveHandler)
    document.removeEventListener("mouseup", mouseUpHandler)
}

// Attach the handler
// Export the handler
export function resizer() {
    resize.addEventListener("mousedown", mouseDownHandler)
}

// End resizer
