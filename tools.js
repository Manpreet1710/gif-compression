
window.bridges = {};
window.primaryTool = null;

const getScripts = document.currentScript
const pageTool = getScripts.dataset.tool
const lang = getScripts.dataset.lang
const gdrive = document.querySelector('#filepicker')
const inputBox = document.querySelector('#Inputbox')
const fileDropBox = document.querySelector('.custom-box')

// const showLoader = () => {
//     showLoading()
// }
// const closeLoader = () => { }
// const mimeTypes = 'image/png,image/jpg,image/jpeg,image/webp'
// const filemimes = ['.png', '.webp', '.jpg', '.jpeg']
// gdrive.addEventListener(
//     'click',
//     (getFile, mimeTypes, showLoader, closeLoader) => {
//         const data = loadPicker()
//     }
// )
// const getDropBoxFile = (file) => {
//     handleFile(file)
// }
// const getFile = (file) => {
//     handleFile(file)
// }
// const fileOnChange = () => {
//     handleFile(file.files[0])
// }
// const dropbox = document.getElementById('dropbox')
// dropbox.addEventListener(
//     'click',
//     async (getDropBoxFile, showLoader, closeLoader) => {
//         const getFile = chooseFromDropbox()
//     }
// )
// inputBox.onclick = function () {
//     document.querySelector('#file').click()
// }
// fileDropBox.addEventListener('dragover', (e) => {
//     e.preventDefault()
// })
// fileDropBox.addEventListener('drop', (e) => {
//     e.preventDefault()
//     handleFile(e.dataTransfer.files[0])
// })
const showLoading = () => {
    document.querySelector('#file-loader').style.display = 'flex'
    document.querySelector('.file-input').style.display = 'none'
}
const stopLoading = () => {
    fileDropBox.style.display = 'none'
}
// let inputFile
// const handleFile = (file) => {
//     document.querySelector('#image-format').value = file.type.split('/')[1]
//     document.querySelector('#file-loader').style.display = 'flex'
//     document.querySelector('.file-input').style.display = 'none'
//     stopLoading()
//     inputFile = file
//     document.querySelector('.workspace').style.display = 'block'
// }


