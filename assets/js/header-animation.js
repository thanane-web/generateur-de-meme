(function () {
  // overlay + clone du logo
  const overlay = document.createElement("div");
  overlay.id = "loader-overlay";

  const loaderLogo = document.createElement("img");
  loaderLogo.id = "loader-logo";
  loaderLogo.src = "./assets/img/logo.svg";
  loaderLogo.alt = "";

  overlay.appendChild(loaderLogo);
  document.body.appendChild(overlay);

  // cacher le vrai logo
  const realLogo = document.querySelector(".logo-svg");
  const titleEl = document.querySelector(".svg-title");
  if (realLogo) realLogo.style.opacity = "0";

  //positionne le loader logo au centre
  const size = 180;
  loaderLogo.style.width = size + "px";
  loaderLogo.style.height = size + "px";
  loaderLogo.style.top = "calc(50vh - " + size / 2 + "px)";
  loaderLogo.style.left = "calc(50vw - " + size / 2 + "px)";

  /* 4 ─ Après la rotation (1.1s), envoie le logo vers sa vraie position */
  setTimeout(function () {
    if (!realLogo) return;

    const target = realLogo.getBoundingClientRect();
    const finalSize = target.width || 40;

    /* Active la transition "vol" */
    loaderLogo.classList.add("fly-to-header");

    /* Force un reflow pour que la transition parte bien du centre */
    void loaderLogo.offsetWidth;

    loaderLogo.style.top = target.top + "px";
    loaderLogo.style.left = target.left + "px";
    loaderLogo.style.width = finalSize + "px";
    loaderLogo.style.height = finalSize + "px";

    /* 5 ─ Quand le logo arrive, révèle tout */
    setTimeout(function () {
      /* Montre le vrai logo dans le header */
      realLogo.style.opacity = "1";
      realLogo.style.transition = "opacity 0.15s";

      /* Affiche l'app */
      document.querySelector(".app").classList.add("ready");

      /* Anime le titre lettre par lettre */
      if (titleEl) {
        const text = titleEl.textContent;
        titleEl.textContent = "";
        text.split("").forEach(function (char, i) {
          const span = document.createElement("span");
          span.className = "char";
          span.textContent = char === " " ? "\u00A0" : char;
          span.style.animationDelay = i * 35 + "ms";
          titleEl.appendChild(span);
        });
      }

      /* Fade out et supprime l'overlay */
      overlay.classList.add("fade-out");
      setTimeout(function () {
        overlay.remove();
        loaderLogo.remove();
      }, 30);
    }, 650); /* durée du vol */
  }, 1300); /* durée de la rotation */
})();
