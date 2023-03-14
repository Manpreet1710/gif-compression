let showPop = false;
if (
  !localStorage.getItem("timeDisplayed") ||
  new Date().getTime() - localStorage.getItem("timeDisplayed") >=
    60000 * 24 * 60
) {
  showPop = true;
  localStorage.setItem("timeDisplayed", new Date().getTime());
} else {
  showPop = false;
}
let freeCount = localStorage.getItem("freeCount");
if (!freeCount) {
  freeCount = 0;
}
localStorage.setItem(
  "freeCount",
  Number(freeCount) < 5 ? Number(freeCount) + 1 : 5
);
if (freeCount >= 5 || showPop) {
  $(".nav-tabs a.nav-tab-link").click(function () {
    $(".nav-tabs  a.nav-tab-link").removeClass("active");
  });

  const detect = document.querySelector("#detect");
  const wrapper = document.querySelector(".wrapper");
  const closePopup = document.getElementsByClassName("closePopup");
  const extensions = document.querySelector(".extensions");

  const refresh = () => {
    location.reload();
  };

  let adsBtn = document.querySelector(".allow-ads-btn");
  adsBtn.addEventListener("click", () => {
    extensions.classList.add("showPopUp");
  });

  let adClasses = [
    "ad",
    "ads",
    "adsbox",
    "doubleclick",
    "ad-placement",
    "ad-placeholder",
    "adbadge",
    "BannerAd",
  ];
  for (let item of adClasses) {
    detect.classList.add(item);
  }

  let getProperty = window.getComputedStyle(detect).getPropertyValue("display");
  console.log(getProperty);
  if (!wrapper.classList.contains("showPopUp")) {
    getProperty == "none"
      ? wrapper.classList.add("showPopUp")
      : wrapper.classList.remove("showPopUp");
  }
  closePopup[0].addEventListener("click", () => {
    wrapper.classList.remove("showPopUp");
    localStorage.setItem("freeCount", 0);
  });
  closePopup[1].addEventListener("click", () => {
    extensions.classList.remove("");
    localStorage.setItem("freeCount", 0);
  });
}
