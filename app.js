// 영어 단어 암기 학습 웹앱 (Gemini AI 자동 연동)
// app.js

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "my_custom_vocab_words";
  const API_KEY_STORAGE = "gemini_user_api_key";

  // State
  let wordList = [];
  let quizQuestions = [];
  let currentIndex = 0;
  let timerInterval = null;
  let secondsElapsed = 0;
  let reviewFilteredList = [];
  let currentReviewIndex = 0;

  // DOM Elements - Screens
  const startView = document.getElementById("start-view");
  const quizView = document.getElementById("quiz-view");
  const resultView = document.getElementById("result-view");
  const brandHome = document.getElementById("brand-home");

  // DOM Elements - Start Screen
  const registeredWordCount = document.getElementById("registered-word-count");
  const formAddWord = document.getElementById("form-add-word");
  const inputWord = document.getElementById("input-word");
  const btnAiGenerate = document.getElementById("btn-ai-generate");
  const searchStatusMsg = document.getElementById("search-status-msg");
  const inputMeaning = document.getElementById("input-meaning");
  const inputExampleEn = document.getElementById("input-example-en");
  const inputExampleKo = document.getElementById("input-example-ko");
  const testStartDesc = document.getElementById("test-start-desc");
  const btnStartTest = document.getElementById("btn-start-test");
  const listBadgeCount = document.getElementById("list-badge-count");
  const emptyListMsg = document.getElementById("empty-list-msg");
  const wordTableContainer = document.getElementById("word-table-container");
  const wordTableBody = document.getElementById("word-table-body");

  // DOM Elements - API Key Settings
  const btnToggleApiKey = document.getElementById("btn-toggle-api-key");
  const apiKeyBox = document.getElementById("api-key-box");
  const inputCustomApiKey = document.getElementById("input-custom-api-key");
  const btnSaveApiKey = document.getElementById("btn-save-api-key");

  // DOM Elements - Quiz Screen
  const currentQIndex = document.getElementById("current-q-index");
  const totalQCount = document.getElementById("total-q-count");
  const quizTimer = document.getElementById("quiz-timer");
  const btnQuitQuiz = document.getElementById("btn-quit-quiz");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const questionBadge = document.getElementById("question-badge");
  const questionWord = document.getElementById("question-word");
  const choicesContainer = document.getElementById("choices-container");
  const btnPrevQ = document.getElementById("btn-prev-q");
  const btnNextQ = document.getElementById("btn-next-q");
  const btnFinishQuiz = document.getElementById("btn-finish-quiz");

  // DOM Elements - Result Screen
  const resultScorePercent = document.getElementById("result-score-percent");
  const resultScoreFraction = document.getElementById("result-score-fraction");
  const statCorrect = document.getElementById("stat-correct");
  const statWrong = document.getElementById("stat-wrong");
  const statUnanswered = document.getElementById("stat-unanswered");
  const statTime = document.getElementById("stat-time");
  const btnRetryWrong = document.getElementById("btn-retry-wrong");
  const btnBackHome = document.getElementById("btn-back-home");
  const wrongCountBadge = document.getElementById("wrong-count-badge");
  const wrongListContainer = document.getElementById("wrong-list-container");

  // DOM Elements - Review Modal
  const reviewModal = document.getElementById("review-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const modalQBadge = document.getElementById("modal-q-badge");
  const modalWord = document.getElementById("modal-word");
  const modalChoicesBox = document.getElementById("modal-choices-box");
  const modalCorrectAnswer = document.getElementById("modal-correct-answer");
  const modalExampleEn = document.getElementById("modal-example-en");
  const modalExampleKo = document.getElementById("modal-example-ko");
  const btnModalPrev = document.getElementById("btn-modal-prev");
  const btnModalNext = document.getElementById("btn-modal-next");
  const modalStepCounter = document.getElementById("modal-step-counter");

  // --- Helper: Shuffle Array ---
  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // --- Helper: Format Time ---
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // --- LocalStorage Management ---
  function loadWords() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      wordList = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load words from localStorage:", e);
      wordList = [];
    }
    updateStartScreenUI();
  }

  function saveWords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wordList));
    } catch (e) {
      console.error("Failed to save words to localStorage:", e);
    }
    updateStartScreenUI();
  }

  // API Key Settings (입력 즉시 trim 및 localStorage 실시간 저장)
  function initApiKeySettings() {
    const savedKey = (localStorage.getItem(API_KEY_STORAGE) || "").trim();
    if (savedKey) {
      inputCustomApiKey.value = savedKey;
    }

    // 입력창 토글
    btnToggleApiKey.addEventListener("click", () => {
      const isHidden = apiKeyBox.style.display === "none";
      apiKeyBox.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        inputCustomApiKey.focus();
      }
    });

    // 입력/붙여넣기 즉시 trim 및 localStorage에 실시간 자동 저장
    inputCustomApiKey.addEventListener("input", () => {
      const trimmedKey = inputCustomApiKey.value.trim();
      if (trimmedKey) {
        localStorage.setItem(API_KEY_STORAGE, trimmedKey);
      } else {
        localStorage.removeItem(API_KEY_STORAGE);
      }
    });

    // 저장 버튼 클릭 시
    btnSaveApiKey.addEventListener("click", () => {
      const trimmedKey = inputCustomApiKey.value.trim();
      inputCustomApiKey.value = trimmedKey;

      if (trimmedKey) {
        localStorage.setItem(API_KEY_STORAGE, trimmedKey);
        alert(`Gemini API 키가 저장되었습니다.\n(앞 8자리: ${trimmedKey.substring(0, 8)}...)`);
      } else {
        localStorage.removeItem(API_KEY_STORAGE);
        alert("API 키가 삭제되었습니다. 기본 Puter.js 모드로 동작합니다.");
      }
      apiKeyBox.style.display = "none";
    });
  }

  // --- Update Start Screen UI ---
  function updateStartScreenUI() {
    const count = wordList.length;
    registeredWordCount.textContent = count;
    listBadgeCount.textContent = `${count}개`;

    // 3개 이상일 때만 시험 시작 가능
    if (count >= 3) {
      btnStartTest.disabled = false;
      testStartDesc.textContent = `등록된 ${count}개의 단어로 3지선다 객관식 시험을 시작합니다.`;
    } else {
      btnStartTest.disabled = true;
      testStartDesc.textContent = "시험을 시작하려면 최소 3개 이상의 단어를 추가해주세요.";
    }

    renderWordTable();
  }

  // --- Render Word Table ---
  function renderWordTable() {
    if (wordList.length === 0) {
      emptyListMsg.style.display = "block";
      wordTableContainer.style.display = "none";
      wordTableBody.innerHTML = "";
      return;
    }

    emptyListMsg.style.display = "none";
    wordTableContainer.style.display = "block";
    wordTableBody.innerHTML = "";

    wordList.forEach((item, index) => {
      const tr = document.createElement("tr");

      const hasExample = item.exampleEn || item.exampleKo;
      const exampleHtml = hasExample
        ? `<div class="table-example-cell">
             ${item.exampleEn ? `<div>${item.exampleEn}</div>` : ""}
             ${item.exampleKo ? `<em>${item.exampleKo}</em>` : ""}
           </div>`
        : `<span style="color: #94a3b8; font-size: 0.82rem;">-</span>`;

      tr.innerHTML = `
        <td style="color: #64748b; font-weight: 700;">${index + 1}</td>
        <td class="table-word-cell">${item.word}</td>
        <td style="font-size: 0.88rem; line-height: 1.45;">${item.meaning}</td>
        <td>${exampleHtml}</td>
        <td style="text-align: center;">
          <button class="btn-danger-sm btn-delete-word" data-id="${item.id}" title="단어 삭제">삭제</button>
        </td>
      `;

      tr.querySelector(".btn-delete-word").addEventListener("click", () => {
        deleteWord(item.id, item.word);
      });

      wordTableBody.appendChild(tr);
    });
  }

  function deleteWord(id, wordText) {
    if (confirm(`'${wordText}' 단어를 삭제하시겠습니까?`)) {
      wordList = wordList.filter(item => item.id !== id);
      saveWords();
    }
  }

  // --- 1. Google Gemini REST API 직접 호출 (Puter.js를 일절 거치지 않고 직접 통신) ---
  async function callGoogleGeminiRestApi(word, apiKey) {
    const cleanWord = word.trim();
    const prompt = `You are an expert English-Korean lexicographer and vocabulary teacher.
Analyze the following English word or idiom: "${cleanWord}"

Please provide:
1. "meaning": List ALL major Korean meanings of this word across all relevant parts of speech (verb, noun, adjective, etc.) thoroughly and completely. Format with numbering, e.g. "1. 옮기다, 바꾸다 2. 바뀌다, 달라지다 3. 변화, 변경 4. 교대 근무".
2. "exampleEn": 1 natural, high-quality practical English example sentence using this word.
3. "exampleKo": Natural and accurate Korean translation of the English example sentence.

Respond ONLY with a valid JSON object in the exact format below, with NO markdown backticks, NO code block markers, and NO additional text:
{
  "meaning": "1. 옮기다, 바꾸다 2. 바뀌다, 달라지다 3. 변화, 변경 4. 교대 근무",
  "exampleEn": "The company decided to shift its focus toward renewable energy.",
  "exampleKo": "회사는 재생 에너지 쪽으로 초점을 옮기기로 결정했습니다."
}`;

    const primaryModel = "gemini-2.5-flash";
    const fallbackModel = "gemini-1.5-flash";

    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2
      }
    };

    let res;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
    } catch (networkErr) {
      throw new Error(`[네트워크 연결 오류] Google API 서버에 접속할 수 없습니다: ${networkErr.message}`);
    }

    // 만약 404 모델 미지원인 경우 gemini-1.5-flash로 자동 2차 시도
    if (res.status === 404) {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
      } catch (fallbackErr) {
        throw new Error(`[네트워크 오류] ${fallbackErr.message}`);
      }
    }

    // API 호출 실패 시 구체적인 HTTP 상태 코드 및 오류 메시지 파싱
    if (!res.ok) {
      let errorDetail = `[HTTP ${res.status}]`;
      try {
        const errData = await res.json();
        if (errData?.error?.message) {
          errorDetail = `[HTTP ${res.status}] ${errData.error.message}`;
          if (errData.error.status) {
            errorDetail += ` (${errData.error.status})`;
          }
        }
      } catch (_) {
        try {
          const errText = await res.text();
          if (errText) errorDetail = `[HTTP ${res.status}] ${errText.substring(0, 150)}`;
        } catch (_) {}
      }
      throw new Error(errorDetail);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseAiJsonResponse(rawText);
  }

  // --- 2. Puter.js 무료 브라우저 AI 호출 (API Key가 없을 때만 진입) ---
  async function callPuterAi(word) {
    // file:/// 프로토콜에서는 Puter.js가 origin 에러를 일으키므로 사전 차단 및 안내
    if (window.location.protocol === "file:") {
      throw new Error("Puter.js는 브라우저 보안 정책상 file:/// 프로토콜에서 동작하지 않습니다. 로컬 웹 서버(http://localhost:8080)로 접속하시거나, '⚙️ API 키 설정'에서 본인의 Google Gemini API 키를 입력해주세요.");
    }

    if (typeof puter === "undefined" || !puter.ai || typeof puter.ai.chat !== "function") {
      throw new Error("Puter.js 라이브러리를 불러오지 못했습니다. '⚙️ API 키 설정'에서 본인의 Google Gemini API 키를 입력해주세요.");
    }

    const cleanWord = word.trim();
    const prompt = `You are an expert English-Korean lexicographer.
Analyze the English word: "${cleanWord}"
Respond strictly with a JSON object containing keys "meaning" (all major Korean meanings numbered), "exampleEn" (1 English sentence), and "exampleKo" (Korean translation).`;

    let response;
    try {
      response = await puter.ai.chat(prompt, { model: "gemini-2.5-flash" });
    } catch (modelErr) {
      console.warn("gemini-2.5-flash fallback to gemini-1.5-flash on Puter.js:", modelErr);
      try {
        response = await puter.ai.chat(prompt, { model: "gemini-1.5-flash" });
      } catch (subErr) {
        throw new Error(`[Puter.js AI Error] ${subErr?.message || modelErr?.message || "AI 호출 실패"}`);
      }
    }

    let rawContent = "";
    if (typeof response === "string") {
      rawContent = response;
    } else if (response && response.message && response.message.content) {
      rawContent = response.message.content;
    } else if (response && typeof response.toString === "function") {
      rawContent = response.toString();
    }

    return parseAiJsonResponse(rawContent);
  }

  // --- 메인 Gemini AI 호출 분기 ---
  async function callGeminiAi(word) {
    const rawKey = localStorage.getItem(API_KEY_STORAGE) || inputCustomApiKey?.value || "";
    const userApiKey = rawKey.trim();

    // ★ 요구사항: Google Gemini API 키를 입력해 둔 경우 Puter.js를 전혀 거치지 않고 즉시 REST API 직접 호출
    if (userApiKey) {
      return await callGoogleGeminiRestApi(word, userApiKey);
    }

    // API 키가 없을 때만 Puter.js 무료 AI 호출
    return await callPuterAi(word);
  }

  // --- AI JSON 응답 파싱 및 안전한 폴백 ---
  function parseAiJsonResponse(rawText) {
    if (!rawText) throw new Error("AI 응답 내용이 비어있습니다.");

    // 마크다운 코드 블록(```json ... ```) 제거
    let cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.meaning) {
        return {
          meaning: parsed.meaning.trim(),
          exampleEn: (parsed.exampleEn || "").trim(),
          exampleKo: (parsed.exampleKo || "").trim()
        };
      }
    } catch (e) {
      console.warn("JSON parse failed, attempting regex extraction...", e);
    }

    // JSON 파싱 실패 시 정규식 추출 폴백
    const meaningMatch = cleaned.match(/"meaning"\s*:\s*"([^"]+)"/i);
    const exampleEnMatch = cleaned.match(/"exampleEn"\s*:\s*"([^"]+)"/i);
    const exampleKoMatch = cleaned.match(/"exampleKo"\s*:\s*"([^"]+)"/i);

    if (meaningMatch && meaningMatch[1]) {
      return {
        meaning: meaningMatch[1].trim(),
        exampleEn: exampleEnMatch ? exampleEnMatch[1].trim() : "",
        exampleKo: exampleKoMatch ? exampleKoMatch[1].trim() : ""
      };
    }

    throw new Error("AI 응답에서 뜻과 예문을 파싱하지 못했습니다.");
  }

  // --- [제미나이로 뜻·예문 자동 완성] 핸들러 ---
  async function handleAiGenerate() {
    const rawWord = inputWord.value.trim();
    if (!rawWord) {
      showSearchStatus("영단어를 먼저 입력해주세요.", "error");
      inputWord.focus();
      return;
    }

    showSearchStatus("✨ 제미나이(Gemini)가 단어의 모든 뜻과 예문을 생성하고 있습니다...", "loading");
    btnAiGenerate.disabled = true;

    try {
      const result = await callGeminiAi(rawWord);

      if (result.meaning) {
        inputMeaning.value = result.meaning;
      }
      if (result.exampleEn) {
        inputExampleEn.value = result.exampleEn;
      }
      if (result.exampleKo) {
        inputExampleKo.value = result.exampleKo;
      }

      showSearchStatus("✅ 제미나이가 모든 뜻과 예문(해석)을 자동 입력했습니다. 필요 시 직접 수정할 수 있습니다.", "success");

    } catch (err) {
      console.error("Gemini AI error:", err);
      const errorMsg = err?.message || "알 수 없는 오류가 발생했습니다.";
      showSearchStatus(`❌ Gemini API 오류: ${errorMsg}`, "error");
      alert(`⚠️ Gemini API 호출 실패\n\n원인: ${errorMsg}\n\n입력한 API 키가 올바른지, 사용량 제한(쿼터)에 걸리지 않았는지 확인해주세요.\n(직접 뜻과 예문을 입력하여 단어를 등록할 수도 있습니다.)`);
    } finally {
      btnAiGenerate.disabled = false;
    }
  }

  function showSearchStatus(msg, type) {
    searchStatusMsg.textContent = msg;
    searchStatusMsg.className = `status-msg ${type}`;
  }

  btnAiGenerate.addEventListener("click", handleAiGenerate);

  // --- Add Word Form Submit ---
  formAddWord.addEventListener("submit", (e) => {
    e.preventDefault();

    const word = inputWord.value.trim();
    const meaning = inputMeaning.value.trim();
    const exampleEn = inputExampleEn.value.trim();
    const exampleKo = inputExampleKo.value.trim();

    if (!word || !meaning) {
      alert("영단어와 우리말 뜻을 모두 입력해주세요.");
      return;
    }

    // 중복 검사
    const isDup = wordList.some(item => item.word.toLowerCase() === word.toLowerCase());
    if (isDup) {
      alert(`'${word}' 단어는 이미 등록되어 있습니다.`);
      inputWord.focus();
      return;
    }

    const newWord = {
      id: "w_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      word: word,
      meaning: meaning,
      exampleEn: exampleEn,
      exampleKo: exampleKo,
      createdAt: Date.now()
    };

    wordList.push(newWord);
    saveWords();

    // 폼 초기화
    inputWord.value = "";
    inputMeaning.value = "";
    inputExampleEn.value = "";
    inputExampleKo.value = "";
    searchStatusMsg.className = "status-msg";
    searchStatusMsg.textContent = "";

    inputWord.focus();
  });

  // --- Quiz Session (3지선다 출제 규칙) ---
  function startQuiz(sourceList) {
    if (!sourceList || sourceList.length < 3) {
      alert("시험을 시작하려면 최소 3개 이상의 단어가 필요합니다.");
      return;
    }

    // 등록된 모든 단어들의 뜻 목록 (오답 후보 풀)
    const allMeanings = wordList.map(item => item.meaning.trim());

    quizQuestions = sourceList.map((item, idx) => {
      const correct = item.meaning.trim();

      // 해당 단어의 정답과 다른 뜻들을 오답 후보로 추출
      const candidates = allMeanings.filter(m => m !== correct);
      const uniqueCandidates = Array.from(new Set(candidates));
      const shuffledCandidates = shuffle(uniqueCandidates);

      const distractor1 = shuffledCandidates[0] || "오답 1";
      const distractor2 = shuffledCandidates[1] || "오답 2";

      // 3개 선택지 (정답 1개 + 오답 2개) 무작위 셔플
      const choices = shuffle([correct, distractor1, distractor2]);

      return {
        id: item.id,
        displayNo: idx + 1,
        word: item.word,
        correctAnswer: correct,
        exampleEn: item.exampleEn,
        exampleKo: item.exampleKo,
        choices: choices,
        userChoice: null
      };
    });

    quizQuestions = shuffle(quizQuestions);
    currentIndex = 0;
    secondsElapsed = 0;

    startTimer();
    showScreen("quiz");
    renderCurrentQuestion();
  }

  // --- Timer ---
  function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    quizTimer.textContent = "00:00";
    timerInterval = setInterval(() => {
      secondsElapsed++;
      quizTimer.textContent = formatTime(secondsElapsed);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // --- View Switcher ---
  function showScreen(screen) {
    startView.style.display = "none";
    quizView.style.display = "none";
    resultView.style.display = "none";

    if (screen === "start") {
      startView.style.display = "flex";
      stopTimer();
      updateStartScreenUI();
    } else if (screen === "quiz") {
      quizView.style.display = "flex";
    } else if (screen === "result") {
      resultView.style.display = "flex";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Render Question in Quiz ---
  function renderCurrentQuestion() {
    const total = quizQuestions.length;
    const q = quizQuestions[currentIndex];

    currentQIndex.textContent = currentIndex + 1;
    totalQCount.textContent = total;

    const progressPercent = Math.round(((currentIndex + 1) / total) * 100);
    progressBarFill.style.width = `${progressPercent}%`;

    questionBadge.textContent = `No. ${currentIndex + 1}`;
    questionWord.textContent = q.word;

    // 3 Choices
    choicesContainer.innerHTML = "";
    const markers = ["1", "2", "3"];

    q.choices.forEach((choiceText, idx) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      if (q.userChoice === choiceText) {
        btn.classList.add("selected");
      }

      btn.innerHTML = `
        <span class="choice-marker">${markers[idx]}</span>
        <span class="choice-text">${choiceText}</span>
      `;

      btn.addEventListener("click", () => {
        selectChoice(choiceText);
      });

      choicesContainer.appendChild(btn);
    });

    btnPrevQ.disabled = currentIndex === 0;
    btnPrevQ.style.opacity = currentIndex === 0 ? "0.5" : "1";
    btnPrevQ.style.cursor = currentIndex === 0 ? "not-allowed" : "pointer";

    if (currentIndex === total - 1) {
      btnNextQ.innerHTML = "제출 확인 ▶";
    } else {
      btnNextQ.innerHTML = "다음 문제 ▶";
    }
  }

  function selectChoice(choiceText) {
    const q = quizQuestions[currentIndex];
    q.userChoice = choiceText;

    const buttons = choicesContainer.querySelectorAll(".choice-btn");
    buttons.forEach(btn => {
      const textSpan = btn.querySelector(".choice-text");
      if (textSpan && textSpan.textContent.trim() === choiceText.trim()) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  btnPrevQ.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentQuestion();
    }
  });

  btnNextQ.addEventListener("click", () => {
    if (currentIndex < quizQuestions.length - 1) {
      currentIndex++;
      renderCurrentQuestion();
    } else {
      finishQuiz();
    }
  });

  btnFinishQuiz.addEventListener("click", finishQuiz);

  btnQuitQuiz.addEventListener("click", () => {
    if (confirm("시험을 중단하고 첫 화면으로 돌아가시겠습니까?")) {
      showScreen("start");
    }
  });

  brandHome.addEventListener("click", () => {
    if (quizView.style.display === "flex") {
      if (confirm("시험을 중단하고 첫 화면으로 돌아가시겠습니까?")) {
        showScreen("start");
      }
    } else {
      showScreen("start");
    }
  });

  // Keyboard Shortcuts (1, 2, 3, ArrowLeft, ArrowRight)
  window.addEventListener("keydown", (e) => {
    if (quizView.style.display === "flex" && !reviewModal.classList.contains("open")) {
      if (e.key === "1" || e.key === "2" || e.key === "3") {
        const choiceIdx = parseInt(e.key, 10) - 1;
        const q = quizQuestions[currentIndex];
        if (q && q.choices[choiceIdx]) {
          selectChoice(q.choices[choiceIdx]);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          currentIndex--;
          renderCurrentQuestion();
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < quizQuestions.length - 1) {
          currentIndex++;
          renderCurrentQuestion();
        }
      }
    } else if (reviewModal.classList.contains("open")) {
      if (e.key === "ArrowLeft") {
        navigateReviewModal(-1);
      } else if (e.key === "ArrowRight") {
        navigateReviewModal(1);
      } else if (e.key === "Escape") {
        closeReviewModal();
      }
    }
  });

  // --- Finish Quiz & Show Results ---
  function finishQuiz() {
    const unanswered = quizQuestions.filter(q => q.userChoice === null);
    if (unanswered.length > 0) {
      const confirmSubmit = confirm(
        `아직 풀지 않은 문제가 ${unanswered.length}개 남아있습니다.\n시험을 종료하고 점수를 확인하시겠습니까?`
      );
      if (!confirmSubmit) return;
    }

    stopTimer();
    renderResults();
    showScreen("result");
  }

  function renderResults() {
    const total = quizQuestions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const wrongQuestions = [];

    quizQuestions.forEach(q => {
      if (q.userChoice === null) {
        unansweredCount++;
        wrongQuestions.push(q);
      } else if (q.userChoice.trim() === q.correctAnswer.trim()) {
        correctCount++;
      } else {
        wrongCount++;
        wrongQuestions.push(q);
      }
    });

    const percent = Math.round((correctCount / total) * 100);

    resultScorePercent.textContent = `${percent}점`;
    resultScoreFraction.textContent = `${correctCount} / ${total} 정답`;
    statCorrect.textContent = `${correctCount}개`;
    statWrong.textContent = `${wrongCount}개`;
    statUnanswered.textContent = `${unansweredCount}개`;
    statTime.textContent = formatTime(secondsElapsed);

    reviewFilteredList = wrongQuestions;
    wrongCountBadge.textContent = wrongQuestions.length;

    renderWrongList(wrongQuestions);
  }

  function renderWrongList(wrongQuestions) {
    wrongListContainer.innerHTML = "";

    if (wrongQuestions.length === 0) {
      wrongListContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--success); font-weight: 700;">
          🎉 축하합니다! 모든 문제를 맞혔습니다. 오답이 없습니다!
        </div>
      `;
      btnRetryWrong.style.display = "none";
      return;
    }

    btnRetryWrong.style.display = "inline-flex";

    wrongQuestions.forEach((q, idx) => {
      const card = document.createElement("div");
      card.className = "wrong-item-card";

      const userChoiceText = q.userChoice ? `선택: ${q.userChoice}` : "미응답";

      card.innerHTML = `
        <div class="wrong-item-left">
          <span style="font-weight: 700; color: #64748b; font-size: 0.85rem;">No. ${idx + 1}</span>
          <span class="wrong-item-word">${q.word}</span>
        </div>
        <div class="wrong-item-ans">
          <span class="user-ans-text">${userChoiceText}</span>
          <span class="correct-ans-text">정답: ${q.correctAnswer}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        openReviewModal(idx);
      });

      wrongListContainer.appendChild(card);
    });
  }

  // --- Single Question Review Modal (1:1 확인) ---
  function openReviewModal(index) {
    if (!reviewFilteredList || reviewFilteredList.length === 0) return;
    currentReviewIndex = Math.max(0, Math.min(index, reviewFilteredList.length - 1));
    renderReviewModalItem();
    reviewModal.classList.add("open");
  }

  function closeReviewModal() {
    reviewModal.classList.remove("open");
  }

  function renderReviewModalItem() {
    const q = reviewFilteredList[currentReviewIndex];
    if (!q) return;

    const total = reviewFilteredList.length;
    modalStepCounter.textContent = `${currentReviewIndex + 1} / ${total}`;
    modalQBadge.textContent = `No. ${currentReviewIndex + 1}`;
    modalWord.textContent = q.word;

    // 3 Choices
    modalChoicesBox.innerHTML = "";
    q.choices.forEach(choiceText => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "modal-choice-item";

      const isCorrect = choiceText.trim() === q.correctAnswer.trim();
      const isUserSelected = q.userChoice !== null && choiceText.trim() === q.userChoice.trim();

      if (isCorrect) {
        itemDiv.classList.add("is-correct");
        itemDiv.innerHTML = `<span>${choiceText}</span><span>✓ 정답</span>`;
      } else if (isUserSelected) {
        itemDiv.classList.add("is-user-wrong");
        itemDiv.innerHTML = `<span>${choiceText}</span><span>✗ 내가 고른 답</span>`;
      } else {
        itemDiv.innerHTML = `<span>${choiceText}</span>`;
      }

      modalChoicesBox.appendChild(itemDiv);
    });

    modalCorrectAnswer.textContent = q.correctAnswer;

    // 예문 표시
    if (q.exampleEn || q.exampleKo) {
      modalExampleEn.textContent = q.exampleEn || "영어 예문 없음";
      modalExampleKo.textContent = q.exampleKo || "한국어 해석 없음";
    } else {
      modalExampleEn.textContent = "등록된 예문이 없습니다.";
      modalExampleKo.textContent = "단어 추가 시 제미나이를 통해 예문을 생성할 수 있습니다.";
    }

    btnModalPrev.disabled = currentReviewIndex === 0;
    btnModalPrev.style.opacity = currentReviewIndex === 0 ? "0.4" : "1";
    btnModalPrev.style.cursor = currentReviewIndex === 0 ? "not-allowed" : "pointer";

    btnModalNext.disabled = currentReviewIndex === total - 1;
    btnModalNext.style.opacity = currentReviewIndex === total - 1 ? "0.4" : "1";
    btnModalNext.style.cursor = currentReviewIndex === total - 1 ? "not-allowed" : "pointer";
  }

  function navigateReviewModal(dir) {
    const nextIdx = currentReviewIndex + dir;
    if (nextIdx >= 0 && nextIdx < reviewFilteredList.length) {
      currentReviewIndex = nextIdx;
      renderReviewModalItem();
    }
  }

  btnModalPrev.addEventListener("click", () => navigateReviewModal(-1));
  btnModalNext.addEventListener("click", () => navigateReviewModal(1));
  btnCloseModal.addEventListener("click", closeReviewModal);

  reviewModal.addEventListener("click", (e) => {
    if (e.target === reviewModal) {
      closeReviewModal();
    }
  });

  // --- Result Actions ---
  btnRetryWrong.addEventListener("click", () => {
    if (reviewFilteredList.length < 3) {
      alert("3지선다 출제를 위해서는 최소 3개 이상의 단어가 필요합니다. 전체 단어 시험을 이용해주세요.");
      return;
    }
    const wrongIds = new Set(reviewFilteredList.map(q => q.id));
    const wrongSources = wordList.filter(item => wrongIds.has(item.id));
    startQuiz(wrongSources);
  });

  btnBackHome.addEventListener("click", () => {
    showScreen("start");
  });

  btnStartTest.addEventListener("click", () => {
    startQuiz(wordList);
  });

  // Initialize
  initApiKeySettings();
  loadWords();
});