window.addEventListener("load", function () {
    makePrimaryTool();
});
function makePrimaryTool() {
    var first = document.querySelector(".all-tools-container .tool-primary");
    var name = first.getAttribute("data-tool-bridge") || first.getAttribute("data-tool-url");
    primaryTool = createTool(name, {
        sides: first,
        chained: false,
    });
}
function createTool(name, extra) {
    var bridge = window.bridges[name] !== undefined ? window.bridges[name]() : false;
    var tool = null;
    var opts = bridge.config;
    var simple = Object.keys(opts).length == 0;
    if (opts.type == "image") {
        tool = new ImageTool(bridge.converter, opts, extra);
    }
    if (!simple) {
        var overrides = opts.override;
        for (var path in overrides) {
            tool.override(path).with(overrides[path]);
        }
    }
    console.log(bridge);
}
function ImageTool(bridge, config, extra) {
    var tool = new Tool({
        converter: bridge,
        sides: extra.sides,
        chained: extra.chained,
    });
    function resetFileInput(tool) {
        var input = tool.input.element.querySelector(
            ".widget-load input[type=file]"
        );
        input.value = "";
        input.type = "";
        input.type = "file";
    }
    function asyncRespond(blob) {
        var tool = this;
        if (blob === undefined) {
            var canvas = tool.output.element.querySelector(".data");
            canvas.toBlob(function (blob) {
                tool.dispatchEvent("response", blob);
            });
            return;
        }
        tool.dispatchEvent("response", blob);
    }
    function getInputValue() {
        return this.input.blob;
    }
    function getOutputValue() {
        return this.output.blob;
    }
    function setOutputValue(blob) {
        this.output.blob = blob;
    }
    function setInputValue(value, callback) {
        var tool = this;
        if (!value) {
            callback && callback();
            return;
        }
        if (value instanceof Blob) {
            try {
                tool.input.blob = value;
                var image = document.createElement("img");
                image.onload = function () {
                    var data = tool.input.element.querySelector("canvas.data");
                    var box = tool.input.element.querySelector(".side-box");
                    box.classList.remove("empty");
                    data.width = image.naturalWidth;
                    data.height = image.naturalHeight;
                    markCanvasesReady(tool);
                    data.getContext("2d").drawImage(image, 0, 0);
                    URL.revokeObjectURL(image.src);
                    resetFileInput(tool);
                    callback && callback();
                };
                console.log(URL.createObjectURL(value));
                image.src = URL.createObjectURL(value);
            } catch (ignored) { }
        }
    }
    function processFile(blob, trigger) {
        if (!trigger) trigger = Trigger.IMPORT;
        var tool = this;
        tool.input.setValue(blob, function () {
            tool.input.showStatus("imported");
            element.classList.remove("importing");
            tool.convert(trigger);
        });
    }
    function markCanvasesReady(tool) {
        var elements = [
            tool.input.element.querySelector("canvas.data"),
            tool.output.element
                ? tool.output.element.querySelector("canvas.data")
                : null,
            tool.input.element.querySelector("canvas.preview"),
            tool.output.element
                ? tool.output.element.querySelector("canvas.preview")
                : null,
        ];
        for (var i = 0; i < elements.length; i++) {
            if (elements[i]) {
                elements[i].classList.add("not-empty");
                elements[i].style.transform = "";
                elements[i].removeAttribute("data-scroll-x");
                elements[i].removeAttribute("data-scroll-y");
            }
        }
    }
    function makeInputCanvasDownloadFn(fileExtension) {
        return function (cb) {
            var tool = this;
            if (!tool.input.blob || !tool.input.element) {
                return cb(null, "nothing to save");
            }
            if (typeof fileExtension === "function") {
                fileExtension = fileExtension.call(tool);
            }
            return cb(
                [tool.input.blob, "input-" + tool.siteName + "." + fileExtension],
                null
            );
        };
    }
    function makeOutputCanvasDownloadFn(fileExtension) {
        var extensionToMimeType = {
            png: "image/png",
            jpg: "image/jpeg",
            bmp: "image/bmp",
            gif: "image/gif",
        };
        return function (cb) {
            var tool = this;
            if (!tool.output.element) {
                return cb(null, "nothing to save");
            }
            if (typeof fileExtension === "function") {
                fileExtension = fileExtension.call(tool);
            }
            var mimeType = extensionToMimeType[fileExtension] || "image/png";
            var dataCanvas = tool.output.element.querySelector(".data");
            dataCanvas.toBlob(function (blob) {
                cb([blob, "output-" + tool.siteName + "." + fileExtension], null);
            }, mimeType);
        };
    }
    function restoreInput(opts) {
        var callback = opts.then;
        if (opts.hasInput) {
            var getURLDomain = function (url) {
                var a = document.createElement("a");
                a.href = url;
                var domain = a.hostname.split(".");
                var tld = domain[domain.length - 1];
                var site = domain[domain.length - 2];
                if (!site || !tld) {
                    return "url";
                }
                return site + "." + tld;
            };
            var value = opts.queryURL || opts.queryInput || opts.savedInput;
            opts.showStatus("loading from url...");
            tool.input.setValue(value, callback);
        } else {
            callback();
        }
    }

    // uploading function
    function importAsBase64(e) {
        var tool = this;
        tool.input.showStatus("importing...");
        var blob = e.target.files[0];
        console.log(blob);
        if (blob) {
            processFile.call(tool, blob, Trigger.IMPORT);
        } else {
            tool.input.showWarningBadge("Can't import", "No file was selected.", -1);
        }
    }
    if (config.input) {
        if (config.input.import == "base64") {
            tool.input.importFromFile = importAsBase64.bind(tool);
        }
        if (config.parseImage === false) {
            tool.parseImage = false;
        } else {
            tool.parseImage = true;
        }
        if (config.input.image == true) {
            var element = tool.input.element.querySelector(".side-box");
            element.querySelector(".preview").addEventListener("click", function () {
                element.querySelector(".widget-load").click();
            });
            tool.input.setValue = setInputValue.bind(tool);
            tool.input.getValue = getInputValue.bind(tool);
            tool.restore.input = restoreInput.bind(tool);
        }
        if (config.input.download) {
            tool.input.download = makeInputCanvasDownloadFn(
                config.input.download
            ).bind(tool);
        }
    }
    if (config.output) {
        if (config.output.download) {
            tool.output.download = makeOutputCanvasDownloadFn(
                config.output.download
            ).bind(tool);
        }
        tool.output.setValue = setOutputValue.bind(tool);
        tool.output.getValue = getOutputValue.bind(tool);
        tool.respond = asyncRespond.bind(tool);
    }
    return tool;
}
function Tool(config) {
    var tool = this;
    tool.sides = config.sides;
    tool.input = {
        getValue: function () {
            if (!tool.input.element) return "";
            var e = tool.input.element.querySelector("textarea.data");
            return e ? e.value : "";
        },
        setValue: function (value) {
            if (!tool.input.element) return "";
            var e = tool.input.element.querySelector("textarea.data");
            if (e) {
                e.value = value;
                tool.save();
                return e.value;
            }
        },
        showStatus: function (text) {
            var side = tool.input.element;
            return tool.showStatus(side, text);
        },
        showPositiveBadge: function (title, message) {
            var side = tool.input.element;
            return tool.showBadge(side, "positive", title, message);
        },
        showNegativeBadge: function (title, message) {
            var side = tool.input.element;
            return tool.showBadge(side, "negative", title, message);
        },
        showWarningBadge: function (title, message) {
            var side = tool.input.element;
            return tool.showBadge(side, "warning", title, message);
        },
        hideBadge: function () {
            var side = tool.input.element;
            return tool.hideAllBadges(side);
        },
        download: function (cb) {
            var blob = new Blob([tool.input.getValue()], {
                type: "text/plain;charset=utf-8",
            });
            cb([blob, "input-" + tool.siteName + ".txt"], null);
        },
        toClipboard: function () {
            return tool.toClipboard(tool.input);
        },
        showWidgetToggle: function (name) {
            tool.dispatchEvent("widgetshow", {
                side: "input",
                name: name,
                cause: "function",
            });
        },
        hideWidgetToggle: function () {
            tool.dispatchEvent("widgethide", { side: "input", cause: "function" });
        },
        element: null,
    };
    tool.output = {
        getValue: function () {
            if (!tool.output.element) return "";
            var e = tool.output.element.querySelector("textarea.data");
            return e ? e.value : "";
        },
        setValue: function (value) {
            if (!tool.output.element) return "";
            var e = tool.output.element.querySelector("textarea.data");
            return e ? (e.value = value) : "";
        },
        showError: function (error) {
            tool.output.hideError();
            tool.output.hideBadge();
            tool.output.element.classList.add("error");
            tool.output.showNegativeBadge("Can't convert.", "An error has occurred.");
            tool.output.showStatus("error");
            tool.output.setValue("Error: {0}".format(error || "(not specified)"));
        },
        hideError: function () {
            tool.output.hideBadge();
            tool.output.element.classList.remove("error");
        },
        showPositiveBadge: function (title, message) {
            var side = tool.output.element;
            tool.showBadge(side, "positive", title, message);
        },
        showNegativeBadge: function (title, message) {
            var side = tool.output.element;
            tool.showBadge(side, "negative", title, message);
        },
        showWarningBadge: function (title, message) {
            var side = tool.output.element;
            tool.showBadge(side, "warning", title, message);
        },
        hideBadge: function () {
            var side = tool.output.element;
            tool.hideAllBadges(side);
        },
        download: function (cb) {
            var blob = new Blob([tool.output.getValue()], {
                type: "text/plain;charset=utf-8",
            });
            cb([blob, "output-" + tool.siteName + ".txt"], null);
        },
        toClipboard: function () {
            return tool.toClipboard(tool.output);
        },
        showStatus: function (text) {
            var side = tool.output.element;
            return tool.showStatus(side, text);
        },
        showWidgetToggle: function (name) {
            tool.dispatchEvent("widgetshow", {
                side: "output",
                name: name,
                cause: "function",
            });
        },
        hideWidgetToggle: function () {
            tool.dispatchEvent("widgethide", { side: "output", cause: "function" });
        },
        element: null,
    };
    tool.save = function () {
        if (!tool.isPrimary) {
            return;
        }
        if (typeof Storage === "undefined") {
            tool.warn("error:save", "local storage not supported");
            return false;
        }
        var input = tool.input.element
            ? tool.input.element.querySelector(".data")
            : false;
        var options = tool.options.element;
        var storage = window.localStorage || null;
        if (storage) storage.setItem("autosave_origin", window.location.pathname);
        if (input && input.getAttribute("data-autosave") !== null) {
            var old = storage.autosave_input;
            var cur = tool.input.getValue();
            if (old !== cur) {
                if (storage) storage.setItem("autosave_input", cur);
                tool.input.showStatus("saved");
            }
        }
        if (options && options.getAttribute("data-autosave") !== null) {
            var old = storage.autosave_options || {};
            var cur = JSON.stringify(tool.options.get());
            if (!isEquivalent(old, cur)) {
                if (storage) storage.setItem("autosave_options", cur);
            }
        }
    };
    tool.restore = {
        input: function (opts) {
            var callback = opts.then;
            if (opts.hasInput) {
                var getURLDomain = function (url) {
                    var a = document.createElement("a");
                    a.href = url;
                    var domain = a.hostname.split(".");
                    var tld = domain[domain.length - 1];
                    var site = domain[domain.length - 2];
                    if (!site || !tld) {
                        return "url";
                    }
                    return site + "." + tld;
                };
                var setInput = function (value) {
                    var setter = tool.input.setValue;
                    if (setter.length == 2) {
                        setter(value, callback.bind(null, true));
                    } else if (setter.length == 1) {
                        setter(value);
                        callback(true);
                    }
                };
                var getExternalText = function (url, callback) {
                    if (
                        url.indexOf("http:") !== 0 &&
                        url.indexOf("https:") !== 0 &&
                        url.indexOf("ftp:") !== 0
                    ) {
                        if (url.indexOf("/") !== 0) {
                            url = "http://" + url;
                        }
                    }
                    var xhttp = new XMLHttpRequest();
                    xhttp.onreadystatechange = function () {
                        if (this.readyState == 4 && this.status == 200) {
                            callback(this.responseText);
                        } else if (this.readyState == 4 && this.status == 0) {
                            getExternalText(
                                "/get-external-file?url=" + encodeURIComponent(url),
                                callback
                            );
                        }
                    };
                    xhttp.open("GET", url, true);
                    xhttp.responseType = "text";
                    xhttp.send();
                };
                if (opts.queryURL) {
                    opts.showStatus(
                        "loading from {0}...".format(getURLDomain(opts.queryURL))
                    );
                    getExternalText(opts.queryURL, setInput);
                } else {
                    opts.showStatus("loading from input...");
                    setInput(opts.queryInput || opts.savedInput);
                }
            } else {
                callback();
            }
        },
        options: function (opts) {
            var callback = opts.then;
            if (opts.hasOptions) {
                if (opts.savedOptions) tool.options.set(opts.savedOptions);
                var currentOptions = tool.options.get();
                var queryOptions = {};
                for (var key in opts.fullQuery) {
                    var isInQuery = opts.fullQuery[key] !== undefined;
                    var isInOptions = currentOptions[key] !== undefined;
                    if (isInQuery && isInOptions) {
                        queryOptions[key] = opts.fullQuery[key];
                    }
                }
                var anyChanged = Object.keys(queryOptions).length > 0;
                if (anyChanged) {
                    tool.options.set(queryOptions);
                }
                callback(anyChanged);
            } else {
                callback(false);
            }
        },
        all: function () {
            if (!tool.isPrimary) {
                return;
            }
            var storage = window.localStorage || {};
            var differentOrigin =
                storage.autosave_origin &&
                window.location.pathname !== storage.autosave_origin;
            if (differentOrigin) {
                storage.autosave_input = "";
                storage.autosave_options = "{}";
            }
            var query = getURLQuery();
            var savedInput = storage.autosave_input || "";
            var savedOptions = JSON.parse(storage.autosave_options || "{}");
            var queryInput = query.input;
            var queryURL = query["input-url"];
            tool.restore.input({
                savedInput: savedInput,
                queryInput: queryInput,
                showStatus: tool.input.showStatus,
                hasInput: !!tool.input.element,
                queryURL: queryURL,
                then: function () {
                    tool.restore.options({
                        savedOptions: savedOptions,
                        hasOptions: !!tool.options.element,
                        fullQuery: query,
                        then: function (optionsRestored) {
                            tool.convert(Trigger.RESTORE);
                            if (queryInput === null) {
                                tool.input.showWarningBadge(
                                    "Can't load input from query",
                                    "The ?input parameter is malformed."
                                );
                            }
                            if (queryURL === null) {
                                tool.input.showWarningBadge(
                                    "Can't load input from URL",
                                    "The ?input-url parameter is malformed."
                                );
                            }
                        },
                    });
                },
            });
        },
    };
    tool.swap = function (to) {
        if (tool.input.element && tool.output.element) {
            var input_value = tool.input.getValue() || "";
            var output_value = tool.output.getValue() || "";
            var input_label = tool.input.element.querySelector("label");
            var output_label = tool.output.element.querySelector("label");
            if (!input_label.style.left) {
                var delta = Math.abs(
                    output_label.getBoundingClientRect().left -
                    input_label.getBoundingClientRect().left
                );
                input_label.style.left = delta + "px";
                output_label.style.left = -1 * delta + "px";
                tool.input.setValue(output_value);
                tool.output.setValue(input_value);
                if (typeof Storage !== "undefined") {
                    var storage = window.localStorage;
                    storage.setItem("autosave_origin", "/" + to);
                    storage.setItem("autosave_input", output_value);
                }
                setTimeout(function () {
                    window.location.assign("/" + to);
                }, 100);
            }
        } else {
        }
    };
    tool.trigger = null;
    tool.resetErrorsOnConvert = true;
    tool.respond = function (result) {
        if (result === undefined) {
            result = tool.output.getValue();
        }
        tool.dispatchEvent("response", result);
    };
    tool.events = {
        response: [],
        optionchange: [],
        widgetshow: [],
        widgethide: [],
    };
    tool.dispatchEvent = function (event, data) {
        if (Object.keys(tool.events).indexOf(event) === -1) {
            throw 'Event "' + event + '" is not supported';
        }
        var handlers = tool.events[event];
        for (var i = 0; i < handlers.length; i++) {
            var result = handlers[i].handler.call(tool, data);
            if (handlers[i].once) {
                tool.events[event].splice(i, 1);
            }
            if (result === false) break;
        }
    };
    tool.removeEventListener = function (event, note) {
        if (Object.keys(tool.events).indexOf(event) === -1) {
            throw 'Event "' + event + '" is not supported';
        }
        if (typeof note === "undefined") {
            throw "Listener note is not specified";
        }
        var handlers = tool.events[event];
        for (var i = 0; i < handlers.length; i++) {
            if (handlers[i].note == note) {
                tool.events[event].splice(i, 1);
            }
        }
    };
    tool.addEventListener = function (opts) {
        if (typeof opts !== "object") opts = {};
        var event = opts.event || "undefined";
        var handler = opts.handler || false;
        if (!handler) {
            throw "Event handler is not specified";
        }
        if (Object.keys(tool.events).indexOf(event) === -1) {
            throw 'Event "' + event + '" is not supported';
        }
        tool.events[event].push({
            handler: handler,
            note: opts.note || undefined,
            once: opts.once || false,
        });
    };
    tool.isPrimary = !config.chained;
    tool.chainParent = null;
    tool.chainChild = null;
    tool.getCompatibility = function () {
        var sides = tool.sides;
        var accepts = sides.getAttribute("data-accepts") || false;
        var returns = sides.getAttribute("data-returns") || false;
        return { accepts: accepts, returns: returns };
    };
    tool.attachChain = function (another) {
        tool.chainChild = another;
        another.chainParent = tool;
        tool.addEventListener({
            event: "response",
            note: "chain",
            handler: function (data) {
                var setter = another.input.setValue;
                tool.log({
                    type: "chain propagate",
                    from: tool,
                    to: another,
                    data: data,
                });
                if (setter.length == 2) {
                    setter(data, function () {
                        another.convert(Trigger.CHAIN);
                    });
                } else if (setter.length == 1) {
                    setter(data);
                    another.convert(Trigger.CHAIN);
                }
            },
        });
        var data = tool.output.getValue();
        if (data) {
            tool.log({ type: "chain connect", from: tool, to: another, data: data });
            var setter = another.input.setValue;
            if (setter.length == 2) {
                setter(data, function () {
                    another.convert(Trigger.CHAIN);
                });
            } else if (setter.length == 1) {
                setter(data);
                another.convert(Trigger.CHAIN);
            }
        }
    };
    tool.removeChain = function () {
        tool.chainChild.chainParent = null;
        tool.chainChild = null;
        tool.removeEventListener("response", "chain");
    };
    tool.convert = function (trigger) {
        var input = !!tool.input.element;
        var output = !!tool.output.element;
        tool.trigger = null;
        if (trigger) tool.trigger = trigger;
        tool.log({ type: "conversion", trigger: trigger });
        if (input && output) {
            if (tool.resetErrorsOnConvert) {
                tool.output.hideError();
                tool.input.hideBadge();
            }
            var value = tool.input.getValue();
            try {
                var result = tool.converter(value);
                if (result !== undefined) {
                    tool.dispatchEvent("response", result);
                }
            } catch (error) {
                window.raise("<b>Conversion error:</b> " + error.toString());
                console.error(error);
                if (!value) {
                    tool.output.setValue("");
                } else {
                    tool.warn("error:converting", error.toString());
                    tool.output.showError(error);
                }
            }
        } else if (input && !output) {
            tool.resetErrorsOnConvert && tool.input.hideBadge();
            try {
                var value = tool.input.getValue();
                tool.converter(value);
            } catch (error) {
                window.raise("<b>Conversion error:</b> " + error.toString());
                console.error(error);
                if (!value) {
                    tool.output.setValue("");
                } else {
                    tool.warn("error:converting", error.toString());
                    tool.input.showNegativeBadge("Error has occured", error, -1);
                }
            }
        } else if (!input && output) {
            tool.resetErrorsOnConvert && tool.output.hideError();
            try {
                var result = tool.converter();
                if (result !== undefined) {
                    tool.dispatchEvent("response", result);
                }
            } catch (error) {
                window.raise("<b>Conversion error:</b> " + error.toString());
                console.error(error);
                tool.warn("error:converting", error.toString());
                tool.output.showError(error);
            }
        }
        tool.save();
    };
    tool.converter = function () { };
    tool.options = {
        default: null,
        get: function (source) {
            var overriddenData = tool.sides.getAttribute("data-override-options");
            if (!source) {
                source = tool.options.element;
            }
            if (!source) {
                if (overriddenData) {
                    return JSON.parse(overriddenData);
                } else {
                    return {};
                }
            }
            var resets = source.getAttribute("data-resets-all-options") !== null;
            if (resets) {
                tool.options.reset();
            }
            var inputs = source.querySelectorAll(".input-option");
            var options = {};
            for (var i = 0; i < inputs.length; i++) {
                var input = inputs[i];
                var index = input.getAttribute("data-index");
                var value = null;
                var tag = input.tagName.toLowerCase();
                if (input.type == "checkbox" || input.type == "radio")
                    value = input.checked;
                else if (input.type == "text" || tag == "textarea" || tag == "select")
                    value = input.value;
                options[index] = value;
            }
            if (overriddenData) {
                var defined = JSON.parse(overriddenData);
                for (var key in defined) {
                    options[key] = defined[key];
                }
            }
            return options;
        },
        set: function (options) {
            var source = tool.options.element;
            if (source) {
                var inputs = source.querySelectorAll(".input-option");
                for (var i = 0; i < inputs.length; i++) {
                    var input = inputs[i];
                    var index = input.getAttribute("data-index");
                    if (typeof options[index] !== "undefined") {
                        var value = options[index];
                        var tag = input.tagName.toLowerCase();
                        if (input.type == "checkbox" || input.type == "radio")
                            input.checked = value;
                        else if (
                            input.type == "text" ||
                            tag == "textarea" ||
                            tag == "select"
                        )
                            input.value = value;
                        if (input.type == "textarea") {
                            input.style.height = "auto";
                            input.style.height = input.scrollHeight + "px";
                        }
                    }
                }
            }
            return tool.options.get();
        },
        reset: function () {
            tool.options.set(tool.options.default);
        },
        describe: function (key, value) {
            var source = tool.options.element;
            if (source) {
                var element = source.querySelector(
                    '.option-detail-key[data-detail-key="' + key + '"]'
                );
                if (element) element.innerText = value;
            }
            return tool.options.get();
        },
        element: null,
    };
    tool.accidents = [];
    tool.warn = function (type, data) {
        var event = { event: type, data: data };
        tool.accidents.push(event);
        window.raise(
            "<b>Tool warning:</b> (" + type.toString() + ") " + data.toString(),
            "warning"
        );
    };
    tool.log = function (data) {
        window.log(tool, data);
    };
    tool.init = function () {
        var sides = tool.sides;
        var examples_wrapper = config.examples;
        tool.input.element = sides.querySelector(".side.input");
        tool.output.element = sides.querySelector(".side.output");
        tool.options.element = sides.querySelector(".converter-options");
        var option_details = tool.options.element
            ? tool.options.element.querySelectorAll(".option-row .option-details")
            : null;
        if (option_details) {
            for (var i = 0; i < option_details.length; i++) {
                var detail = option_details[i];
                detail.innerHTML = detail.innerHTML.replace(
                    /{([a-z0-9\-]+)}/gi,
                    function (match, key) {
                        var span = document.createElement("span");
                        span.className = "option-detail-key";
                        span.setAttribute("data-detail-key", key);
                        span.innerText = "<" + key + ">";
                        return span.outerHTML;
                    }
                );
            }
        }
        if (tool.input.element) {
            makeToggleableWidgets(tool, "input");
            console.log(tool.input.element);

            // tool.input.element.addEventListener("keyup", function () {
            //     tool.convert(Trigger.KEYPRESS);
            // });

            // var import_widget = sides.querySelector(".widget-load");
            // import_widget.addEventListener("click", function () {
            //     sides.querySelector(".widget-load input").click();
            // });

            inputBox.onclick = function () {
                document.querySelector('#file').click()
            }

            var import_input = document.querySelector("#file");
            import_input.addEventListener(
                "change",
                function (e) {
                    console.log(e);
                    stopLoading()
                    document.querySelector('.workspace').style.display = 'block'
                    tool.input.importFromFile(e);
                },
                false
            );
            var download_input_widget = sides.querySelector(".input .widget-save-as");
            download_input_widget.addEventListener("click", function () {
                tool.input.showStatus("saving...");
                tool.input.download(function (result, error) {
                    if (error) {
                        return tool.input.showStatus(error);
                    }
                    saveAs(result[0], result[1]);
                });
            });
        }
        if (tool.output.element) {
            makeToggleableWidgets(tool, "output");
            var download_output_widget = document.querySelector("#download-button");
            var outputTextarea = tool.output.element.querySelector("textarea.data");
            var outputSaving = true;
            download_output_widget.addEventListener("click", function (event) {
                let gifPreparing = document.getElementById("gif-preparing");
                if (
                    tool.input.getValue() != undefined &&
                    download_output_widget.dataset.subscription == "free"
                ) {
                    download_output_widget.innerHTML = "Preparing...";
                    download_output_widget.setAttribute("disabled", "disabled");
                    if (gifPreparing != undefined && gifPreparing != null) {
                        gifPreparing.classList.remove("d-none");
                        gifPreparing.classList.add("d-block");
                    }
                }
                tool.output.download(function (result, error) {
                    if (error) {
                        download_output_widget.innerHTML = "Download";
                        download_output_widget.removeAttribute("disabled");
                        return tool.input.showStatus(error);
                    }
                    if (download_output_widget.dataset.subscription == "free") {
                        var timeleft = 10;
                        var downloadTimer = setInterval(function () {
                            if (timeleft <= 0) {
                                clearInterval(downloadTimer);
                                download_output_widget.innerHTML = "Download";
                                download_output_widget.removeAttribute("disabled");
                                saveAs(result[0], result[1]);

                            } else {
                                download_output_widget.innerHTML = `${timeleft} second${timeleft > 1 ? "s" : ""
                                    } remaining`;
                            }
                            timeleft -= 1;
                        }, 100);
                    } else {
                        saveAs(result[0], result[1]);
                    }
                });
            });
        }
        tool.globalHandlers.convertOnResize =
            tool.globalHandlers.convertOnResize.bind(tool);
        window.addEventListener("resize", tool.globalHandlers.convertOnResize);
        if (examples_wrapper) {
            var samples = examples_wrapper.querySelectorAll(".card");
            if (samples) {
                for (var i = 0; i < samples.length; i++) {
                    (function (sample) {
                        sample.addEventListener("click", function (e) {
                            tool.setExample.call(tool, sample);
                        });
                    })(samples[i]);
                }
            }
        }
        tool.addEventListener({
            event: "optionchange",
            handler: tool.convert.bind(tool, Trigger.OPTIONS),
        });
        var all_options = sides.querySelectorAll(
            ".converter-options .input-option"
        );
        if (all_options) {
            for (var i = 0; i < all_options.length; i++) {
                var o = all_options[i];
                o.addEventListener(
                    "change",
                    tool.dispatchEvent.bind(tool, "optionchange")
                );
                o.addEventListener(
                    "keyup",
                    tool.dispatchEvent.bind(tool, "optionchange")
                );
            }
        }
        tool.addEventListener({
            event: "response",
            handler: function (e) {
                tool.log({ type: "response self", data: e });
                this.output.setValue(e);
            },
        });
        tool.addEventListener({
            event: "widgetshow",
            handler: function (e) {
                showWidgetToggle(tool, e.side, e.name);
            },
        });
        tool.addEventListener({
            event: "widgethide",
            handler: function (e) {
                hideWidgetToggle(tool, e.side);
            },
        });
        sides.tool = tool;
        tool.converter = config.converter;
        tool.sides = sides;
        var button_fav = sides.querySelector(".tool-favorite");
        if (button_fav) {
            button_fav.addEventListener("click", tool.favorite.bind(tool));
            tool.favorite();
        }
        tool.options.default = tool.options.get();
    };
    tool.override = function (path) {
        path = path.split(".");
        var object = tool;
        var index = null;
        for (var i = 0; i < path.length; i++) {
            index = path[i];
            if (object[index] !== undefined) {
                if (i != path.length - 1) object = object[index];
            } else
                throw (
                    "tool." + path.splice(0, i).join(".") + " does not contain " + index
                );
        }
        return {
            with: function (fn) {
                object[index] = fn.bind(tool);
            },
        };
    };
    tool.destroy = function () {
        tool.output.element = null;
        tool.output.tool = null;
        tool.input.element = null;
        tool.input.tool = null;
        tool.options.element = null;
        tool.converter = null;
        tool.sides.tool = null;
        tool.sides.innerHTML = tool.sides.innerHTML;
        tool.sides.parentElement.removeChild(tool.sides);
        tool.sides = null;
        for (var event in tool.events) {
            tool.events[event] = [];
        }
        window.removeEventListener("resize", tool.globalHandlers.convertOnResize);
        tool = null;
    };
    tool.input.tool = tool;
    tool.output.tool = tool;
    tool.init();
    tool.start = function () {
        tool.restore.all();
        return tool;
    };
}
var Trigger = Object.freeze({
    OPTIONS: 1,
    ACTION: 2,
    KEYPRESS: 3,
    RESIZE: 4,
    RESTORE: 5,
    EXAMPLE: 6,
    IMPORT: 7,
    CHAIN: 8,
});
Tool.prototype.globalHandlers = {
    convertOnResize: function () {
        this.convert(Trigger.RESIZE);
    },
};
Tool.prototype.showBadge = function (side, type, title, message) {
    this.hideAllBadges(side);
    if (side && (type == "negative" || type == "positive" || type == "warning")) {
        var padding = 5;
        var t = side.querySelector(".badge .badge-title");
        var m = side.querySelector(".badge .badge-message");
        t.textContent = title;
        m.textContent = message;
        side.classList.add("badge-" + type);
        var badgeHeight = side.querySelector(".badge").offsetHeight;
        var wrap = side.querySelector(".data-wrapper");
        if (wrap) {
            wrap.style.paddingTop = badgeHeight + padding + "px";
        }
    }
};
Tool.prototype.siteName = (function () {
    if (/^local/.test(window.location.host)) {
        return window.location.host.split(".")[1];
    } else {
        return window.location.host.split(".")[0];
    }
})();
Tool.prototype.hideAllBadges = function (side) {
    if (!side) return;
    var wrap = side.querySelector(".data-wrapper");
    if (wrap) {
        wrap.style.paddingTop = "";
    }
    side.classList.remove("badge-negative");
    side.classList.remove("badge-positive");
    // side.classList.remove("badge-warning");
};
Tool.prototype.showStatus = function (side, text) {
    if (!side) return;
    var duration = 1000;
    var e = side.querySelector("label .status");
    var r = Math.random();
    e.textContent = text;
    e.className = "status active";
    e.setAttribute("animation-id", r);
    setTimeout(function () {
        if (r == e.getAttribute("animation-id")) {
            e.classList.remove("active");
            setTimeout(function () {
                e.textContent = "";
            }, 200);
        }
    }, duration);
};
function makeToggleableWidgets(tool, side) {
    var side_widgets = tool[side].element.querySelector(".side-widgets");
    var wrapper = side_widgets.querySelector(".side-widgets-wrapper");
    var toggle = side_widgets.querySelector(".side-widgets-toggle");
    var widgets = side_widgets.querySelectorAll(".widget");
    for (var i = 0; i < widgets.length; i++) {
        (function (w) {
            w.addEventListener("click", function () {
                var section = w.getAttribute("data-toggle");
                var autohide = w.getAttribute("data-hides-toggle") !== null;
                if (section) {
                    tool.dispatchEvent("widgetshow", {
                        side: side,
                        cause: "click",
                        name: section,
                    });
                }
                if (autohide) {
                    tool.dispatchEvent("widgethide", { side: side, cause: "click" });
                }
            });
        })(widgets[i]);
    }
    window.addEventListener("keyup", function (e) {
        var key = e.key.toLowerCase();
        var esc = key == "esc" || key == "escape";
        var opened = side_widgets.classList.contains("toggled");
        if (esc && opened) {
            tool.dispatchEvent("widgethide", { cause: "esc", side: side });
        }
    });
}
function hideWidgetToggle(tool, side) {
    var element = tool[side].element;
    if (element) {
        var container = element.querySelector(".side-widgets");
        var wrapper = container.querySelector(".side-widgets-wrapper");
        var toggle = container.querySelector(".side-widgets-toggle");
        wrapper.style.transform = "rotateX(0deg) translateY(0px) translateZ(0px)";
        toggle.style.transform =
            "rotateX(90deg) translateY(-50%) translateZ({0}px)".format(
                container.offsetHeight / 2
            );
        container.classList.remove("toggled");
    }
}
function showWidgetToggle(tool, side, name) {
    var element = tool[side].element;
    if (element) {
        var container = element.querySelector(".side-widgets");
        var wrapper = container.querySelector(".side-widgets-wrapper");
        var toggle = container.querySelector(".side-widgets-toggle");
        hideWidgetToggle(tool, side);
        if (name) {
            var group = toggle.querySelector("." + name);
            if (group) {
                var groups = container.querySelectorAll(
                    ".side-widgets-toggle .toggle-wrapper .widget-toggle"
                );
                for (var i = 0; i < groups.length; i++) {
                    groups[i].classList.remove("toggle-active");
                }
                group.classList.add("toggle-active");
                toggle.style.transform =
                    "rotateX(0deg) translateY(0px) translateZ(0px)";
                wrapper.style.transform =
                    "rotateX(-90deg) translateY(50%) translateZ({0}px)".format(
                        container.offsetHeight / 2
                    );
                container.classList.remove("toggled");
                container.classList.add("toggled");
            } else {
                window.raise(
                    "Widget tried to toggle section .{0}, but it does not exists.".format(
                        name
                    )
                );
            }
        }
    }
}
function getURLQuery(key) {
    var s = window.location.search.substring(1).split("&");
    var query = {};
    for (var i = 0; i < s.length; i++) {
        var pair = s[i].split("=");
        try {
            var k = decodeURIComponent(pair[0]);
        } catch (e) {
            continue;
        }
        try {
            var v = decodeURIComponent(pair[1] || "");
        } catch (e) {
            var v = null;
        }
        if (v == "true" || v == "yes" || v == "false" || v == "no")
            v = v == "true" || v == "yes";
        if (k) query[k] = v;
    }
    return key ? query[key] : query;
}
function isEquivalent(a, b) {
    if (typeof a !== "object" || typeof b !== "object") return false;
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);
    if (aProps.length != bProps.length) {
        return false;
    }
    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];
        if (a[propName] !== b[propName]) {
            return false;
        }
    }
    return true;
}
