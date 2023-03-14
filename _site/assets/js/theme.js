$(document).ready(function () {
  var safuiAlert = $("#safeui-alert");
  if (safuiAlert) {
    safuiAlert
      .first()
      .delay(10000)
      .slideUp(1000, function () {
        $(this).remove();
      });
  }
});
let getLayout = document.getElementById("header");
const layout = getLayout.dataset.layout;
if (layout == "feature-1") {
  var removeNav = () => {
    let homeLink = document.getElementById("home-link");
    homeLink.style.marginRight = "10px";
    document.getElementById("h1-img-wrapper").prepend(homeLink);

    document.getElementById("header").style.display = "none";
    document.querySelector(".feature1-h1").style.width = "100%";
    document.querySelector(".feature1-h2").style.display = "none";
    console.log(document.querySelector(".feature1-flex-container"));
    document.querySelector(".feature1-flex-container").style.paddingTop =
      "0rem";
    document.querySelector(".feature1-flex-container").style.paddingBottom =
      "0rem";
  };
} else {
  var removeNav = () => {
    let homeLink = document.getElementById("home-link");
    homeLink.style.marginRight = "10px";
    document.getElementById("h1-img-wrapper").prepend(homeLink);
    document
      .getElementById("h1-img-wrapper")
      .style.setProperty("align-items", "unset", "important");
    document.getElementById("header").style.display = "none";
    document.getElementById("h1-img").style.display = "none";
    document.getElementById("feature-h1").style.width = "100%";
    document.getElementById("feature-h2").style.display = "none";
    let safeUiAlert = document.getElementById("safeui-alert");
    if (safeUiAlert) {
      safeUiAlert.style.display = "none";
    }
  };
}
