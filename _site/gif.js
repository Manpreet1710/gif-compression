window.bridges["optimize-gif"] = function () {
    var input = { preview: null };
    var output = { data: null, preview: null };
    var inputTimer;
    var outputTimer;
    var optimizationTimer;
    var repetitions;
    var frames;
    var newSize = "<download first>";
    var outputFrames = [];
    var fileError = { title: false, message: false };
    var importOrExampleTrigger = false;
    var bridge = function () {
        var tool = this;
        var error = function (a, b) {
            tool.output.showNegativeBadge(a, b, -1);
        };
        updateDescriptions(tool, "iframes", {
            total: "",
            count: "",
            delay: "",
            size: "",
        });
        updateDescriptions(tool, "oframes", {
            total: "",
            count: "",
            delay: "",
            size: newSize,
        });
        var opts = parseOptions(tool, error);
        if (!opts) return;
        if (inputTimer) clearTimeout(inputTimer);
        if (outputTimer) clearTimeout(outputTimer);
        if (optimizationTimer) clearInterval(optimizationTimer);
        var empty = tool.input.element
            .querySelector(".side-box")
            .classList.contains("empty");

        if (empty) return;
        if (!input.preview) {
            console.log(tool);
            input.preview = tool.input.element.querySelector(".preview");
            output.preview = tool.output.element.querySelector(".preview");
            output.data = tool.output.element.querySelector(".data");
        }
        if (input.preview.width != input.preview.clientWidth) {
            input.preview.width = input.preview.clientWidth;
            input.preview.height = input.preview.clientHeight;
            output.preview.width = output.preview.clientWidth;
            output.preview.height = output.preview.clientHeight;
        }
        if (
            tool.trigger &&
            (tool.trigger == Trigger.EXAMPLE || tool.trigger == Trigger.IMPORT) &&
            tool.input.blob
        ) {
            fig.load({
                files: [tool.input.blob],
                oncomplete: function (gifs) {
                    console.log(gifs);
                    repetitions = gifs[0].repetitions;
                    frames = gifs[0].frames;
                    fileError = { title: false, message: false };
                    tool.convert();
                },
                onerror: function (file, error) {
                    if (/invalid GIF header/.test(error)) {
                        fileError.title = "Invalid File";
                        fileError.message =
                            "The input file: " + file.name + " is not a GIF file.";
                    } else {
                        fileError.title = "Problem with File";
                        fileError.message =
                            "The input file: " + file.name + " has an error: " + error;
                    }
                    tool.input.showNegativeBadge(fileError.title, fileError.message, -1);
                },
            });
            if (tool.trigger == Trigger.EXAMPLE || tool.trigger == Trigger.IMPORT)
                importOrExampleTrigger = true;
            return;
        }
        if (importOrExampleTrigger || tool.trigger == Trigger.OPTIONS) {
            newSize = "<download first>";
            importOrExampleTrigger = false;
        }
        if (fileError.title) {
            tool.input.showNegativeBadge(fileError.title, fileError.message, -1);
            return;
        }
        var frameSize = {
            width: frames[0].canvas.width,
            height: frames[0].canvas.height,
        };
        var result = createArrOfOutputFrames(frames, opts);
        if (!result.success) {
            error(result.title, result.message);
            return;
        }
        if (opts.optimize["transparency"]) {
            drawOptimizedFrames(frameSize, opts);
        }
        var iCtxPreview = input.preview.getContext("2d");
        fillTransparencyEffect(input.preview);
        var iImage = iCtxPreview.getImageData(
            0,
            0,
            input.preview.width,
            input.preview.height
        );
        var iFit = best_image_fit(
            frameSize.width,
            frameSize.height,
            input.preview.width,
            input.preview.height
        );
        var iDelays = findFrameDelays(frames);
        iCtxPreview.drawImage(
            frames[0].canvas,
            iFit.offsetX,
            iFit.offsetY,
            iFit.width,
            iFit.height
        );
        drawInputGif({
            ctxPreview: iCtxPreview,
            canvasImage: iImage,
            tool: tool,
            frames: frames,
            fit: iFit,
            play: opts.play,
            delays: iDelays,
            oldSize: fileSize(tool.input.blob.size),
        });
        output.data.width = frameSize.width;
        output.data.height = frameSize.height;
        var ctxData = output.data.getContext("2d");
        var oCtxPreview = output.preview.getContext("2d");
        fillTransparencyEffect(output.preview);
        var oImage = oCtxPreview.getImageData(
            0,
            0,
            output.preview.width,
            output.preview.height
        );
        var oFit = best_image_fit(
            frameSize.width,
            frameSize.height,
            output.preview.width,
            output.preview.height
        );
        oCtxPreview.drawImage(
            outputFrames[0].canvas,
            oFit.offsetX,
            oFit.offsetY,
            oFit.width,
            oFit.height
        );
        drawOutputGif({
            ctxPreview: oCtxPreview,
            ctxData: ctxData,
            canvasImage: oImage,
            tool: tool,
            fit: oFit,
            play: opts.play,
            optimize: opts.optimize,
        });
    };
    function drawOptimizedFrames(size, opts) {
        var count = 0;
        drawFrames();
        optimizationTimer = setInterval(drawFrames, 0);
        function drawFrames() {
            var curFrameCanvas = document.createElement("canvas");
            var curFrameCanvasCtx = curFrameCanvas.getContext("2d");
            curFrameCanvas.width = size.width;
            curFrameCanvas.height = size.height;
            curFrameCanvasCtx.drawImage(outputFrames[count].canvas, 0, 0);
            var prevDisposal = count > 0 ? outputFrames[count - 1].disposal : 1;
            if (count > 0 && prevDisposal < 2) {
                var preFrameCanvas = document.createElement("canvas");
                var preFrameCanvasCtx = preFrameCanvas.getContext("2d");
                preFrameCanvas.width = size.width;
                preFrameCanvas.height = size.height;
                preFrameCanvasCtx.drawImage(outputFrames[count - 1].canvas, 0, 0);
                preFrameCanvasCtx.drawImage(outputFrames[count - 1].optCanvas, 0, 0);
                var prePixels = preFrameCanvasCtx.getImageData(
                    0,
                    0,
                    size.width,
                    size.height
                );
                var curPixels = curFrameCanvasCtx.getImageData(
                    0,
                    0,
                    size.width,
                    size.height
                );
                optimizeTransparency(curPixels, prePixels, opts.threshold);
                curFrameCanvasCtx.clearRect(0, 0, size.width, size.height);
                curFrameCanvasCtx.putImageData(curPixels, 0, 0);
            }
            outputFrames[count]["optCanvas"] = curFrameCanvas;
            if (count == outputFrames.length - 1) clearInterval(optimizationTimer);
            count = count >= outputFrames.length - 1 ? 0 : count + 1;
        }
    }
    function drawInputGif(opts) {
        var ctxPreview = opts.ctxPreview;
        var canvasImage = opts.canvasImage;
        var tool = opts.tool;
        var frames = opts.frames;
        var fit = opts.fit;
        var play = opts.play;
        var delays = opts.delays;
        var oldSize = opts.oldSize;
        var count = 0;
        inputTimer = setTimeout(drawFrame, 0);
        function drawFrame() {
            var startTime = Date.now();
            var curCanvas = frames[count].canvas;
            var curDelay = delays[count];
            ctxPreview.putImageData(canvasImage, 0, 0);
            ctxPreview.drawImage(
                curCanvas,
                fit.offsetX,
                fit.offsetY,
                fit.width,
                fit.height
            );
            var arg = {
                total: frames.length,
                count: count + 1,
                delay: curDelay,
                size: oldSize,
            };
            updateDescriptions(tool, "iframes", arg);
            tool.input.showStatus("frame " + (count + 1) + "/" + frames.length);
            var endTime = Date.now();
            var drawTime = endTime - startTime;
            if (play) {
                var adjustedDelay = curDelay - drawTime;
                if (adjustedDelay < 0) {
                    adjustedDelay = 0;
                }
                inputTimer = setTimeout(drawFrame, adjustedDelay);
            }
            count = count >= frames.length - 1 ? 0 : count + 1;
        }
    }
    function drawOutputGif(opts) {
        var ctxPreview = opts.ctxPreview;
        var ctxData = opts.ctxData;
        var canvasImage = opts.canvasImage;
        var tool = opts.tool;
        var fit = opts.fit;
        var play = opts.play;
        var optimize = opts.optimize;
        var count = 0;
        outputTimer = setTimeout(drawFrame, 0);
        function drawFrame() {
            var startTime = Date.now();
            if (optimize.transparency && !outputFrames[count].optCanvas) {
                outputTimer = setTimeout(drawFrame, 50);
                return;
            }
            var curCanvas = optimize.transparency
                ? outputFrames[count].optCanvas
                : outputFrames[count].canvas;
            var curDelay = outputFrames[count].delay;
            var preDisposal = count > 0 ? outputFrames[count - 1].disposal : 1;
            if (preDisposal == 2) {
                ctxData.clearRect(0, 0, output.data.width, output.data.height);
            }
            ctxData.drawImage(curCanvas, 0, 0);
            tool.respond();
            ctxPreview.putImageData(canvasImage, 0, 0);
            ctxPreview.drawImage(
                output.data,
                fit.offsetX,
                fit.offsetY,
                fit.width,
                fit.height
            );
            var arg = {
                total: outputFrames.length,
                count: count + 1,
                delay: curDelay,
                size: newSize,
            };
            updateDescriptions(tool, "oframes", arg);
            tool.output.showStatus(
                "frame " + (count + 1) + "/" + outputFrames.length
            );
            var endTime = Date.now();
            var drawTime = endTime - startTime;
            if (play) {
                var adjustedDelay = curDelay - drawTime;
                if (adjustedDelay < 0) {
                    adjustedDelay = 0;
                }
                outputTimer = setTimeout(drawFrame, adjustedDelay);
            }
            count = count >= outputFrames.length - 1 ? 0 : count + 1;
        }
    }
    function optimizeTransparency(curPixels, prePixels, threshold) {
        for (var i = 0; i < prePixels.data.length; i += 4) {
            var prevColor = {
                r: prePixels.data[i + 0],
                g: prePixels.data[i + 1],
                b: prePixels.data[i + 2],
                a: prePixels.data[i + 3],
            };
            var curColor = {
                r: curPixels.data[i + 0],
                g: curPixels.data[i + 1],
                b: curPixels.data[i + 2],
                a: curPixels.data[i + 3],
            };
            var delta = rgbaDifference(prevColor, curColor);
            if (delta <= threshold) {
                curPixels.data[i + 0] = 0;
                curPixels.data[i + 1] = 0;
                curPixels.data[i + 2] = 0;
                curPixels.data[i + 3] = 0;
            }
        }
    }
    function createArrOfOutputFrames(frames, opts) {
        outputFrames = [];
        if (opts.optimize["skip-frames"]) {
            var plural = frames.length > 1 ? "s" : "";
            if (opts.framesToSkip["periodic"]) {
                var frameNum = opts.framesToSkip["start"];
                if (frameNum > frames.length || (frameNum == 1 && frames.length == 1)) {
                    var ending = findOrdinalSuffix(frameNum);
                    return {
                        success: false,
                        title: "Invalid Frame to Skip",
                        message:
                            "You want to start skip frames from {0}{1} but the GIF contain only {2} frame{3}.".format(
                                frameNum,
                                ending,
                                frames.length,
                                plural
                            ),
                    };
                }
                var skipNums = [];
                for (var i = 1; frameNum <= frames.length; i++) {
                    skipNums.push(frameNum);
                    frameNum += opts.framesToSkip["period"];
                }
            } else {
                var skipNums = opts.framesToSkip["numbers"].sort(function (a, b) {
                    return a - b;
                });
                var lastNumb = skipNums[skipNums.length - 1];
                if (lastNumb > frames.length) {
                    return {
                        success: false,
                        title: "Invalid Frame to Skip",
                        message:
                            "You want to skip frame {0} but the GIF contain only {1} frame{2}.".format(
                                lastNumb,
                                frames.length,
                                plural
                            ),
                    };
                }
            }
            var newDelays = findNewDelays(frames, skipNums);
            for (var i = 0; i < frames.length; i++) {
                if (skipNums.indexOf(i + 1) == -1) {
                    outputFrames.push({
                        canvas: frames[i].canvas,
                        delay: newDelays[i],
                        disposal: frames[i].graphicsControl.disposal,
                    });
                }
            }
        } else {
            for (var i = 0; i < frames.length; i++) {
                outputFrames.push({
                    canvas: frames[i].canvas,
                    delay: frames[i].graphicsControl.delay * 10,
                    disposal: frames[i].graphicsControl.disposal,
                });
            }
        }
        return { success: true };
    }
    function findNewDelays(frames, skipNums) {
        var lostTime = 0;
        for (var i = 0; i < skipNums.length; i++) {
            lostTime += frames[skipNums[i] - 1].graphicsControl.delay * 10;
        }
        var curDuration = 0;
        for (var i = 0; i < frames.length; i++) {
            if (skipNums.indexOf(i + 1) == -1) {
                curDuration += frames[i].graphicsControl.delay * 10;
            }
        }
        var restOfDelay = 0;
        var newDelays = [];
        for (var i = 0; i < frames.length; i++) {
            var oldDelay = frames[i].graphicsControl.delay * 10;
            var newDelay =
                oldDelay + lostTime * (oldDelay / curDuration) + restOfDelay;
            if (i == frames.length - 1) {
                var roundDelay = Math.floor(newDelay);
            } else {
                var roundDelay = Math.round(newDelay);
            }
            restOfDelay = newDelay - roundDelay;
            newDelays.push(roundDelay);
        }
        return newDelays;
    }
    function findFrameDelays(frames) {
        var delays = [];
        for (var i = 0; i < frames.length; i++) {
            delays.push(frames[i].graphicsControl.delay * 10);
        }
        return delays;
    }
    function updateDescriptions(tool, whatUpdate, opts) {
        var update = function (whatUpdate, value) {
            tool.options.describe(whatUpdate, value);
        };
        if (!frames || frames.length == 0) {
            update("iframes", "This GIF has no frames.");
            update("oframes", "This GIF has no frames.");
        } else {
            if (whatUpdate == "iframes") {
                var updateText =
                    "Total frames: {0}\n" +
                    "Current frame: {1}\n" +
                    "Current delay: {2}ms\n" +
                    "Old GIF size: {3}";
                update(
                    whatUpdate,
                    updateText.format(opts.total, opts.count, opts.delay, opts.size)
                );
            } else {
                var updateText =
                    "Total frames: {0}\n" +
                    "Current frame: {1}\n" +
                    "Current delay: {2}ms\n" +
                    "New GIF size: {3}";
                update(
                    whatUpdate,
                    updateText.format(opts.total, opts.count, opts.delay, opts.size)
                );
            }
        }
    }
    function findOrdinalSuffix(number) {
        var j = number % 10;
        var k = number % 100;
        if (j == 1 && k != 11) {
            return "st";
        }
        if (j == 2 && k != 12) {
            return "nd";
        }
        if (j == 3 && k != 13) {
            return "rd";
        }
        return "th";
    }
    function parseOptions(tool) {
        var options = tool.options.get();
        var error = function (a, b) {
            tool.output.showNegativeBadge(a, b, -1);
        };
        var optimize = {};
        var framesToSkip = {};
        var threshold = null;
        var quantizerRad = 6;
        if (options["skip-every-nth"]) {
            optimize["skip-frames"] = true;
            var period = options["nth-frame"].trim();
            if (!/^\d+$/.test(period)) {
                error(
                    "Invalid Frame to Skip",
                    "The n-th number of frame to skip is invalid number."
                );
                return false;
            }
            var period = parseInt(period);
            if (period < 2) {
                error(
                    "Invalid Frame to Skip",
                    "The n-th number of frame to skip must be greater than or equal to 2."
                );
                return false;
            }
            var startFrame = options["start-frame"].trim();
            if (!/^\d+$/.test(startFrame)) {
                error(
                    "Invalid Start Frame to Skip",
                    "The start frame to skip is invalid number."
                );
                return false;
            }
            var startFrame = parseInt(startFrame);
            if (startFrame < 1) {
                error(
                    "Invalid Start Frame to Skip",
                    "The start frame to skip must be a positive number."
                );
                return false;
            }
            var framesToSkip = { periodic: true, period: period, start: startFrame };
        } else if (options["skip-these-frames"]) {
            optimize["skip-frames"] = true;
            var frames = options["frames-to-skip"].trim();
            var range = parseRange(frames);
            if (!range.success) {
                error("Invalid Frame to Skip", range.error);
                return false;
            }
            var framesToSkip = { periodic: false, numbers: range.numbers };
            if (framesToSkip.numbers.length == 0) {
                error(
                    "Invalid Frame to Skip",
                    "The frame number to skip is not specified."
                );
            }
        }
        if (options["optimize-transparency"]) {
            optimize["transparency"] = true;
            var threshold = options["transparency-threshold"].replace(/\s*%\s*$/, "");
            if (!/^[+-]?\d*\.?\d+$/.test(threshold)) {
                error(
                    "Invalid Transparency Threshold",
                    "Threshold contains non-digits."
                );
                return false;
            }
            threshold = parseFloat(threshold);
            if (threshold < 0) {
                error(
                    "Invalid Transparency Threshold",
                    "Threshold value cannot be negative."
                );
                return false;
            }
            if (threshold > 100) {
                error(
                    "Invalid Transparency Threshold",
                    "Threshold value must be less than or equal to 100."
                );
                return false;
            }
        }
        if (options["optimize-quantizer"]) {
            optimize["quantizer"] = true;
            var quantizerRad = options["quantizer-radius"].replace(/\s*%\s*$/, "");
            if (!/^[+-]?\d*\.?\d+$/.test(quantizerRad)) {
                error(
                    "Invalid Quantizer Radius",
                    "Quantizer radius contains non-digits."
                );
                return false;
            }
            quantizerRad = parseFloat(quantizerRad);
            if (quantizerRad < 1) {
                error(
                    "Invalid Quantizer Radius",
                    "Quantizer radius must be a positive number."
                );
                return false;
            }
        }
        return {
            optimize: optimize,
            framesToSkip: framesToSkip,
            threshold: threshold,
            quantizerRad: quantizerRad,
            play: options["play"],
        };
    }
    function fillTransparencyEffect(canvas) {
        var ctx = canvas.getContext("2d");
        var w = canvas.width;
        var h = canvas.height;
        var size = 15;
        var odd = true;
        for (var i = 0; i <= w; i += size) {
            for (var j = 0; j <= h; j += size) {
                if (odd) ctx.fillStyle = "#ffffff";
                else ctx.fillStyle = "#efefef";
                odd = !odd;
                ctx.fillRect(i, j, i + size, j + size);
            }
        }
    }
    function getExtension() {
        return this.options.get().extension || "png";
    }
    function frameContainTranspPixels(frame) {
        for (var i = 0; i < frame.data.length; i += 4) {
            if (frame.data[i + 3] == 0) {
                return true;
            }
        }
        return false;
    }
    function fileSize(bytes) {
        if (bytes == 0) return "0b";
        var k = 1024;
        var sizes = ["b", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
    }
    function downloader(cb) {
        var tool = this;
        var opts = parseOptions(tool);
        tool.output.showWarningBadge(
            "Be Patient!",
            "We are preparing your GIF for download. It can take a couple of seconds.",
            -1
        );
        downloaderTimer = setTimeout(downloadFrames, 100);
        function downloadFrames() {
            if (
                opts.optimize.transparency &&
                !outputFrames[outputFrames.length - 1].optCanvas
            ) {
                outputTimer = setTimeout(downloadFrames, 50);
                return;
            }
            var width = frames[0].canvas.width;
            var height = frames[0].canvas.height;
            var solidCanvas = document.createElement("canvas");
            var solidCanvasCtx = solidCanvas.getContext("2d");
            solidCanvas.width = width;
            solidCanvas.height = height;
            var frameCanvas = document.createElement("canvas");
            var frameCanvasCtx = frameCanvas.getContext("2d");
            frameCanvas.width = width;
            frameCanvas.height = height;
            frameCanvasCtx.drawImage(outputFrames[0].canvas, 0, 0);
            var firstFrameImage = frameCanvasCtx.getImageData(0, 0, width, height);
            var firstFrameIsTransparent = frameContainTranspPixels(firstFrameImage);
            var prevDisposal = 0;
            var encoder = new GIFEncoder();
            if (repetitions !== null) encoder.setRepeat(repetitions);
            encoder.setSize(width, height);
            encoder.setQuality(opts.quantizerRad);
            encoder.start();
            for (var i = 0; i < outputFrames.length; i++) {
                if (
                    opts.optimize.transparency ||
                    firstFrameIsTransparent ||
                    prevDisposal == 2
                ) {
                    encoder.setTransparent(65535);
                    solidCanvasCtx.fillStyle = "cyan";
                    solidCanvasCtx.fillRect(0, 0, width, height);
                } else {
                    encoder.setTransparent(null);
                }
                var disposal = outputFrames[i].disposal;
                prevDisposal = disposal;
                encoder.setDispose(disposal);
                encoder.setDelay(outputFrames[i].delay);
                if (opts.optimize.transparency) {
                    var curCanvas = outputFrames[i].optCanvas;
                } else {
                    var curCanvas = outputFrames[i].canvas;
                }
                solidCanvasCtx.drawImage(curCanvas, 0, 0);
                encoder.addFrame(solidCanvasCtx, false, true);
            }
            encoder.finish();
            var blob = encoder.toBlob();
            newSize = fileSize(blob.size);
            return cb([blob, "output-" + tool.siteName + ".gif"], null);
        }
    }
    return {
        converter: bridge,
        config: {
            type: "image",
            input: {
                import: "base64",
                noClipboard: true,
                download: getExtension,
                image: true,
            },
            output: { noClipboard: true },
            override: { "output.download": downloader },
        },
    };
};
(function (fig) {
    window.fig = fig;
    var GifBlock = (fig.GifBlock = {
        EXTENSION: 0x21,
        IMAGE: 0x2c,
        TERMINATOR: 0x3b,
    });
    var GifExtension = (fig.GifExtension = {
        PLAIN_TEXT: 0x01,
        GRAPHICS_CONTROL: 0xf9,
        COMMENT: 0xfe,
        APPLICATION: 0xff,
    });
    var GifCompression = (fig.GifCompression = {
        MAX_BITS: 12,
        MAX_CODES: 1 << 12,
        MAX_STACK_SIZE: (1 << 12) + 1,
        NULL_CODE: 0xcaca,
    });
    var GifDisposal = (fig.GifDisposal = {
        UNSPECIFIED: 0,
        NONE: 1,
        BACKGROUND: 2,
        PREVIOUS: 3,
        COUNT: 4,
    });
    var GifHeader = (fig.GifHeader = function () {
        this.version = 0;
    });
    GifHeader.LENGTH = 6;
    var GifScreenDescriptor = (fig.GifScreenDescriptor = function () {
        this.width = 0;
        this.height = 0;
        this.globalColors = null;
        this.backgroundIndex = 0;
        this.aspect = 0;
    });
    GifScreenDescriptor.GLOBAL_COLOR = 0x80;
    GifScreenDescriptor.DEPTH_MASK = 0x07;
    GifScreenDescriptor.LENGTH = 7;
    var NetscapeApp = (fig.NetscapeApp = function () {
        this.name = "NETSCAPE2.0";
        this.repetitions = 0;
    });
    var UnknownApp = (fig.UnknownApp = function () {
        this.name = "";
    });
    var GifGraphicsControl = (fig.GifGraphicsControl = function () {
        this.delay = 0;
        this.isTransparent = false;
        this.transparencyIndex = false;
        this.disposal = GifDisposal.UNSPECIFIED;
    });
    GifGraphicsControl.TRANSPARENCY = 0x01;
    GifGraphicsControl.DISPOSAL_MASK = 0x1c;
    GifGraphicsControl.DISPOSAL_SHIFT = 2;
    GifGraphicsControl.LENGTH = 5;
    var GifImageDescriptor = (fig.GifImageDescriptor = function () {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.localColors = null;
        this.interlace = false;
    });
    GifImageDescriptor.LOCAL_COLOR = 0x80;
    GifImageDescriptor.INTERLACE = 0x40;
    GifImageDescriptor.DEPTH_MASK = 0x07;
    GifImageDescriptor.LENGTH = 9;
    var GifFrame = (fig.GifFrame = function () {
        this.graphicsControl = null;
        this.imageDescriptor = null;
        this.indexData = null;
        this.canvas = null;
        this.context = null;
    });
    var GifImage = (fig.GifImage = function () {
        this.header = null;
        this.screenDescriptor = null;
        this.frames = [];
        this.repetitions = null;
    });
    var disposeIndexedFrame = function (screenDescriptor, prev, cur, next) {
        var localX = cur.imageDescriptor.x;
        var localY = cur.imageDescriptor.y;
        var localWidth = cur.imageDescriptor.width;
        var localHeight = cur.imageDescriptor.height;
        var isTransparent = cur.graphicsControl
            ? cur.graphicsControl.isTransparent
            : false;
        var transparencyIndex = cur.graphicsControl
            ? cur.graphicsControl.transparencyIndex
            : 0;
        var indexData = cur.indexData;
        var nextData = next.context.getImageData(
            0,
            0,
            next.canvas.width,
            next.canvas.height
        );
        var disposal = cur.graphicsControl
            ? cur.graphicsControl.disposal
            : GifDisposal.UNSPECIFIED;
        switch (disposal) {
            case GifDisposal.BACKGROUND:
                for (var i = 0; i < localHeight; i++) {
                    for (var j = 0; j < localWidth; j++) {
                        if (
                            !isTransparent ||
                            indexData[i * localWidth + j] !== transparencyIndex
                        ) {
                            var x = localX + j;
                            var y = localY + i;
                            if (
                                x < 0 ||
                                x >= nextData.width ||
                                y < 0 ||
                                y >= nextData.height
                            ) {
                                continue;
                            }
                            var k = (y * nextData.width + x) * 4;
                            nextData.data[k + 0] = 0;
                            nextData.data[k + 1] = 0;
                            nextData.data[k + 2] = 0;
                            nextData.data[k + 3] = 0;
                        }
                    }
                }
                next.canvas.getContext("2d").putImageData(nextData, 0, 0);
                break;
            case GifDisposal.PREVIOUS:
                var prevData =
                    prev !== null
                        ? prev.context.getImageData(
                            0,
                            0,
                            prev.canvas.width,
                            prev.canvas.height
                        )
                        : null;
                for (var i = 0; i < localHeight; i++) {
                    for (var j = 0; j < localWidth; j++) {
                        if (
                            !isTransparent ||
                            indexData[i * localWidth + j] !== transparencyIndex
                        ) {
                            var x = localX + j;
                            var y = localY + i;
                            if (
                                x < 0 ||
                                x >= nextData.width ||
                                y < 0 ||
                                y >= nextData.height
                            ) {
                                continue;
                            }
                            var k = (y * nextData.width + x) * 4;
                            if (prevData) {
                                nextData.data[k + 0] = prevData.data[k + 0];
                                nextData.data[k + 1] = prevData.data[k + 1];
                                nextData.data[k + 2] = prevData.data[k + 2];
                                nextData.data[k + 3] = prevData.data[k + 3];
                            } else {
                                nextData.data[k + 0] = 0;
                                nextData.data[k + 1] = 0;
                                nextData.data[k + 2] = 0;
                                nextData.data[k + 3] = 0;
                            }
                        }
                    }
                }
                next.context.putImageData(nextData, 0, 0);
                break;
            case GifDisposal.UNSPECIFIED:
            case GifDisposal.NONE:
            default:
                break;
        }
    };
    function blitIndexedFrame(screenDescriptor, frame) {
        var palette =
            frame.imageDescriptor.localColors || screenDescriptor.globalColors;
        var localX = frame.imageDescriptor.x;
        var localY = frame.imageDescriptor.y;
        var localWidth = frame.imageDescriptor.width;
        var localHeight = frame.imageDescriptor.height;
        var isTransparent = frame.graphicsControl
            ? frame.graphicsControl.isTransparent
            : false;
        var transparencyIndex = frame.graphicsControl
            ? frame.graphicsControl.transparencyIndex
            : 0;
        var indexData = frame.indexData;
        var canvasData = frame.context.getImageData(
            0,
            0,
            frame.canvas.width,
            frame.canvas.height
        );
        for (var i = 0; i < localHeight; i++) {
            for (var j = 0; j < localWidth; j++) {
                var index = indexData[i * localWidth + j];
                if (index < 0 || index >= palette.length) {
                    continue;
                }
                if (!isTransparent || index !== transparencyIndex) {
                    var x = localX + j;
                    var y = localY + i;
                    if (
                        x < 0 ||
                        x >= canvasData.width ||
                        y < 0 ||
                        y >= canvasData.height
                    ) {
                        continue;
                    }
                    index *= 4;
                    var k = (y * canvasData.width + x) * 4;
                    canvasData.data[k + 0] = palette[index + 0];
                    canvasData.data[k + 1] = palette[index + 1];
                    canvasData.data[k + 2] = palette[index + 2];
                    canvasData.data[k + 3] = palette[index + 3];
                }
            }
        }
        frame.context.putImageData(canvasData, 0, 0);
    }
    GifImage.prototype.renderFrames = function () {
        var frames = this.frames;
        for (var i = 0; i < frames.length; i++) {
            var canvas = document.createElement("canvas");
            canvas.width = this.screenDescriptor.width;
            canvas.height = this.screenDescriptor.height;
            frames[i].canvas = canvas;
            frames[i].context = canvas.getContext("2d");
        }
        var prev = null;
        var cur = null;
        for (var i = 0; i < frames.length; i++) {
            var next = frames[i];
            if (cur === null) {
                next.context.clearRect(0, 0, next.canvas.width, next.canvas.height);
            } else {
                next.context.drawImage(cur.canvas, 0, 0);
                disposeIndexedFrame(this.screenDescriptor, prev, cur, next);
            }
            blitIndexedFrame(this.screenDescriptor, next);
            if (cur !== null) {
                var disposal = cur.graphicsControl
                    ? cur.graphicsControl.disposal
                    : GifDisposal.UNSPECIFIED;
                if (
                    disposal === GifDisposal.NONE ||
                    disposal === GifDisposal.UNSPECIFIED
                ) {
                    prev = cur;
                }
            }
            cur = next;
        }
    };
    var GifReader = (fig.GifReader = function (buffer) {
        this.buffer = buffer;
        this.position = 0;
        this.prefixCodes = new Array(GifCompression.MAX_CODES);
        this.suffixChars = new Array(GifCompression.MAX_CODES);
        this.charStack = new Array(GifCompression.MAX_STACK_SIZE);
        this.onerror = function (err) { };
    });
    GifReader.prototype.readHeader = function () {
        var buffer = this.buffer;
        var i = this.position;
        if (i + GifHeader.LENGTH >= buffer.length) {
            this.onerror("invalid GIF header (encountered early end of stream)");
            return null;
        }
        var signature = String.fromCharCode.apply(
            null,
            Array.prototype.slice.call(buffer, i, i + GifHeader.LENGTH)
        );
        i += GifHeader.LENGTH;
        this.position = i;
        if (signature !== "GIF87a" && signature !== "GIF89a") {
            this.onerror("invalid GIF header (invalid version signature)");
            return null;
        }
        var result = new GifHeader();
        result.version = +signature.substr(3, 2);
        return result;
    };
    GifReader.prototype.readScreenDescriptor = function () {
        var buffer = this.buffer;
        var i = this.position;
        if (i + GifScreenDescriptor.LENGTH >= buffer.length) {
            this.onerror(
                "invalid screen descriptor (encountered early end of stream)"
            );
            return null;
        }
        var result = new GifScreenDescriptor();
        result.width = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        result.height = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        var packedFields = buffer[i];
        i++;
        if ((packedFields & GifScreenDescriptor.GLOBAL_COLOR) !== 0) {
            result.globalColors = new Uint8Array(
                4 * (1 << ((packedFields & GifScreenDescriptor.DEPTH_MASK) + 1))
            );
        }
        result.backgroundIndex = buffer[i];
        i++;
        result.aspect = buffer[i];
        i++;
        this.position = i;
        return result;
    };
    GifReader.prototype.readGraphicsControl = function () {
        var buffer = this.buffer;
        var i = this.position;
        if (i + GifGraphicsControl.LENGTH >= buffer.length) {
            this.onerror(
                "invalid graphics control block (encountered early end of stream)"
            );
            return null;
        }
        var result = new GifGraphicsControl();
        var len = buffer[i];
        i++;
        if (len !== GifGraphicsControl.LENGTH - 1) {
            this.onerror(
                "invalid graphics control block (block size does not match GIF specification)"
            );
            return null;
        }
        var packedFields = buffer[i];
        i++;
        result.isTransparent =
            (packedFields & GifGraphicsControl.TRANSPARENCY) !== 0;
        result.disposal =
            (packedFields & GifGraphicsControl.DISPOSAL_MASK) >>
            GifGraphicsControl.DISPOSAL_SHIFT;
        if (result.disposal >= GifDisposal.COUNT) {
            result.disposal = GifDisposal.UNSPECIFIED;
        }
        result.delay = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        result.transparencyIndex = buffer[i];
        i++;
        this.position = i;
        if (!this.skipSubBlocks()) {
            return null;
        }
        return result;
    };
    GifReader.prototype.readApplication = function () {
        var buffer = this.buffer;
        var i = this.position;
        var len = buffer[i];
        if (i + len >= buffer.length) {
            this.onerror(
                "invalid application extension block (encountered early end of stream)"
            );
            return null;
        }
        i++;
        var appName = String.fromCharCode.apply(
            null,
            Array.prototype.slice.call(buffer, i, i + len)
        );
        i += len;
        if (appName == "NETSCAPE2.0") {
            var subBlockSize = buffer[i];
            if (subBlockSize != 3) {
                this.onerror(
                    "invalid netscape2.0 sublock size (should be 3 but was " +
                    subBlockSize +
                    ")"
                );
                return null;
            }
            i++;
            var subBlockId = buffer[i];
            if (subBlockId != 1) {
                this.onerror(
                    "invalid netscape2.0 sublock id (should be 1 but was " +
                    subBlockId +
                    ")"
                );
                return null;
            }
            i++;
            var repetitions = buffer[i] | (buffer[i + 1] << 8);
            i += 2;
            i++;
            this.position = i;
            var result = new NetscapeApp();
            result.repetitions = repetitions;
            return result;
        } else {
            if (!this.skipSubBlocks()) {
                return null;
            }
            var result = new UnknownApp();
            result.name = appName;
            return result;
        }
    };
    GifReader.prototype.readImageDescriptor = function () {
        var buffer = this.buffer;
        var i = this.position;
        if (i + GifImageDescriptor.LENGTH >= buffer.length) {
            this.onerror(
                "invalid image descriptor (encountered early end of stream)"
            );
            return null;
        }
        var result = new GifImageDescriptor();
        result.x = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        result.y = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        result.width = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        result.height = buffer[i] | (buffer[i + 1] << 8);
        i += 2;
        var packedFields = buffer[i];
        i++;
        if ((packedFields & GifImageDescriptor.LOCAL_COLOR) !== 0) {
            result.localColors = new Uint8Array(
                4 * (1 << ((packedFields & GifImageDescriptor.DEPTH_MASK) + 1))
            );
        }
        result.interlace = (packedFields & GifImageDescriptor.INTERLACE) !== 0;
        this.position = i;
        return result;
    };
    GifReader.prototype.readPalette = function (palette) {
        var buffer = this.buffer;
        var i = this.position;
        if (i + palette.length / 4 >= buffer.length) {
            this.onerror("invalid palette data (encountered early end of stream)");
            return false;
        }
        var size = palette.length;
        for (j = 0; j < size; j += 4, i += 3) {
            palette[j + 0] = buffer[i + 0];
            palette[j + 1] = buffer[i + 1];
            palette[j + 2] = buffer[i + 2];
            palette[j + 3] = 0xff;
        }
        this.position = i;
        return true;
    };
    GifReader.prototype.skipSubBlocks = function () {
        var buffer = this.buffer;
        var i = this.position;
        do {
            if (i >= buffer.length) {
                this.onerror("invalid sub block (encountered early end of stream)");
                return false;
            }
            var len = buffer[i++];
            if (i + len >= buffer.length) {
                this.onerror("invalid sub block (encountered early end of stream)");
                return false;
            }
            i += len;
        } while (len > 0);
        this.position = i;
        return true;
    };
    GifReader.prototype.readFrame = function (frame) {
        var i = this.position;
        var buffer = this.buffer;
        if (i >= buffer.length) {
            this.onerror("invalid frame data (encountered early end of stream)");
            return false;
        }
        var minCodeSize = buffer[i++];
        if (minCodeSize > GifCompression.MAX_BITS) {
            this.onerror(
                "invalid frame data (minimum code requires more bits than permitted by GIF specification)"
            );
            return false;
        }
        var clear = 1 << minCodeSize;
        var eoi = clear + 1;
        var codeSize = minCodeSize + 1;
        var codeMask = (1 << codeSize) - 1;
        var avail = eoi + 1;
        var oldCode = GifCompression.NULL_CODE;
        var prefixCodes = this.prefixCodes;
        var suffixChars = this.suffixChars;
        var charStack = this.charStack;
        for (var c = 0; c < clear; c++) {
            prefixCodes[c] = GifCompression.NULL_CODE;
            suffixChars[c] = c & 0xff;
        }
        var charStackLength = 0;
        var subBlockLength = 0;
        var bits = 0;
        var value = 0;
        var firstChar = 0;
        var x = 0;
        var y = 0;
        var imagePass = frame.imageDescriptor.interlace ? 3 : 0;
        var imagePitch = frame.imageDescriptor.interlace ? 8 : 1;
        while (true) {
            if (bits < codeSize) {
                if (subBlockLength === 0) {
                    if (i >= buffer.length) {
                        this.onerror(
                            "invalid frame data (encountered early end of stream)"
                        );
                        return false;
                    }
                    subBlockLength = buffer[i++];
                    if (subBlockLength === 0) {
                        this.position = i;
                        return true;
                    }
                }
                if (i >= buffer.length) {
                    this.onerror("invalid frame data (encountered early end of stream)");
                    return false;
                }
                value |= buffer[i++] << bits;
                bits += 8;
                subBlockLength--;
            } else {
                var code = value & codeMask;
                value >>= codeSize;
                bits -= codeSize;
                if (code === clear) {
                    codeSize = minCodeSize + 1;
                    codeMask = (1 << codeSize) - 1;
                    avail = eoi + 1;
                    oldCode = GifCompression.NULL_CODE;
                } else if (code === eoi) {
                    if (i + subBlockLength >= buffer.length) {
                        this.onerror(
                            "invalid frame data (encountered early end of stream)"
                        );
                        return false;
                    }
                    i += subBlockLength;
                    this.position = i;
                    return this.skipSubBlocks();
                } else if (oldCode === GifCompression.NULL_CODE) {
                    if (
                        code >= GifCompression.MAX_CODES ||
                        charStackLength >= GifCompression.MAX_STACK_SIZE
                    ) {
                        this.onerror("invalid frame data (character stack overflow)");
                        return false;
                    }
                    charStack[charStackLength++] = suffixChars[code];
                    firstChar = code & 0xff;
                    oldCode = code;
                } else if (code <= avail) {
                    var currentCode = code;
                    if (currentCode === avail) {
                        if (charStackLength >= GifCompression.MAX_STACK_SIZE) {
                            this.onerror("invalid frame data (character stack overflow)");
                            return false;
                        }
                        charStack[charStackLength++] = firstChar;
                        currentCode = oldCode;
                    }
                    while (currentCode >= clear) {
                        if (currentCode >= GifCompression.MAX_CODES) {
                            this.onerror(
                                "invalid frame data (exhausted available prefix codes)"
                            );
                            return false;
                        }
                        if (charStackLength >= GifCompression.MAX_STACK_SIZE) {
                            this.onerror("invalid frame data (character stack overflow)");
                            return false;
                        }
                        charStack[charStackLength++] = suffixChars[currentCode];
                        currentCode = prefixCodes[currentCode];
                    }
                    firstChar = suffixChars[currentCode];
                    if (charStackLength >= GifCompression.MAX_STACK_SIZE) {
                        this.onerror("invalid frame data (character stack overflow)");
                        return false;
                    }
                    charStack[charStackLength++] = firstChar;
                    if (avail < GifCompression.MAX_CODES) {
                        prefixCodes[avail] = oldCode;
                        suffixChars[avail] = firstChar;
                        avail++;
                        if ((avail & codeMask) === 0 && avail < GifCompression.MAX_CODES) {
                            codeSize++;
                            codeMask = (1 << codeSize) - 1;
                        }
                    }
                    oldCode = code;
                } else {
                    this.onerror("invalid frame data (invalid code encountered)");
                    return false;
                }
                var indexData = frame.indexData;
                var width = frame.imageDescriptor.width;
                var height = frame.imageDescriptor.height;
                while (charStackLength > 0) {
                    if (y >= height) {
                        break;
                    }
                    var top = charStack[--charStackLength];
                    indexData[y * width + x] = top;
                    x++;
                    if (x >= width) {
                        x = 0;
                        y += imagePitch;
                        if (y >= height && imagePass > 0) {
                            imagePitch = 1 << imagePass;
                            y = imagePitch >>> 1;
                            imagePass--;
                        }
                    }
                }
            }
        }
    };
    GifReader.prototype.read = function () {
        var img = new GifImage();
        var header = this.readHeader();
        if (!header) {
            return null;
        }
        img.header = header;
        var screenDescriptor = this.readScreenDescriptor();
        if (!screenDescriptor) {
            return null;
        }
        if (screenDescriptor.globalColors !== null) {
            if (!this.readPalette(screenDescriptor.globalColors)) {
                return null;
            }
        }
        img.screenDescriptor = screenDescriptor;
        var graphicsControl = null;
        while (true) {
            if (this.position >= this.buffer.length) {
                return null;
            }
            var blockType = this.buffer[this.position++];
            switch (blockType) {
                case GifBlock.EXTENSION:
                    if (this.position >= this.buffer.length) {
                        return null;
                    }
                    var extensionType = this.buffer[this.position++];
                    switch (extensionType) {
                        case GifExtension.APPLICATION:
                            var application = this.readApplication();
                            if (!application) {
                                return null;
                            }
                            if (application.name == "NETSCAPE2.0") {
                                img.repetitions = application.repetitions;
                            }
                            break;
                        case GifExtension.GRAPHICS_CONTROL:
                            var graphicsControl = this.readGraphicsControl();
                            if (!graphicsControl) {
                                return null;
                            }
                            break;
                        default:
                            if (!this.skipSubBlocks()) {
                                return null;
                            }
                            break;
                    }
                    break;
                case GifBlock.IMAGE:
                    var imageDescriptor = this.readImageDescriptor();
                    if (!imageDescriptor) {
                        return null;
                    }
                    if (imageDescriptor.localColors !== null) {
                        if (!this.readPalette(imageDescriptor.localColors)) {
                            return null;
                        }
                    }
                    var frame = new GifFrame();
                    frame.graphicsControl = graphicsControl;
                    frame.imageDescriptor = imageDescriptor;
                    frame.palette =
                        imageDescriptor.localColors || screenDescriptor.globalColors;
                    frame.indexData = new Uint8Array(
                        imageDescriptor.width * imageDescriptor.height
                    );
                    if (!this.readFrame(frame)) {
                        return null;
                    }
                    img.frames.push(frame);
                    break;
                case GifBlock.TERMINATOR:
                    return img;
            }
        }
    };
    fig.load = function (arguments) {
        var files = arguments.files;
        var raw = arguments.raw || false;
        var oncomplete = arguments.oncomplete || function () { };
        var onerror = arguments.onerror || function (file, err) { };
        var gifs = new Array(files.length);
        var remaining = files.length;
        for (var i = 0; i < files.length; i++) {
            (function (i) {
                var file = files[i];
                var reader = new FileReader();
                reader.onload = function (event) {
                    var gifReader = new fig.GifReader(
                        new Uint8Array(event.target.result)
                    );
                    gifReader.onerror = function (err) {
                        onerror(file, err);
                    };
                    var gif = gifReader.read();
                    if (gif) {
                        if (!raw) {
                            gif.renderFrames();
                        }
                        gifs[i] = gif;
                        remaining--;
                        if (remaining === 0) {
                            oncomplete(gifs);
                        }
                    }
                };
                reader.readAsArrayBuffer(file);
            })(i);
        }
    };
})({});
function best_image_fit(width, height, maxWidth, maxHeight) {
    if (width >= maxWidth) {
        var scaleW = width / maxWidth;
        var scaleH = height / maxHeight;
        if (scaleW > scaleH) {
            return {
                width: maxWidth,
                height: height / scaleW,
                offsetX: 0,
                offsetY: (maxHeight - height / scaleW) / 2,
                scale: scaleW,
            };
        } else {
            return {
                width: width / scaleH,
                height: height / scaleH,
                offsetX: (maxWidth - width / scaleH) / 2,
                offsetY: (maxHeight - height / scaleH) / 2,
                scale: scaleH,
            };
        }
    } else {
        if (height > maxHeight) {
            var scale = height / maxHeight;
            return {
                width: width / scale,
                height: height / scale,
                offsetX: (maxWidth - width / scale) / 2,
                offsetY: 0,
                scale: scale,
            };
        } else {
            return {
                width: width,
                height: height,
                offsetX: (maxWidth - width) / 2,
                offsetY: (maxHeight - height) / 2,
                scale: 1,
            };
        }
    }
}
LZWEncoder = function () {
    var exports = {};
    var EOF = -1;
    var imgW;
    var imgH;
    var pixAry;
    var initCodeSize;
    var remaining;
    var curPixel;
    var BITS = 12;
    var HSIZE = 5003;
    var n_bits;
    var maxbits = BITS;
    var maxcode;
    var maxmaxcode = 1 << BITS;
    var htab = [];
    var codetab = [];
    var hsize = HSIZE;
    var free_ent = 0;
    var clear_flg = false;
    var g_init_bits;
    var ClearCode;
    var EOFCode;
    var cur_accum = 0;
    var cur_bits = 0;
    var masks = [
        0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
        0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff,
    ];
    var a_count;
    var accum = [];
    var LZWEncoder = (exports.LZWEncoder = function LZWEncoder(
        width,
        height,
        pixels,
        color_depth
    ) {
        imgW = width;
        imgH = height;
        pixAry = pixels;
        initCodeSize = Math.max(2, color_depth);
    });
    var char_out = function char_out(c, outs) {
        accum[a_count++] = c;
        if (a_count >= 254) flush_char(outs);
    };
    var cl_block = function cl_block(outs) {
        cl_hash(hsize);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode, outs);
    };
    var cl_hash = function cl_hash(hsize) {
        for (var i = 0; i < hsize; ++i) htab[i] = -1;
    };
    var compress = (exports.compress = function compress(init_bits, outs) {
        var fcode;
        var i;
        var c;
        var ent;
        var disp;
        var hsize_reg;
        var hshift;
        g_init_bits = init_bits;
        clear_flg = false;
        n_bits = g_init_bits;
        maxcode = MAXCODE(n_bits);
        ClearCode = 1 << (init_bits - 1);
        EOFCode = ClearCode + 1;
        free_ent = ClearCode + 2;
        a_count = 0;
        ent = nextPixel();
        hshift = 0;
        for (fcode = hsize; fcode < 65536; fcode *= 2) ++hshift;
        hshift = 8 - hshift;
        hsize_reg = hsize;
        cl_hash(hsize_reg);
        output(ClearCode, outs);
        outer_loop: while ((c = nextPixel()) != EOF) {
            fcode = (c << maxbits) + ent;
            i = (c << hshift) ^ ent;
            if (htab[i] == fcode) {
                ent = codetab[i];
                continue;
            } else if (htab[i] >= 0) {
                disp = hsize_reg - i;
                if (i === 0) disp = 1;
                do {
                    if ((i -= disp) < 0) i += hsize_reg;
                    if (htab[i] == fcode) {
                        ent = codetab[i];
                        continue outer_loop;
                    }
                } while (htab[i] >= 0);
            }
            output(ent, outs);
            ent = c;
            if (free_ent < maxmaxcode) {
                codetab[i] = free_ent++;
                htab[i] = fcode;
            } else cl_block(outs);
        }
        output(ent, outs);
        output(EOFCode, outs);
    });
    var encode = (exports.encode = function encode(os) {
        os.writeByte(initCodeSize);
        remaining = imgW * imgH;
        curPixel = 0;
        compress(initCodeSize + 1, os);
        os.writeByte(0);
    });
    var flush_char = function flush_char(outs) {
        if (a_count > 0) {
            outs.writeByte(a_count);
            outs.writeBytes(accum, 0, a_count);
            a_count = 0;
        }
    };
    var MAXCODE = function MAXCODE(n_bits) {
        return (1 << n_bits) - 1;
    };
    var nextPixel = function nextPixel() {
        if (remaining === 0) return EOF;
        --remaining;
        var pix = pixAry[curPixel++];
        return pix & 0xff;
    };
    var output = function output(code, outs) {
        cur_accum &= masks[cur_bits];
        if (cur_bits > 0) cur_accum |= code << cur_bits;
        else cur_accum = code;
        cur_bits += n_bits;
        while (cur_bits >= 8) {
            char_out(cur_accum & 0xff, outs);
            cur_accum >>= 8;
            cur_bits -= 8;
        }
        if (free_ent > maxcode || clear_flg) {
            if (clear_flg) {
                maxcode = MAXCODE((n_bits = g_init_bits));
                clear_flg = false;
            } else {
                ++n_bits;
                if (n_bits == maxbits) maxcode = maxmaxcode;
                else maxcode = MAXCODE(n_bits);
            }
        }
        if (code == EOFCode) {
            while (cur_bits > 0) {
                char_out(cur_accum & 0xff, outs);
                cur_accum >>= 8;
                cur_bits -= 8;
            }
            flush_char(outs);
        }
    };
    LZWEncoder.apply(this, arguments);
    return exports;
};
NeuQuant = function () {
    var exports = {};
    var netsize = 256;
    var prime1 = 499;
    var prime2 = 491;
    var prime3 = 487;
    var prime4 = 503;
    var minpicturebytes = 3 * prime4;
    var maxnetpos = netsize - 1;
    var netbiasshift = 4;
    var ncycles = 100;
    var intbiasshift = 16;
    var intbias = 1 << intbiasshift;
    var gammashift = 10;
    var gamma = 1 << gammashift;
    var betashift = 10;
    var beta = intbias >> betashift;
    var betagamma = intbias << (gammashift - betashift);
    var initrad = netsize >> 3;
    var radiusbiasshift = 6;
    var radiusbias = 1 << radiusbiasshift;
    var initradius = initrad * radiusbias;
    var radiusdec = 30;
    var alphabiasshift = 10;
    var initalpha = 1 << alphabiasshift;
    var alphadec;
    var radbiasshift = 8;
    var radbias = 1 << radbiasshift;
    var alpharadbshift = alphabiasshift + radbiasshift;
    var alpharadbias = 1 << alpharadbshift;
    var thepicture;
    var lengthcount;
    var samplefac;
    var network;
    var netindex = [];
    var bias = [];
    var freq = [];
    var radpower = [];
    var NeuQuant = (exports.NeuQuant = function NeuQuant(thepic, len, sample) {
        var i;
        var p;
        thepicture = thepic;
        lengthcount = len;
        samplefac = sample;
        network = new Array(netsize);
        for (i = 0; i < netsize; i++) {
            network[i] = new Array(4);
            p = network[i];
            p[0] = p[1] = p[2] = (i << (netbiasshift + 8)) / netsize;
            freq[i] = intbias / netsize;
            bias[i] = 0;
        }
    });
    var colorMap = function colorMap() {
        var map = [];
        var index = new Array(netsize);
        for (var i = 0; i < netsize; i++) index[network[i][3]] = i;
        var k = 0;
        for (var l = 0; l < netsize; l++) {
            var j = index[l];
            map[k++] = network[j][0];
            map[k++] = network[j][1];
            map[k++] = network[j][2];
        }
        return map;
    };
    var inxbuild = function inxbuild() {
        var i;
        var j;
        var smallpos;
        var smallval;
        var p;
        var q;
        var previouscol;
        var startpos;
        previouscol = 0;
        startpos = 0;
        for (i = 0; i < netsize; i++) {
            p = network[i];
            smallpos = i;
            smallval = p[1];
            for (j = i + 1; j < netsize; j++) {
                q = network[j];
                if (q[1] < smallval) {
                    smallpos = j;
                    smallval = q[1];
                }
            }
            q = network[smallpos];
            if (i != smallpos) {
                j = q[0];
                q[0] = p[0];
                p[0] = j;
                j = q[1];
                q[1] = p[1];
                p[1] = j;
                j = q[2];
                q[2] = p[2];
                p[2] = j;
                j = q[3];
                q[3] = p[3];
                p[3] = j;
            }
            if (smallval != previouscol) {
                netindex[previouscol] = (startpos + i) >> 1;
                for (j = previouscol + 1; j < smallval; j++) netindex[j] = i;
                previouscol = smallval;
                startpos = i;
            }
        }
        netindex[previouscol] = (startpos + maxnetpos) >> 1;
        for (j = previouscol + 1; j < 256; j++) netindex[j] = maxnetpos;
    };
    var learn = function learn() {
        var i;
        var j;
        var b;
        var g;
        var r;
        var radius;
        var rad;
        var alpha;
        var step;
        var delta;
        var samplepixels;
        var p;
        var pix;
        var lim;
        if (lengthcount < minpicturebytes) samplefac = 1;
        alphadec = 30 + (samplefac - 1) / 3;
        p = thepicture;
        pix = 0;
        lim = lengthcount;
        samplepixels = lengthcount / (3 * samplefac);
        delta = (samplepixels / ncycles) | 0;
        alpha = initalpha;
        radius = initradius;
        rad = radius >> radiusbiasshift;
        if (rad <= 1) rad = 0;
        for (i = 0; i < rad; i++)
            radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
        if (lengthcount < minpicturebytes) step = 3;
        else if (lengthcount % prime1 !== 0) step = 3 * prime1;
        else {
            if (lengthcount % prime2 !== 0) step = 3 * prime2;
            else {
                if (lengthcount % prime3 !== 0) step = 3 * prime3;
                else step = 3 * prime4;
            }
        }
        i = 0;
        while (i < samplepixels) {
            b = (p[pix + 0] & 0xff) << netbiasshift;
            g = (p[pix + 1] & 0xff) << netbiasshift;
            r = (p[pix + 2] & 0xff) << netbiasshift;
            j = contest(b, g, r);
            altersingle(alpha, j, b, g, r);
            if (rad !== 0) alterneigh(rad, j, b, g, r);
            pix += step;
            if (pix >= lim) pix -= lengthcount;
            i++;
            if (delta === 0) delta = 1;
            if (i % delta === 0) {
                alpha -= alpha / alphadec;
                radius -= radius / radiusdec;
                rad = radius >> radiusbiasshift;
                if (rad <= 1) rad = 0;
                for (j = 0; j < rad; j++)
                    radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
            }
        }
    };
    var map = (exports.map = function map(b, g, r) {
        var i;
        var j;
        var dist;
        var a;
        var bestd;
        var p;
        var best;
        bestd = 1000;
        best = -1;
        i = netindex[g];
        j = i - 1;
        while (i < netsize || j >= 0) {
            if (i < netsize) {
                p = network[i];
                dist = p[1] - g;
                if (dist >= bestd) i = netsize;
                else {
                    i++;
                    if (dist < 0) dist = -dist;
                    a = p[0] - b;
                    if (a < 0) a = -a;
                    dist += a;
                    if (dist < bestd) {
                        a = p[2] - r;
                        if (a < 0) a = -a;
                        dist += a;
                        if (dist < bestd) {
                            bestd = dist;
                            best = p[3];
                        }
                    }
                }
            }
            if (j >= 0) {
                p = network[j];
                dist = g - p[1];
                if (dist >= bestd) j = -1;
                else {
                    j--;
                    if (dist < 0) dist = -dist;
                    a = p[0] - b;
                    if (a < 0) a = -a;
                    dist += a;
                    if (dist < bestd) {
                        a = p[2] - r;
                        if (a < 0) a = -a;
                        dist += a;
                        if (dist < bestd) {
                            bestd = dist;
                            best = p[3];
                        }
                    }
                }
            }
        }
        return best;
    });
    var process = (exports.process = function process() {
        learn();
        unbiasnet();
        inxbuild();
        return colorMap();
    });
    var unbiasnet = function unbiasnet() {
        var i;
        var j;
        for (i = 0; i < netsize; i++) {
            network[i][0] >>= netbiasshift;
            network[i][1] >>= netbiasshift;
            network[i][2] >>= netbiasshift;
            network[i][3] = i;
        }
    };
    var alterneigh = function alterneigh(rad, i, b, g, r) {
        var j;
        var k;
        var lo;
        var hi;
        var a;
        var m;
        var p;
        lo = i - rad;
        if (lo < -1) lo = -1;
        hi = i + rad;
        if (hi > netsize) hi = netsize;
        j = i + 1;
        k = i - 1;
        m = 1;
        while (j < hi || k > lo) {
            a = radpower[m++];
            if (j < hi) {
                p = network[j++];
                try {
                    p[0] -= (a * (p[0] - b)) / alpharadbias;
                    p[1] -= (a * (p[1] - g)) / alpharadbias;
                    p[2] -= (a * (p[2] - r)) / alpharadbias;
                } catch (e) { }
            }
            if (k > lo) {
                p = network[k--];
                try {
                    p[0] -= (a * (p[0] - b)) / alpharadbias;
                    p[1] -= (a * (p[1] - g)) / alpharadbias;
                    p[2] -= (a * (p[2] - r)) / alpharadbias;
                } catch (e) { }
            }
        }
    };
    var altersingle = function altersingle(alpha, i, b, g, r) {
        var n = network[i];
        n[0] -= (alpha * (n[0] - b)) / initalpha;
        n[1] -= (alpha * (n[1] - g)) / initalpha;
        n[2] -= (alpha * (n[2] - r)) / initalpha;
    };
    var contest = function contest(b, g, r) {
        var i;
        var dist;
        var a;
        var biasdist;
        var betafreq;
        var bestpos;
        var bestbiaspos;
        var bestd;
        var bestbiasd;
        var n;
        bestd = ~(1 << 31);
        bestbiasd = bestd;
        bestpos = -1;
        bestbiaspos = bestpos;
        for (i = 0; i < netsize; i++) {
            n = network[i];
            dist = n[0] - b;
            if (dist < 0) dist = -dist;
            a = n[1] - g;
            if (a < 0) a = -a;
            dist += a;
            a = n[2] - r;
            if (a < 0) a = -a;
            dist += a;
            if (dist < bestd) {
                bestd = dist;
                bestpos = i;
            }
            biasdist = dist - (bias[i] >> (intbiasshift - netbiasshift));
            if (biasdist < bestbiasd) {
                bestbiasd = biasdist;
                bestbiaspos = i;
            }
            betafreq = freq[i] >> betashift;
            freq[i] -= betafreq;
            bias[i] += betafreq << gammashift;
        }
        freq[bestpos] += beta;
        bias[bestpos] -= betagamma;
        return bestbiaspos;
    };
    NeuQuant.apply(this, arguments);
    return exports;
};
GIFEncoder = function () {
    for (var i = 0, chr = {}; i < 256; i++) chr[i] = String.fromCharCode(i);
    function ByteArray() {
        this.bin = [];
    }
    ByteArray.prototype.toDataURL = function () {
        var input = this.getData();
        var output = "",
            i = 0,
            l = input.length,
            key = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            chr1,
            chr2,
            chr3,
            enc1,
            enc2,
            enc3,
            enc4;
        while (i < l) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) enc3 = enc4 = 64;
            else if (isNaN(chr3)) enc4 = 64;
            output =
                output +
                key.charAt(enc1) +
                key.charAt(enc2) +
                key.charAt(enc3) +
                key.charAt(enc4);
        }
        return "data:image/gif;base64," + output;
    };
    ByteArray.prototype.getData = function () {
        for (var v = "", l = this.bin.length, i = 0; i < l; i++)
            v += chr[this.bin[i]];
        return v;
    };
    ByteArray.prototype.writeByte = function (val) {
        this.bin.push(val);
    };
    ByteArray.prototype.writeUTFBytes = function (string) {
        for (var l = string.length, i = 0; i < l; i++)
            this.writeByte(string.charCodeAt(i));
    };
    ByteArray.prototype.writeBytes = function (array, offset, length) {
        for (var l = length || array.length, i = offset || 0; i < l; i++)
            this.writeByte(array[i]);
    };
    var exports = {};
    var gifWidth = null;
    var gifHeight = null;
    var width;
    var height;
    var transparent = null;
    var transIndex;
    var repeat = -1;
    var delay = 0;
    var started = false;
    var out;
    var image;
    var pixels;
    var indexedPixels;
    var colorDepth;
    var colorTab;
    var usedEntry = [];
    var palSize = 7;
    var dispose = -1;
    var closeStream = false;
    var firstFrame = true;
    var sizeSet = false;
    var sample = 10;
    var comment = "Generated by onlineGIFtools.com";
    var setDelay = (exports.setDelay = function setDelay(ms) {
        delay = Math.round(ms / 10);
    });
    var setDispose = (exports.setDispose = function setDispose(code) {
        if (code >= 0) dispose = code;
    });
    var setRepeat = (exports.setRepeat = function setRepeat(iter) {
        if (iter >= 0) repeat = iter;
    });
    var setTransparent = (exports.setTransparent = function setTransparent(c) {
        transparent = c;
    });
    var setComment = (exports.setComment = function setComment(c) {
        comment = c;
    });
    var addFrame = (exports.addFrame = function addFrame(
        im,
        is_imageData,
        strictTransp,
        width_,
        height_,
        x_,
        y_
    ) {
        var x = 0;
        var y = 0;
        if (x_ !== undefined) x = x_;
        if (y_ !== undefined) y = y_;
        if (width_ !== undefined) width = width_;
        if (height_ !== undefined) height = height_;
        if (im === null || !started || out === null) {
            throw new Error("Please call start method before calling addFrame");
        }
        var ok = true;
        try {
            if (!is_imageData) {
                image = im.getImageData(0, 0, im.canvas.width, im.canvas.height).data;
                if (!sizeSet) setSize(im.canvas.width, im.canvas.height);
            } else {
                if (im instanceof ImageData) {
                    image = im.data;
                    if (!sizeSet || width != im.width || height != im.height) {
                        setSize(im.width, im.height);
                    } else {
                    }
                } else if (im instanceof Uint8ClampedArray) {
                    if (im.length == width * height * 4) {
                        image = im;
                    } else {
                        console.log(
                            "Please set the correct size: ImageData length mismatch"
                        );
                        ok = false;
                    }
                } else {
                    console.log("Please provide correct input");
                    ok = false;
                }
            }
            getImagePixels();
            analyzePixels(strictTransp);
            if (firstFrame) {
                writeLSD();
                writePalette();
                if (repeat >= 0) {
                    writeNetscapeExt();
                }
            }
            writeGraphicCtrlExt();
            if (comment !== "") {
                writeCommentExt();
            }
            writeImageDesc(x, y);
            if (!firstFrame) writePalette();
            writePixels();
            firstFrame = false;
        } catch (e) {
            ok = false;
        }
        return ok;
    });
    var addFrameRaw = (exports.addFrameRaw = function addFrameRaw(
        palette,
        indexedPixels_,
        isTransparent,
        transIndex_,
        width_,
        height_,
        x,
        y
    ) {
        indexedPixels = indexedPixels_;
        transparent = isTransparent ? true : null;
        transIndex = transIndex_;
        width = width_;
        height = height_;
        if (!started || out === null) {
            throw new Error("Please call start method before calling addFrame");
        }
        var ok = true;
        try {
            colorDepth = 8;
            palSize = 7;
            colorTab = [];
            for (var i = 0; i < palette.length; i += 4) {
                colorTab.push(palette[i + 0]);
                colorTab.push(palette[i + 1]);
                colorTab.push(palette[i + 2]);
            }
            if (firstFrame) {
                writeLSD();
                writePalette();
                if (repeat >= 0) {
                    writeNetscapeExt();
                }
            }
            writeGraphicCtrlExt();
            if (comment !== "") {
                writeCommentExt();
            }
            writeImageDesc(x, y);
            if (!firstFrame) writePalette();
            writePixels();
            firstFrame = false;
        } catch (e) {
            ok = false;
        }
        return ok;
    });
    var download = (exports.download = function download(filename) {
        if (out === null || closeStream == false) {
            console.log(
                "Please call start method and add frames and call finish method before calling download"
            );
        } else {
            filename =
                filename !== undefined
                    ? filename.endsWith(".gif")
                        ? filename
                        : filename + ".gif"
                    : "download.gif";
            var templink = document.createElement("a");
            templink.download = filename;
            templink.href = URL.createObjectURL(
                new Blob([new Uint8Array(out.bin)], { type: "image/gif" })
            );
            templink.click();
        }
    });
    var toBlob = (exports.toBlob = function toBlob(filename) {
        if (out === null || closeStream == false) {
            console.log(
                "Please call start method and add frames and call finish method before calling download"
            );
        } else {
            return new Blob([new Uint8Array(out.bin)], { type: "image/gif" });
        }
    });
    var finish = (exports.finish = function finish() {
        if (!started) return false;
        var ok = true;
        started = false;
        try {
            out.writeByte(0x3b);
            closeStream = true;
        } catch (e) {
            ok = false;
        }
        return ok;
    });
    var reset = function reset() {
        transIndex = 0;
        image = null;
        pixels = null;
        indexedPixels = null;
        colorTab = null;
        closeStream = false;
        firstFrame = true;
    };
    var setFrameRate = (exports.setFrameRate = function setFrameRate(fps) {
        if (fps != 0xf) delay = Math.round(100 / fps);
    });
    var setQuality = (exports.setQuality = function setQuality(quality) {
        if (quality < 1) quality = 1;
        sample = quality;
    });
    var setGifSize = (exports.setGifSize = function setGifSize(w, h) {
        gifWidth = w;
        gifHeight = h;
    });
    var setSize = (exports.setSize = function setSize(w, h) {
        if (started && !firstFrame) return;
        width = w;
        height = h;
        if (width < 1) width = 320;
        if (height < 1) height = 240;
        sizeSet = true;
    });
    var start = (exports.start = function start() {
        reset();
        var ok = true;
        closeStream = false;
        out = new ByteArray();
        try {
            out.writeUTFBytes("GIF89a");
        } catch (e) {
            ok = false;
        }
        return (started = ok);
    });
    var cont = (exports.cont = function cont() {
        reset();
        var ok = true;
        closeStream = false;
        out = new ByteArray();
        return (started = ok);
    });
    var analyzePixels = function analyzePixels(strictTransp) {
        var len = pixels.length;
        var nPix = len / 3;
        indexedPixels = [];
        var nq = new NeuQuant(pixels, len, sample);
        colorTab = nq.process();
        var k = 0;
        for (var j = 0; j < nPix; j++) {
            var index = nq.map(
                pixels[k++] & 0xff,
                pixels[k++] & 0xff,
                pixels[k++] & 0xff
            );
            usedEntry[index] = true;
            indexedPixels[j] = index;
        }
        pixels = null;
        colorDepth = 8;
        palSize = 7;
        if (transparent != null) {
            if (strictTransp) {
                color = findClosestInRange(transparent);
                if (color.success) {
                    transIndex = color.transIndex;
                } else {
                    transparent = null;
                    return;
                }
            } else {
                transIndex = findClosest(transparent);
            }
            var r = colorTab[transIndex * 3];
            var g = colorTab[transIndex * 3 + 1];
            var b = colorTab[transIndex * 3 + 2];
            var trans_indices = [];
            for (var i = 0; i < colorTab.length; i += 3) {
                var index = i / 3;
                if (!usedEntry[index]) continue;
                if (colorTab[i] == r && colorTab[i + 1] == g && colorTab[i + 2] == b)
                    trans_indices.push(index);
            }
            for (var i = 0; i < indexedPixels.length; i++)
                if (trans_indices.indexOf(indexedPixels[i]) >= 0)
                    indexedPixels[i] = transIndex;
        }
    };
    var findClosestInRange = function findClosestInRange(c) {
        if (colorTab === null) return -1;
        var r = (c & 0xff0000) >> 16;
        var g = (c & 0x00ff00) >> 8;
        var b = c & 0x0000ff;
        var minpos = false;
        var dmin = 45;
        var len = colorTab.length;
        for (var i = 0; i < len;) {
            var dr = r - (colorTab[i++] & 0xff);
            var dg = g - (colorTab[i++] & 0xff);
            var db = b - (colorTab[i] & 0xff);
            var drabs = Math.abs(dr);
            var dgabs = Math.abs(dg);
            var dbabs = Math.abs(db);
            var d = drabs + dgabs + dbabs;
            var index = parseInt(i / 3);
            if (
                usedEntry[index] &&
                drabs < 15 &&
                dgabs < 15 &&
                dbabs < 15 &&
                d < dmin
            ) {
                dmin = d;
                minpos = index;
            }
            i++;
        }
        if (minpos === false) {
            return { success: false };
        } else {
            return { success: true, transIndex: minpos };
        }
    };
    var findClosest = function findClosest(c) {
        if (colorTab === null) return -1;
        var r = (c & 0xff0000) >> 16;
        var g = (c & 0x00ff00) >> 8;
        var b = c & 0x0000ff;
        var minpos = 0;
        var dmin = 256 * 256 * 256;
        var len = colorTab.length;
        for (var i = 0; i < len;) {
            var dr = r - (colorTab[i++] & 0xff);
            var dg = g - (colorTab[i++] & 0xff);
            var db = b - (colorTab[i] & 0xff);
            var d = dr * dr + dg * dg + db * db;
            var index = parseInt(i / 3);
            if (usedEntry[index] && d < dmin) {
                dmin = d;
                minpos = index;
            }
            i++;
        }
        return minpos;
    };
    var getImagePixels = function getImagePixels() {
        var w = width;
        var h = height;
        pixels = [];
        var data = image;
        var count = 0;
        for (var i = 0; i < h; i++) {
            for (var j = 0; j < w; j++) {
                var b = i * w * 4 + j * 4;
                pixels[count++] = data[b];
                pixels[count++] = data[b + 1];
                pixels[count++] = data[b + 2];
            }
        }
    };
    var writeGraphicCtrlExt = function writeGraphicCtrlExt() {
        out.writeByte(0x21);
        out.writeByte(0xf9);
        out.writeByte(4);
        var transp;
        var disp;
        if (transparent === null) {
            transp = 0;
            disp = 0;
        } else {
            transp = 1;
            disp = 2;
        }
        if (dispose >= 0) {
            disp = dispose & 7;
        }
        disp <<= 2;
        out.writeByte(0 | disp | 0 | transp);
        WriteShort(delay);
        out.writeByte(transIndex);
        out.writeByte(0);
    };
    var writeCommentExt = function writeCommentExt() {
        out.writeByte(0x21);
        out.writeByte(0xfe);
        out.writeByte(comment.length);
        out.writeUTFBytes(comment);
        out.writeByte(0);
    };
    var writeImageDesc = function writeImageDesc(x, y) {
        out.writeByte(0x2c);
        WriteShort(x);
        WriteShort(y);
        WriteShort(width);
        WriteShort(height);
        if (firstFrame) {
            out.writeByte(0);
        } else {
            out.writeByte(0x80 | 0 | 0 | 0 | palSize);
        }
    };
    var writeLSD = function writeLSD() {
        if (gifWidth !== null && gifHeight !== null) {
            WriteShort(gifWidth);
            WriteShort(gifHeight);
        } else {
            WriteShort(width);
            WriteShort(height);
        }
        out.writeByte(0x80 | 0x70 | 0x00 | palSize);
        out.writeByte(0);
        out.writeByte(0);
    };
    var writeNetscapeExt = function writeNetscapeExt() {
        out.writeByte(0x21);
        out.writeByte(0xff);
        out.writeByte(11);
        out.writeUTFBytes("NETSCAPE" + "2.0");
        out.writeByte(3);
        out.writeByte(1);
        WriteShort(repeat);
        out.writeByte(0);
    };
    var writePalette = function writePalette() {
        out.writeBytes(colorTab);
        var n = 3 * 256 - colorTab.length;
        for (var i = 0; i < n; i++) out.writeByte(0);
    };
    var WriteShort = function WriteShort(pValue) {
        out.writeByte(pValue & 0xff);
        out.writeByte((pValue >> 8) & 0xff);
    };
    var writePixels = function writePixels() {
        var myencoder = new LZWEncoder(width, height, indexedPixels, colorDepth);
        myencoder.encode(out);
    };
    var stream = (exports.stream = function stream() {
        return out;
    });
    var setProperties = (exports.setProperties = function setProperties(
        has_start,
        is_first
    ) {
        started = has_start;
        firstFrame = is_first;
    });
    return exports;
};
function colorToRGBA(color) {
    var probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    var ctx = probe.getContext("2d");
    ctx.rect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fill();
    var data = ctx.getImageData(0, 0, 1, 1).data;
    return {
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3],
        toString: function () {
            return (
                "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")"
            );
        },
        toArray: function () {
            return [this.r, this.g, this.b, this.a];
        },
        toInteger: function () {
            var r = this.r & 0xff;
            var g = this.g & 0xff;
            var b = this.b & 0xff;
            var a = this.a & 0xff;
            return (r << 24) + (g << 16) + (b << 8) + a;
        },
    };
}
function colorToRGB(color) {
    var probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    var ctx = probe.getContext("2d");
    ctx.rect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fill();
    var data = ctx.getImageData(0, 0, 1, 1).data;
    return {
        r: data[0],
        g: data[1],
        b: data[2],
        toString: function () {
            return "rgb(" + this.r + "," + this.g + "," + this.b + ")";
        },
        toArray: function () {
            return [this.r, this.g, this.b];
        },
        toInteger: function () {
            function hexToStr(x) {
                var str = x.toString(16);
                if (str.length == 1) {
                    str = "0" + str;
                }
                return str;
            }
            function hexToInt(x) {
                return parseInt(x, 16);
            }
            var r = this.r & 0xff;
            var g = this.g & 0xff;
            var b = this.b & 0xff;
            return hexToInt("0x" + hexToStr(r) + hexToStr(g) + hexToStr(b));
        },
    };
}
function isColorValid(color) {
    if (!color) return false;
    var e = document.createElement("div");
    e.style.color = color;
    return e.style.color !== "";
}
function rgbaDifference(colorA, colorB) {
    if (colorA.a == 0 && colorB.a == 0) {
        return 0;
    }
    if (colorA.a == 0 || colorB.a == 0) {
        return 1000;
    }
    return deltaE(rgba2lab(colorA), rgba2lab(colorB));
}
function rgba2lab(rgba) {
    var r = rgba.r / rgba.a,
        g = rgba.g / rgba.a,
        b = rgba.b / rgba.a,
        x,
        y,
        z;
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function deltaE(labA, labB) {
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];
    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;
    var deltaLKlsl = deltaL / 1.0;
    var deltaCkcsc = deltaC / sc;
    var deltaHkhsh = deltaH / sh;
    var i =
        deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}
function parseRange(range) {
    var clearedItems = [];
    if (range.length == 0) {
        return { numbers: clearedItems, success: true };
    }
    var items = range.split(",");
    for (var i = 0; i < items.length; i++) {
        var clearedItem = items[i].trim();
        if (/[^\d -]/.test(clearedItem)) {
            return { success: false, error: "Range contains non-numeric values." };
        }
        if (!/^\d+$/.test(clearedItem) && !/^\d+ *- *\d+$/.test(clearedItem)) {
            return {
                success: false,
                error: "Range numbers must be comma or dash separated.",
            };
        }
        if (/^\d+ *- *\d+$/.test(clearedItem)) {
            var parts = clearedItem.split("-");
            var start = parseInt(parts[0].trim());
            var end = parseInt(parts[1].trim());
            if (start > end) {
                return {
                    success: false,
                    error:
                        "End element {1} is bigger than beginning element {0} in range {0}-{1}.".format(
                            start,
                            end
                        ),
                };
            }
            for (var j = start; j <= end; j++) {
                clearedItems.push(j);
            }
        } else {
            clearedItems.push(parseInt(clearedItem));
        }
    }
    return { numbers: clearedItems, success: true };
}
