
function compressGIf() {
    var superGif = new SuperGif({ gif: document.getElementById('gif') });
    superGif.load(function () {
        let imgs = []
        let canvas
        var frames = superGif.get_length();
        console.log(frames);


        // for (var i = 0; i < numFrames; i++) {
        //     canvas = superGif.get_canvas(i);
        //     imgs.push(canvas)
        //     var ctx = canvas.getContext('2d');
        //     var frameData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        //     var newCanvas = document.createElement('canvas');
        //     newCanvas.width = canvas.width;
        //     newCanvas.height = canvas.height;
        //     var newCtx = newCanvas.getContext('2d');
        //     newCtx.putImageData(frameData, 0, 0)
        //     // document.body.appendChild(newCanvas);
        // }

        // document.querySelector("#download").onclick = () => {
        //     let gif = new GIF({
        //         workers: 2,
        //         workerScript: "/js/gif.worker.js",
        //         quality: 1
        //     })
        //     for (let i = 0; i < imgs.length; i++) {
        //         gif.addFrame(canvas, { delay: 50 })
        //     }
        //     gif.on('finished', blob => {
        //         let url = URL.createObjectURL(blob)
        //         console.log(url);
        //         // let a = document.createElement('a')
        //         // a.href = url
        //         // a.download = `dummy.gif`
        //         // document.body.appendChild(a)
        //         // a.click()
        //     })
        //     gif.render()
        // }
    });
}
