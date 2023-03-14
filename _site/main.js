window.raise = function () { };
window.log = function () { };
var Site = {

    equalHeightAttached: false,
    equalHeightLayout: function () {
        if (!Site.equalHeightAttached) {
            window.addEventListener("resize", Site.equalHeightLayout);
            Site.equalHeightAttached = true;
        }
        var cards = document.querySelectorAll(".cards.equal-height .card");
        for (var i = 0; i < cards.length; i++) {
            (function (e) {
                e.style.height = "";
                setTimeout(function () {
                    e.style.height = e.offsetHeight + "px";
                }, 1);
            })(cards[i]);
        }
    },
    applyToAllElements: function (query, fn) {
        var elements = document.querySelectorAll(query);
        if (elements)
            for (var i = 0; i < elements.length; i++) {
                fn(elements[i]);
            }
    },
    toolFeedback: function (e) {
        var section = document.querySelector(".section.feedback");
        var subject = document.getElementById("feedback-input-subject");
        var query = document.querySelector(".all-tools .search").value;
        var text = document.getElementById("feedback-input-text");
        subject.value = "Empty search results";
        text.value = 'I was searching for "' + query + '" but nothing was found...';
        if (zenscroll) {
            zenscroll.to(section, 250);
            e.preventDefault();
            e.stopPropagation();
        }
    },
    categoryFeedback: function (e) {
        var section = document.querySelector(".section.feedback");
        var subject = document.getElementById("feedback-input-subject");
        var query = document.querySelector(".all-categories .search").value;
        var text = document.getElementById("feedback-input-text");
        subject.value = "Empty search results";
        text.value = 'I was searching for "' + query + '" but nothing was found...';
        if (zenscroll) {
            zenscroll.to(section, 250);
            e.preventDefault();
            e.stopPropagation();
        }
    },
    unlistedFeedback: function (e) {
        var section = document.querySelector(".section.feedback");
        var subject = document.getElementById("feedback-input-subject");
        subject.value = "Unlisted tool feedback";
        if (zenscroll) {
            zenscroll.to(section, 250);
            e.preventDefault();
            e.stopPropagation();
        }
    },
    attachCardHandler: function (card) {
        card.addEventListener("click", function (e) {
            var link = card.querySelector(".title a");
            if (e.target != link) {
                if (typeof Event === "function") {
                    link.dispatchEvent(new MouseEvent(e.type, e));
                } else {
                    var event = document.createEvent("MouseEvents");
                    event.initMouseEvent(
                        e.type,
                        e.bubbles,
                        e.cancelable,
                        e.view,
                        e.detail,
                        e.screenX,
                        e.screenY,
                        e.clientX,
                        e.clientY,
                        e.ctrlKey,
                        e.altKey,
                        e.shiftKey,
                        e.metaKey,
                        e.button,
                        e.relatedTarget
                    );
                    link.dispatchEvent(event);
                }
                return false;
            }
        });
    },
    attachNotifyHandler: function (card) {
        card.addEventListener("click", function () {
            var tool = card.querySelector(".title").textContent;
            Site.showNotify(tool);
        });
    },
    removeStopWords: function (sentence) {
        var replaced = sentence.replace(
            /\b(a|an|the|of|for|to|any|all|from|in|into|-)\b/gi,
            " "
        );
        replaced = replaced.replace(/\s+/g, " ");
        replaced = replaced.replace(/^\s+/, "");
        replaced = replaced.replace(/\s+$/, "");
        return replaced;
    },
    attachProTipInputHandler: function (bar) {
        bar.addEventListener("click", function () {
            var url = bar.getAttribute("data-location");
            window.location.assign(url);
        });
    },
    attachNetworkHandler: function (select) {
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].getAttribute("selected") != null) {
                select.selectedIndex = i;
                break;
            }
        }
        select.addEventListener("change", function () {
            var i = select.selectedIndex;
            var option = select.options[i];
            var url = option.getAttribute("data-location");
            window.location.assign(atob(url));
        });
    },
    showNotify: function (tool) {
        if (tool) {
            Site.hideNotify();
            var notify = document.querySelector(".fullwidth-wrapper");
            if (notify) {
                notify.setAttribute("data-interested-in", tool);
                notify.classList.add("show-notification");
                notify.classList.add("shadow-lock");
                var which = notify.querySelector(".which-tool");
                which.textContent = tool;
                zenscroll.center(notify, 250);
            }
        } else console.error("Can't show notifications for an unknown tool.");
    },
    hideNotify: function () {
        var notify = document.querySelector(".fullwidth-wrapper");
        if (notify) {
            notify.setAttribute("data-interested-in", "");
            notify.classList.remove("show-notification");
            notify.classList.remove("shadow-lock");
        }
    },
    shake: function (element) {
        element.classList.remove("shaking");
        setTimeout(function () {
            element.classList.add("shaking");
        }, 5);
        element.addEventListener("animationend", function () {
            element.classList.remove("shaking");
        });
    },
};
String.prototype.format = function () {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp("\\{" + i + "\\}", "gi");
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};