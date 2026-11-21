(function () {
  "use strict";

  var QUESTIONS_PER_ROUND = 10;
  var CHOICES_PER_QUESTION = 4;
  var MORPH_MS = 800;

  var startScreen = document.getElementById("start-screen");
  var quizScreen = document.getElementById("quiz-screen");
  var resultScreen = document.getElementById("result-screen");
  var startBtn = document.getElementById("start-btn");
  var nextBtn = document.getElementById("next-btn");
  var nextWrap = document.getElementById("next-wrap");
  var retryBtn = document.getElementById("retry-btn");
  var shareBtn = document.getElementById("share-btn");
  var copyBtn = document.getElementById("copy-btn");
  var shareText = document.getElementById("share-text");
  var progressFill = document.getElementById("progress-fill");
  var progressLabel = document.getElementById("progress-label");
  var progressBar = document.querySelector(".progress-bar");
  var scoreLabel = document.getElementById("score-label");
  var streakLabel = document.getElementById("streak-label");
  var streakNum = document.getElementById("streak-num");
  var streakHud = document.getElementById("streak-hud");
  var shapeMount = document.getElementById("shape-mount");
  var stageCard = document.getElementById("stage-card");
  var answerStage = document.getElementById("answer-stage");
  var stageBadge = document.getElementById("stage-badge");
  var stageKicker = document.getElementById("stage-kicker");
  var stageAnswerName = document.getElementById("stage-answer-name");
  var stageRegion = document.getElementById("stage-region");
  var stageCapital = document.getElementById("stage-capital");
  var stageAbbr = document.getElementById("stage-abbr");
  var stageFact = document.getElementById("stage-fact");
  var questionHead = document.getElementById("question-head");
  var quizPanel = document.getElementById("quiz-panel");
  var choicesEl = document.getElementById("choices");
  var locatorMap = document.getElementById("locator-map");
  var scoreHud = document.getElementById("score-hud");
  var floatToast = document.getElementById("float-toast");
  var fxLayer = document.getElementById("fx-layer");
  var confettiLayer = document.getElementById("confetti-layer");
  var resultScore = document.getElementById("result-score");
  var resultMessage = document.getElementById("result-message");
  var resultBadge = document.getElementById("result-badge");
  var scoreRing = document.getElementById("score-ring");
  var statCorrect = document.getElementById("stat-correct");
  var statStreak = document.getElementById("stat-streak");
  var statAccuracy = document.getElementById("stat-accuracy");

  var flySilhouette = null;
  var states = Array.isArray(window.US_STATES) ? window.US_STATES.slice() : [];
  var usMap = window.US_MAP && Array.isArray(window.US_MAP.paths) ? window.US_MAP : null;
  var stateById = {};
  states.forEach(function (state) {
    stateById[state.id] = state;
  });

  var round = [];
  var index = 0;
  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var answered = false;
  var morphTimer = null;
  var nextReady = false;
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function pickDistractors(correct, pool) {
    var others = pool.filter(function (state) {
      return state.id !== correct.id;
    });
    return shuffle(others).slice(0, CHOICES_PER_QUESTION - 1);
  }

  function clearMorphTimer() {
    if (morphTimer) {
      window.clearTimeout(morphTimer);
      morphTimer = null;
    }
  }

  function clearFlySilhouette() {
    if (flySilhouette && flySilhouette.parentNode) {
      flySilhouette.parentNode.removeChild(flySilhouette);
    }
    flySilhouette = null;
  }

  function ensureFlySilhouette() {
    clearFlySilhouette();
    flySilhouette = document.createElement("div");
    flySilhouette.id = "fly-silhouette";
    flySilhouette.className = "fly-silhouette";
    flySilhouette.setAttribute("aria-hidden", "true");
    return flySilhouette;
  }

  function hideNextButton() {
    nextReady = false;
    if (nextWrap) {
      nextWrap.classList.add("hidden");
    }
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.classList.remove("is-ready");
    }
  }

  function showNextButton() {
    if (!nextWrap || !nextBtn) {
      return;
    }
    var label = index >= QUESTIONS_PER_ROUND - 1 ? "See results" : "Next";
    var labelEl = nextBtn.querySelector(".next-btn-label");
    if (labelEl) {
      labelEl.textContent = label;
    } else {
      nextBtn.textContent = label;
    }
    nextWrap.classList.remove("hidden");
    nextBtn.disabled = false;
    nextBtn.classList.remove("is-ready");
    void nextBtn.offsetWidth;
    nextBtn.classList.add("is-ready");
    nextReady = true;
    nextBtn.focus();
  }

  function resetStageCard() {
    if (!stageCard) {
      return;
    }
    clearMorphTimer();
    clearFlySilhouette();
    hideNextButton();
    stageCard.classList.remove(
      "is-flipped",
      "is-correct",
      "is-wrong",
      "is-revealing",
      "is-morphing",
      "is-settled"
    );
    if (answerStage) {
      answerStage.setAttribute("aria-hidden", "true");
    }
    if (questionHead) {
      questionHead.classList.remove("is-dimmed");
    }
    if (choicesEl) {
      choicesEl.classList.remove("is-answered");
    }
  }

  function getPathScreenRect(pathEl) {
    if (!pathEl) {
      return null;
    }
    var rect = pathEl.getBoundingClientRect();
    if (!rect || rect.width < 0.5 || rect.height < 0.5) {
      return null;
    }
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }

  function toLocalRect(containerRect, screenRect) {
    return {
      left: screenRect.left - containerRect.left,
      top: screenRect.top - containerRect.top,
      width: screenRect.width,
      height: screenRect.height,
    };
  }

  function waitForStableTargetRect(done) {
    var tries = 0;
    var last = null;
    var stableFrames = 0;

    function tick() {
      var svg = locatorMap ? locatorMap.querySelector("svg") : null;
      var target = locatorMap ? locatorMap.querySelector(".map-state.is-active") : null;
      var stageRect = stageCard ? stageCard.getBoundingClientRect() : null;
      var mapRect = locatorMap ? locatorMap.getBoundingClientRect() : null;
      var svgRect = svg ? svg.getBoundingClientRect() : null;
      var targetRect = getPathScreenRect(target);

      if (
        stageRect &&
        mapRect &&
        svgRect &&
        mapRect.width > 80 &&
        mapRect.height > 80 &&
        svgRect.width > 80 &&
        svgRect.height > 80 &&
        targetRect
      ) {
        if (
          last &&
          Math.abs(last.left - targetRect.left) < 0.75 &&
          Math.abs(last.top - targetRect.top) < 0.75 &&
          Math.abs(last.width - targetRect.width) < 0.75 &&
          Math.abs(last.height - targetRect.height) < 0.75
        ) {
          stableFrames += 1;
          if (stableFrames >= 2) {
            done(target, targetRect, stageRect);
            return;
          }
        } else {
          stableFrames = 0;
        }
        last = targetRect;
      }

      tries += 1;
      if (tries > 45) {
        done(null, null, null);
        return;
      }
      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  function fillAnswerContent(state, correct, praise) {
    stageBadge.textContent = correct ? "✓" : "✗";
    stageKicker.textContent = correct ? praise : "Answer";
    stageAnswerName.textContent = state.name;
    if (stageRegion) {
      stageRegion.textContent = state.region;
    }
    if (stageCapital) {
      stageCapital.textContent = state.capital;
    }
    if (stageAbbr) {
      stageAbbr.textContent = state.id;
    }
    stageFact.textContent = state.fact;
    renderLocator(state.id);
    answerStage.setAttribute("aria-hidden", "false");
  }

  function animateScoreUp(fromValue, toValue) {
    if (!scoreLabel) {
      return;
    }
    scoreLabel.classList.remove("is-rolling");
    scoreLabel.innerHTML =
      '<span class="score-num score-num--out">' +
      fromValue +
      '</span><span class="score-num score-num--in">' +
      toValue +
      "</span>";
    void scoreLabel.offsetWidth;
    scoreLabel.classList.add("is-rolling");
    if (scoreHud) {
      scoreHud.classList.remove("is-scored");
      void scoreHud.offsetWidth;
      scoreHud.classList.add("is-scored");
    }
    window.setTimeout(function () {
      scoreLabel.classList.remove("is-rolling");
      scoreLabel.textContent = String(toValue);
    }, 450);
  }

  function launchScoreStars(fromEl) {
    if (!fromEl || !scoreHud || reduceMotion) {
      return;
    }
    var from = fromEl.getBoundingClientRect();
    var to = scoreHud.getBoundingClientRect();
    var startX = from.left + from.width / 2;
    var startY = from.top + from.height / 2;
    var endX = to.left + to.width / 2;
    var endY = to.top + to.height / 2;
    var count = 5;

    for (var i = 0; i < count; i += 1) {
      (function (sparkIndex) {
        var star = document.createElement("div");
        star.className = "score-star";
        star.textContent = "★";
        var jitterX = (Math.random() - 0.5) * 36;
        var jitterY = (Math.random() - 0.5) * 24;
        var dx = endX - startX + jitterX;
        var dy = endY - startY + jitterY;
        star.style.left = startX - 8 + "px";
        star.style.top = startY - 8 + "px";
        star.style.setProperty("--dx", dx + "px");
        star.style.setProperty("--dy", dy + "px");
        star.style.animationDelay = sparkIndex * 45 + "ms";
        document.body.appendChild(star);
        window.setTimeout(function () {
          if (star.parentNode) {
            star.parentNode.removeChild(star);
          }
        }, 900 + sparkIndex * 45);
      })(i);
    }
  }

  function spawnCorrectFx(fromEl) {
    if (!fxLayer || !fromEl || reduceMotion) {
      return;
    }
    var rect = fromEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    var check = document.createElement("div");
    check.className = "fx-check";
    check.textContent = "✓";
    check.style.left = cx - 18 + "px";
    check.style.top = cy - 18 + "px";
    fxLayer.appendChild(check);

    for (var i = 0; i < 8; i += 1) {
      var spark = document.createElement("div");
      spark.className = "fx-spark";
      var angle = (Math.PI * 2 * i) / 8;
      var dist = 28 + Math.random() * 22;
      spark.style.left = cx + "px";
      spark.style.top = cy + "px";
      spark.style.setProperty("--sx", Math.cos(angle) * dist + "px");
      spark.style.setProperty("--sy", Math.sin(angle) * dist + "px");
      spark.style.animationDelay = i * 18 + "ms";
      fxLayer.appendChild(spark);
    }

    window.setTimeout(function () {
      fxLayer.innerHTML = "";
    }, 800);
  }

  function celebrateStreak(currentStreak) {
    if (!streakHud) {
      return;
    }
    streakHud.classList.toggle("is-hot", currentStreak >= 3);
    if (currentStreak === 3 || currentStreak === 5 || currentStreak === 8) {
      streakHud.classList.remove("is-milestone");
      void streakHud.offsetWidth;
      streakHud.classList.add("is-milestone");
    }
  }

  function launchConfetti() {
    if (!confettiLayer || reduceMotion) {
      return;
    }
    confettiLayer.innerHTML = "";
    var colors = ["#0d9488", "#14b8a6", "#f59e0b", "#16a34a", "#0f766e", "#fbbf24"];
    for (var i = 0; i < 36; i += 1) {
      var piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = Math.random() * 0.8 + "s";
      piece.style.animationDuration = 1.8 + Math.random() * 1.2 + "s";
      piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      confettiLayer.appendChild(piece);
    }
    window.setTimeout(function () {
      confettiLayer.innerHTML = "";
    }, 3200);
  }

  function buildTightFlySvg(pathEl) {
    var d = pathEl.getAttribute("d") || "";
    var bbox = pathEl.getBBox();
    var pad = Math.max(bbox.width, bbox.height) * 0.04 + 1;
    var vb =
      bbox.x -
      pad +
      " " +
      (bbox.y - pad) +
      " " +
      (bbox.width + pad * 2) +
      " " +
      (bbox.height + pad * 2);
    return (
      '<svg viewBox="' +
      vb +
      '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' +
      d +
      '"></path></svg>'
    );
  }

  function finishReveal() {
    if (!stageCard) {
      return;
    }
    stageCard.classList.add("is-settled");
    clearFlySilhouette();
    showNextButton();
  }

  function morphSilhouetteToMap(correct) {
    var sourceSvg = shapeMount.querySelector("svg");
    var sourcePath = sourceSvg ? sourceSvg.querySelector("path") : null;
    if (!sourceSvg || !sourcePath || !locatorMap) {
      stageCard.classList.add("is-flipped", "is-settled");
      finishReveal();
      return;
    }

    var fromScreen = getPathScreenRect(sourcePath);
    if (!fromScreen || fromScreen.width < 2 || fromScreen.height < 2) {
      stageCard.classList.add("is-flipped", "is-settled");
      finishReveal();
      return;
    }

    stageCard.classList.add("is-revealing", "is-flipped", "is-morphing");

    clearMorphTimer();
    waitForStableTargetRect(function (target, toScreen, stageRect) {
      if (!target || !toScreen || !stageRect) {
        stageCard.classList.remove("is-morphing");
        finishReveal();
        return;
      }

      var freshStageRect = stageCard.getBoundingClientRect();
      var freshTarget = getPathScreenRect(target) || toScreen;
      var fly = ensureFlySilhouette();
      try {
        fly.innerHTML = buildTightFlySvg(sourcePath);
      } catch (err) {
        fly.innerHTML = sourceSvg.outerHTML;
      }
      fly.classList.toggle("is-wrong", !correct);
      stageCard.appendChild(fly);

      var fromLocal = toLocalRect(freshStageRect, fromScreen);
      var toLocal = toLocalRect(freshStageRect, freshTarget);

      fly.style.left = fromLocal.left + "px";
      fly.style.top = fromLocal.top + "px";
      fly.style.width = fromLocal.width + "px";
      fly.style.height = fromLocal.height + "px";
      fly.style.opacity = "1";
      fly.style.transition = "none";

      void fly.offsetWidth;
      fly.style.transition =
        "left " +
        MORPH_MS +
        "ms cubic-bezier(0.22, 1, 0.36, 1), top " +
        MORPH_MS +
        "ms cubic-bezier(0.22, 1, 0.36, 1), width " +
        MORPH_MS +
        "ms cubic-bezier(0.22, 1, 0.36, 1), height " +
        MORPH_MS +
        "ms cubic-bezier(0.22, 1, 0.36, 1), opacity " +
        MORPH_MS +
        "ms ease";
      fly.style.left = toLocal.left + "px";
      fly.style.top = toLocal.top + "px";
      fly.style.width = Math.max(toLocal.width, 6) + "px";
      fly.style.height = Math.max(toLocal.height, 6) + "px";
      fly.style.opacity = "0.2";

      morphTimer = window.setTimeout(function () {
        stageCard.classList.remove("is-morphing");
        finishReveal();
      }, MORPH_MS + 40);
    });
  }

  function revealAnswerOnStage(state, correct, praise) {
    if (!stageCard) {
      return;
    }

    fillAnswerContent(state, correct, praise);
    stageCard.classList.add(correct ? "is-correct" : "is-wrong");

    if (reduceMotion) {
      stageCard.classList.add("is-flipped", "is-settled");
      finishReveal();
      return;
    }

    morphSilhouetteToMap(correct);
  }

  function buildRound() {
    if (states.length < QUESTIONS_PER_ROUND) {
      throw new Error("Not enough state data to build a quiz round.");
    }
    clearMorphTimer();
    round = shuffle(states).slice(0, QUESTIONS_PER_ROUND);
    index = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    answered = false;
  }

  function showScreen(screen) {
    startScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    screen.classList.remove("hidden");
  }

  function bump(el) {
    if (!el) {
      return;
    }
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function setStreakDisplay(value) {
    if (streakNum) {
      streakNum.textContent = String(value);
    } else if (streakLabel) {
      streakLabel.textContent = String(value);
    }
  }

  function updateProgress(options) {
    var opts = options || {};
    var current = Math.min(index + 1, QUESTIONS_PER_ROUND);
    var answeredCount = answered ? current : index;
    var percent = (answeredCount / QUESTIONS_PER_ROUND) * 100;
    progressFill.style.width = percent + "%";
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(answeredCount));
    }
    progressLabel.textContent = current + " / " + QUESTIONS_PER_ROUND;
    if (!opts.skipScoreText && scoreLabel) {
      scoreLabel.textContent = String(score);
    }
    setStreakDisplay(streak);
    if (streakLabel) {
      streakLabel.classList.toggle("is-hot", streak >= 3);
    }
    if (streakHud) {
      streakHud.classList.toggle("is-hot", streak >= 3);
    }
  }

  function renderShape(state) {
    resetStageCard();
    shapeMount.classList.remove("is-entering");
    shapeMount.innerHTML =
      '<svg viewBox="' +
      state.viewBox +
      '" role="img" aria-label="Outline of a U.S. state">' +
      '<path d="' +
      state.path +
      '"></path></svg>';
    void shapeMount.offsetWidth;
    shapeMount.classList.add("is-entering");
  }

  function renderLocator(stateId) {
    if (!usMap) {
      locatorMap.innerHTML =
        '<p style="margin:0;padding:0.5rem;color:#64748b;font-size:0.9rem;">Map unavailable</p>';
      return;
    }

    var parts = usMap.paths
      .map(function (item) {
        var cls = item.id === stateId ? "map-state is-active" : "map-state";
        return (
          '<path class="' +
          cls +
          '" data-id="' +
          item.id +
          '" d="' +
          item.path +
          '"></path>'
        );
      })
      .join("");

    locatorMap.innerHTML =
      '<svg viewBox="' +
      usMap.viewBox +
      '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the United States highlighting ' +
      (stateById[stateId] ? stateById[stateId].name : "the state") +
      '">' +
      parts +
      "</svg>";
  }

  function praiseForStreak(currentStreak) {
    if (currentStreak >= 5) {
      return "On fire!";
    }
    if (currentStreak >= 3) {
      return "Awesome!";
    }
    if (currentStreak === 2) {
      return "Great!";
    }
    return "Nice!";
  }

  function showToast(text, isCorrect) {
    if (!floatToast) {
      return;
    }
    floatToast.textContent = text;
    floatToast.classList.remove("hidden", "show", "correct");
    void floatToast.offsetWidth;
    if (isCorrect) {
      floatToast.classList.add("correct");
    }
    floatToast.classList.add("show");
    window.setTimeout(function () {
      floatToast.classList.add("hidden");
      floatToast.classList.remove("show");
    }, 900);
  }

  function setChoiceStatus(btn, text) {
    var status = btn.querySelector(".choice-status");
    if (status) {
      status.textContent = text;
    }
  }

  function clearFeedback() {
    if (locatorMap) {
      locatorMap.innerHTML = "";
    }
    if (stageAnswerName) {
      stageAnswerName.textContent = "";
    }
    if (stageRegion) {
      stageRegion.textContent = "";
    }
    if (stageCapital) {
      stageCapital.textContent = "";
    }
    if (stageAbbr) {
      stageAbbr.textContent = "";
    }
    if (stageFact) {
      stageFact.textContent = "";
    }
    if (stageKicker) {
      stageKicker.textContent = "";
    }
    if (stageBadge) {
      stageBadge.textContent = "";
    }
    if (fxLayer) {
      fxLayer.innerHTML = "";
    }
    resetStageCard();
  }

  function restartEnterAnimation() {
    quizPanel.classList.remove("is-entering");
    void quizPanel.offsetWidth;
    quizPanel.classList.add("is-entering");
  }

  function renderQuestion() {
    var current = round[index];
    var options = shuffle(pickDistractors(current, states).concat(current));
    var hasCorrect = options.some(function (opt) {
      return opt.id === current.id;
    });
    var uniqueIds = {};
    var duplicates = false;

    options.forEach(function (opt) {
      if (uniqueIds[opt.id]) {
        duplicates = true;
      }
      uniqueIds[opt.id] = true;
    });

    if (!hasCorrect || duplicates || options.length !== CHOICES_PER_QUESTION) {
      throw new Error("Invalid choice set generated for " + current.name);
    }

    answered = false;
    clearFeedback();
    restartEnterAnimation();
    renderShape(current);
    updateProgress();

    choicesEl.innerHTML = "";
    options.forEach(function (option) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.dataset.id = option.id;
      btn.setAttribute("aria-label", option.name);
      btn.innerHTML =
        '<span class="choice-name">' +
        option.name +
        '</span><span class="choice-status" aria-hidden="true"></span>';
      btn.addEventListener("click", function () {
        handleAnswer(option.id, btn);
      });
      choicesEl.appendChild(btn);
    });
  }

  function handleAnswer(selectedId, selectedBtn) {
    if (answered) {
      return;
    }
    answered = true;
    var current = round[index];
    var correct = selectedId === current.id;
    var praise = "Nice!";
    var previousScore = score;
    var correctBtn = null;

    var buttons = choicesEl.querySelectorAll(".choice-btn");
    buttons.forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.id === current.id) {
        btn.classList.add("is-correct");
        correctBtn = btn;
        setChoiceStatus(btn, "✓ Correct");
        btn.setAttribute("aria-label", btn.querySelector(".choice-name").textContent + ", correct answer");
      } else if (btn === selectedBtn && !correct) {
        btn.classList.add("is-wrong", "is-picked");
        setChoiceStatus(btn, "✗ Your pick");
        btn.setAttribute(
          "aria-label",
          btn.querySelector(".choice-name").textContent + ", your incorrect answer"
        );
      } else {
        btn.classList.add("is-muted");
      }
    });

    if (correct && selectedBtn) {
      selectedBtn.classList.add("is-picked", "is-glow");
      setChoiceStatus(selectedBtn, "✓ Correct");
    }

    if (correct) {
      score += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      bump(streakLabel);
      celebrateStreak(streak);
      praise = praiseForStreak(streak);
      showToast(praise, true);
      spawnCorrectFx(correctBtn || selectedBtn);
      launchScoreStars(correctBtn || selectedBtn);
      window.setTimeout(function () {
        animateScoreUp(previousScore, score);
      }, 420);
      updateProgress({ skipScoreText: true });
    } else {
      streak = 0;
      if (streakHud) {
        streakHud.classList.remove("is-hot", "is-milestone");
      }
      showToast("Keep going", false);
      updateProgress();
    }

    choicesEl.classList.add("is-answered");
    if (questionHead) {
      questionHead.classList.add("is-dimmed");
    }

    revealAnswerOnStage(current, correct, praise);
  }

  function showResults() {
    clearMorphTimer();
    clearFlySilhouette();
    hideNextButton();
    var accuracy = Math.round((score / QUESTIONS_PER_ROUND) * 100);
    var badge;
    var message;

    if (score >= 9) {
      badge = "Geography ace";
      message = "Outstanding! Those silhouettes are sticking.";
    } else if (score >= 7) {
      badge = "Strong round";
      message = "Great job! One more round and you'll climb higher.";
    } else if (score >= 4) {
      badge = "Building momentum";
      message = "Nice start. The map hints will help next time.";
    } else {
      badge = "Keep exploring";
      message = "Every round builds memory. Jump back in!";
    }

    resultBadge.textContent = badge;
    resultScore.textContent = score + " / " + QUESTIONS_PER_ROUND;
    resultMessage.textContent = message;
    scoreRing.style.setProperty("--score-angle", score * 10 + "%");
    statCorrect.textContent = String(score);
    statStreak.textContent = String(bestStreak);
    statAccuracy.textContent = accuracy + "%";

    shareText.value =
      "I scored " +
      score +
      "/" +
      QUESTIONS_PER_ROUND +
      " on the USA State Shape Quiz (best streak: " +
      bestStreak +
      ")! Can you beat me?";

    showScreen(resultScreen);
    if (score >= 7) {
      launchConfetti();
    }
  }

  function startQuiz() {
    buildRound();
    if (confettiLayer) {
      confettiLayer.innerHTML = "";
    }
    showScreen(quizScreen);
    renderQuestion();
  }

  function goNext() {
    if (!answered || !nextReady) {
      return;
    }
    clearMorphTimer();
    if (index >= QUESTIONS_PER_ROUND - 1) {
      showResults();
      return;
    }
    index += 1;
    renderQuestion();
  }

  async function shareScore() {
    var text = shareText.value.trim();
    if (!text) {
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "USA State Shape Quiz",
          text: text,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") {
          return;
        }
      }
    }
    await copyScore();
  }

  async function copyScore() {
    var text = shareText.value.trim();
    if (!text) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text + " " + window.location.href);
      } else {
        shareText.focus();
        shareText.select();
        document.execCommand("copy");
      }
      copyBtn.textContent = "Copied!";
      window.setTimeout(function () {
        copyBtn.textContent = "Copy text";
      }, 1600);
    } catch (err) {
      copyBtn.textContent = "Select & copy";
    }
  }

  function init() {
    if (states.length !== 50) {
      startBtn.disabled = true;
      startBtn.textContent = "State data failed to load";
      console.error("Expected 50 states, found", states.length);
      return;
    }
    if (!usMap || usMap.paths.length !== 50) {
      console.warn("US_MAP missing or incomplete; locator map may be unavailable.");
    }

    startBtn.addEventListener("click", startQuiz);
    nextBtn.addEventListener("click", goNext);
    retryBtn.addEventListener("click", startQuiz);
    shareBtn.addEventListener("click", function () {
      shareScore();
    });
    copyBtn.addEventListener("click", function () {
      copyScore();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
