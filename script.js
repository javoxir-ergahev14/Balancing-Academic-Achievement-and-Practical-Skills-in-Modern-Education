
const introView = document.querySelector("#introView");
const dashboardGate = document.querySelector("#dashboardGate");
const teacherView = document.querySelector("#teacherView");
const leaderboardView = document.querySelector("#leaderboardView");
const lessonHeader = document.querySelector("#lessonHeader");
const lessonMain = document.querySelector("#lessonMain");
const learnerName = document.querySelector("#learnerName");
const nameError = document.querySelector("#nameError");
const learnerWelcome = document.querySelector("#welcomeLearner");
const dashboardCode = document.querySelector("#dashboardCode");
const codeError = document.querySelector("#codeError");
const dashboardSubmit = document.querySelector("#dashboardForm button[type='submit']");
const leaderboardRows = document.querySelector("#leaderboardRows");
const teacherLearnerRows = document.querySelector("#teacherLearnerRows");
const failedAttemptsKey = "ieltsAlmazTeacherFailedAttempts";
const lockoutUntilKey = "ieltsAlmazTeacherLockoutUntil";
const learnerRecordsKey = "ieltsAlmazLearnerSessions";
let activeRecordId = null;
let sessionStartedAt = 0;
let leaderboardSort = "xp";
let failedAttempts = Number.parseInt(localStorage.getItem(failedAttemptsKey) || "0", 10) || 0;
let lockoutUntil = Number.parseInt(localStorage.getItem(lockoutUntilKey) || "0", 10) || 0;

function updateDashboardLockout() {
	const secondsLeft = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
	const isLocked = secondsLeft > 0;
	dashboardCode.disabled = isLocked;
	dashboardSubmit.disabled = isLocked;

	if (isLocked) {
		const minutes = Math.floor(secondsLeft / 60);
		const seconds = String(secondsLeft % 60).padStart(2, "0");
		codeError.textContent = `Too many incorrect attempts. Try again in ${minutes}:${seconds}.`;
		codeError.hidden = false;
	} else if (lockoutUntil) {
		failedAttempts = 0;
		lockoutUntil = 0;
		localStorage.removeItem(failedAttemptsKey);
		localStorage.removeItem(lockoutUntilKey);
		codeError.hidden = true;
	}
}

updateDashboardLockout();
window.setInterval(updateDashboardLockout, 1000);

function showView(view) {
	introView.hidden = view !== "intro";
	dashboardGate.hidden = view !== "gate";
	teacherView.hidden = view !== "teacher";
	leaderboardView.hidden = view !== "leaderboard";
	lessonHeader.hidden = view !== "lesson";
	lessonMain.hidden = view !== "lesson";
	window.scrollTo({ top: 0 });
}

document.querySelector("#lessonForm").addEventListener("submit", (event) => {
	event.preventDefault();
	const name = learnerName.value.trim().replace(/\s+/g, " ");
	if (name.split(" ").filter(Boolean).length < 2) {
		nameError.hidden = false;
		learnerName.focus();
		return;
	}
	nameError.hidden = true;
	learnerWelcome.textContent = name;
	learnerWelcome.hidden = false;
	startLearnerSession(name);
	progress.completed.article = true;
	showView("lesson");
	selectTab("article");
	updateStats();
});

learnerName.addEventListener("input", () => {
	nameError.hidden = true;
});

document.querySelector("#showDashboard").addEventListener("click", () => {
	dashboardCode.value = "";
	showView("gate");
	updateDashboardLockout();
	if (!dashboardCode.disabled) dashboardCode.focus();
});

document.querySelector("#dashboardForm").addEventListener("submit", (event) => {
	event.preventDefault();
	updateDashboardLockout();
	if (dashboardCode.disabled) return;
	if (dashboardCode.value === "0405") {
		failedAttempts = 0;
		localStorage.removeItem(failedAttemptsKey);
		localStorage.removeItem(lockoutUntilKey);
		lockoutUntil = 0;
		codeError.hidden = true;
		renderTeacherLearners();
		showView("teacher");
		return;
	}
	failedAttempts += 1;
	localStorage.setItem(failedAttemptsKey, String(failedAttempts));
	codeError.hidden = false;
	dashboardCode.value = "";
	if (failedAttempts >= 3) {
		lockoutUntil = Date.now() + 5 * 60 * 1000;
		localStorage.setItem(lockoutUntilKey, String(lockoutUntil));
		updateDashboardLockout();
	} else {
		const remainingAttempts = 3 - failedAttempts;
		codeError.textContent = `Incorrect code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} left before a 5-minute lockout.`;
		dashboardCode.focus();
	}
});

dashboardCode.addEventListener("input", () => {
	dashboardCode.value = dashboardCode.value.replace(/\D/g, "").slice(0, 4);
});

document.querySelector("#cancelDashboard").addEventListener("click", () => showView("intro"));
document.querySelector("#dashboardHome").addEventListener("click", () => showView("intro"));
document.querySelector("#dashboardReturn").addEventListener("click", () => showView("intro"));
document.querySelector("#dashboardStartLesson").addEventListener("click", () => {
	progress.completed.article = true;
	showView("lesson");
	selectTab("article");
	updateStats();
});

document.querySelector("#leaderboardToggle").addEventListener("click", () => {
	saveActiveLearnerRecord();
	renderLeaderboard("xp");
	showView("leaderboard");
});

document.querySelector("#leaderboardBack").addEventListener("click", () => {
	saveActiveLearnerRecord();
	showView("lesson");
});

for (const sortButton of document.querySelectorAll("[data-leaderboard-sort]")) {
	sortButton.addEventListener("click", () => renderLeaderboard(sortButton.dataset.leaderboardSort));
}

window.addEventListener("beforeunload", () => saveActiveLearnerRecord());

const terms = document.querySelectorAll(".term");

function closeTerms(except = null) {
	for (const term of terms) {
		if (term !== except) {
			term.classList.remove("is-open");
			term.setAttribute("aria-expanded", "false");
		}
	}
}

for (const term of terms) {
	term.addEventListener("click", () => {
		const willOpen = !term.classList.contains("is-open");
		closeTerms(term);
		term.classList.toggle("is-open", willOpen);
		term.setAttribute("aria-expanded", String(willOpen));
	});
}

document.addEventListener("click", (event) => {
	if (!event.target.closest(".term")) closeTerms();
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") closeTerms();
});

const articlePanel = document.querySelector("#articlePanel");
const activityPanel = document.querySelector("#activityPanel");
const vocabularyTranslations = {
	memorized: { uz: "yod oldi", ru: "запомнил", tr: "ezberledi", zh: "记住了" },
	evolve: { uz: "rivojlanmoq; o‘zgarib bormoq", ru: "развиваться", tr: "gelişmek", zh: "发展" },
	adaptability: { uz: "moslashuvchanlik", ru: "адаптивность", tr: "uyum sağlama yeteneği", zh: "适应能力" },
	integrated: { uz: "birlashtirilgan; kiritilgan", ru: "интегрированный", tr: "bütünleştirilmiş", zh: "融入的" },
	artificial: { uz: "sun’iy", ru: "искусственный", tr: "yapay", zh: "人工的" },
	persuasively: { uz: "ishontiradigan tarzda", ru: "убедительно", tr: "ikna edici biçimde", zh: "有说服力地" },
	unprepared: { uz: "tayyor bo‘lmagan", ru: "неподготовленный", tr: "hazırlıksız", zh: "未准备好的" },
	required: { uz: "talab qilinadigan", ru: "требуемый", tr: "gerekli", zh: "必需的" },
	expertise: { uz: "mutaxassislik mahorati", ru: "экспертные знания", tr: "uzmanlık", zh: "专业知识" },
	obsolete: { uz: "eskirgan; dolzarbligini yo‘qotgan", ru: "устаревший", tr: "eskimiş", zh: "过时的" },
	foundational: { uz: "asosiy; poydevor bo‘ladigan", ru: "основополагающий", tr: "temel", zh: "基础的" },
	incorporating: { uz: "tarkibiga kiritish", ru: "включение", tr: "dahil etme", zh: "纳入" },
	exposure: { uz: "bevosita tajriba", ru: "практическое знакомство", tr: "gerçek ortamı deneyimleme", zh: "实践体验" },
	constraints: { uz: "cheklovlar; shart-sharoitlar", ru: "ограничения", tr: "kısıtlamalar", zh: "限制" },
	crucial: { uz: "hal qiluvchi; juda muhim", ru: "крайне важный", tr: "çok önemli", zh: "至关重要的" },
	reflect: { uz: "aks ettirmoq; ko‘rsatmoq", ru: "отражать", tr: "yansıtmak", zh: "反映" },
	mentor: { uz: "ustozlik qilmoq; yo‘l-yo‘riq ko‘rsatmoq", ru: "наставлять", tr: "rehberlik etmek", zh: "指导" },
	automate: { uz: "avtomatlashtirmoq", ru: "автоматизировать", tr: "otomatikleştirmek", zh: "自动化" },
	"ill-equipped": { uz: "yetarlicha tayyorlanmagan", ru: "плохо подготовленный", tr: "yetersiz donanımlı", zh: "准备不足的" },
	fusion: { uz: "uyg‘unlashuv; birikma", ru: "слияние", tr: "birleşim", zh: "融合" }
};
const vocabulary = Array.from(terms, (term) => ({
	word: term.textContent.trim(),
	meaning: term.dataset.meaning,
	translations: vocabularyTranslations[term.textContent.trim()] || { uz: term.dataset.meaning }
})).filter(({ word }, index, items) => items.findIndex((item) => item.word === word) === index);

const questionSets = {
	mcq: [
		{ question: "How was academic success traditionally measured?", options: ["Grades, test scores, and diplomas", "Community projects and internships", "Workplace communication alone"], answer: 0, word: "academic success" },
		{ question: "What limitation of high exam scores does the article identify?", options: ["They do not necessarily show practical ability", "They prevent students from learning theory", "They measure emotional intelligence directly"], answer: 0, word: "practical ability" },
		{ question: "What does adaptability help a student do?", options: ["Adjust when circumstances change", "Memorize a fixed curriculum faster", "Avoid working with other people"], answer: 0, word: "adaptability" },
		{ question: "Why is lifelong learning increasingly important?", options: ["Some skills may become outdated quickly", "Employers no longer value knowledge", "Technology changes very slowly"], answer: 0, word: "obsolete" },
		{ question: "What is one purpose of project-based learning?", options: ["Apply theory while developing practical abilities", "Replace every academic subject", "Make assessment depend only on exams"], answer: 0, word: "project-based learning" },
		{ question: "What do internships and apprenticeships give students?", options: ["Firsthand experience in real-world settings", "A guarantee of immediate employment", "A way to avoid practical constraints"], answer: 0, word: "exposure" },
		{ question: "Why does the author defend foundational academic knowledge?", options: ["It supports reasoning and disciplined thinking", "It makes collaboration unnecessary", "It guarantees a high-paying job"], answer: 0, word: "foundational knowledge" },
		{ question: "Which assessment methods are becoming more common?", options: ["Portfolios, presentations, and group projects", "Only standardized multiple-choice exams", "Attendance records without student work"], answer: 0, word: "assessment" },
		{ question: "According to the article, what should educators increasingly do?", options: ["Mentor students in judgment and resilience", "Focus only on delivering facts quickly", "Prevent students from making decisions"], answer: 0, word: "mentor" },
		{ question: "What does the author say about academic rigor?", options: ["It should remain strong", "It should be abandoned", "It is useful only for examinations"], answer: 0, word: "academic rigor" },
		{ question: "What can sometimes outweigh technical expertise at work?", options: ["Communication and emotional intelligence", "A perfect school transcript", "Memorizing more information"], answer: 0, word: "soft skills" },
		{ question: "How can practical skills help beyond employment?", options: ["With finances, relationships, and everyday decisions", "By removing the need for academic study", "By ensuring that conflicts never happen"], answer: 0, word: "everyday life" },
		{ question: "What do newer assessment methods aim to reflect?", options: ["A student's ability to apply learning", "Only how quickly a student recalls facts", "The number of textbooks completed"], answer: 0, word: "apply" },
		{ question: "Which abilities may remain valuable as automation expands?", options: ["Creativity, ethical reasoning, and human connection", "Repeating fixed procedures without judgment", "Recalling facts without understanding"], answer: 0, word: "automation" },
		{ question: "What is the article's central argument?", options: ["Combine academic achievement with practical readiness", "Replace academic subjects with workplace training", "Measure education only through final exams"], answer: 0, word: "fusion" }
	],
	fillblank: [
		{ question: "Students who ______ formulas quickly were traditionally considered accomplished.", answer: "memorized" },
		{ question: "Society and the job market ______ at an unprecedented pace.", answer: "evolve" },
		{ question: "The ability to adjust to change is called ______.", answer: "adaptability" },
		{ question: "Practical skills should be ______ into education alongside academic knowledge.", answer: "integrated" },
		{ question: "Standardized exams take place under often ______ conditions.", answer: "artificial" },
		{ question: "Students need to communicate ideas ______ to a skeptical audience.", answer: "persuasively" },
		{ question: "Some graduates are knowledgeable in theory but ______ for job demands.", answer: "unprepared" },
		{ question: "The article asks what is actually ______ in professional life.", answer: "required" },
		{ question: "Soft skills can sometimes outweigh technical ______.", answer: "expertise" },
		{ question: "A relevant skill set may become ______ within a few years.", answer: "obsolete" },
		{ question: "Strong ______ knowledge in core subjects supports analytical reasoning.", answer: "foundational" },
		{ question: "The challenge is thoughtfully ______ academic and practical skills.", answer: "incorporating" },
		{ question: "Internships give students firsthand ______ to real-world environments.", answer: "exposure" },
		{ question: "Classroom knowledge may need revision under practical ______.", answer: "constraints" },
		{ question: "Schools and universities play a ______ role in balanced education.", answer: "crucial" }
	],
	truefalse: [
		{ question: "Grades, test scores, and diplomas have traditionally measured academic success.", options: ["True", "False"], answer: 0, word: "academic success" },
		{ question: "A perfect exam score proves that a student can manage workplace conflict.", options: ["True", "False"], answer: 1, word: "exam score" },
		{ question: "The article identifies a specific country where practical skills are taught in schools.", options: ["True", "False"], answer: 2, word: "Not Given" },
		{ question: "Employers consider technical knowledge the only deciding factor at work.", options: ["True", "False"], answer: 1, word: "technical knowledge" },
		{ question: "The article says employers rank adaptability as their single most important skill.", options: ["True", "False"], answer: 2, word: "Not Given" },
		{ question: "Practical abilities can help people manage finances and relationships.", options: ["True", "False"], answer: 0, word: "practical skills" },
		{ question: "The author recommends abandoning rigorous academic subjects.", options: ["True", "False"], answer: 1, word: "academic rigor" },
		{ question: "Project-based learning can connect theory with teamwork and problem-solving.", options: ["True", "False"], answer: 0, word: "project-based learning" },
		{ question: "Internships let students experience real-world environments.", options: ["True", "False"], answer: 0, word: "internships" },
		{ question: "The article specifies how many hours students should spend on practical projects.", options: ["True", "False"], answer: 2, word: "Not Given" },
		{ question: "Teachers should only deliver content and avoid mentoring students.", options: ["True", "False"], answer: 1, word: "mentor" },
		{ question: "Creativity and ethical reasoning may remain valuable as automation grows.", options: ["True", "False"], answer: 0, word: "automation" },
		{ question: "The article claims practical skills matter only when applying for jobs.", options: ["True", "False"], answer: 1, word: "real-world skills" },
		{ question: "Academic knowledge and practical readiness can reinforce each other.", options: ["True", "False"], answer: 0, word: "balance" },
		{ question: "Modern education should prepare students to act under uncertainty.", options: ["True", "False"], answer: 0, word: "uncertainty" }
	],
	boss: [
		{ question: "Which statement best summarizes the article's opening contrast?", options: ["Exam success does not always equal readiness for life beyond school", "Grades have no value in any education system", "Practical ability develops without learning"], answer: 0, word: "academic achievement" },
		{ question: "Why might a graduate with strong theoretical knowledge struggle at work?", options: ["They may lack experience with practical demands", "They have studied too many academic subjects", "Employers no longer use communication"], answer: 0, word: "workplace skills" },
		{ question: "What can be inferred about adaptability?", options: ["It helps learners respond to changing conditions", "It is useful only in technology careers", "It makes foundational knowledge unnecessary"], answer: 0, word: "adaptability" },
		{ question: "Why connect technological change with lifelong learning?", options: ["Today's useful skills may become outdated", "Technology has stopped changing occupations", "Students should avoid acquiring knowledge"], answer: 0, word: "lifelong learning" },
		{ question: "How does project-based learning support the article's argument?", options: ["It applies academic ideas to practical problems", "It replaces classroom content with test practice", "It removes the need to collaborate"], answer: 0, word: "project-based learning" },
		{ question: "What do internships add to classroom learning?", options: ["Experience adapting knowledge in real settings", "A substitute for all academic foundations", "Freedom from workplace constraints"], answer: 0, word: "internships" },
		{ question: "What is the author's position on core academic subjects?", options: ["Their foundations remain important", "They should be removed from curricula", "They matter only for standardized tests"], answer: 0, word: "academic foundations" },
		{ question: "What is an advantage of portfolios and group projects?", options: ["They show how learners apply what they know", "They measure recall more narrowly than exams", "They avoid assessing student work"], answer: 0, word: "assessment" },
		{ question: "What role does the article envision for teachers?", options: ["Content instructor and mentor", "Exam supervisor only", "Workplace recruiter"], answer: 0, word: "educators" },
		{ question: "Which is a practical skill named in the article?", options: ["Negotiating a deadline", "Recalling a diploma date", "Repeating a formula"], answer: 0, word: "communication" },
		{ question: "Why mention personal finances and relationships?", options: ["Practical skills matter outside employment", "Schools should teach only life skills", "Academic knowledge harms decision-making"], answer: 0, word: "everyday life" },
		{ question: "What does the article imply about multiple-choice exams?", options: ["They alone may not reflect full ability", "They should be the only assessment", "They test every real-world skill equally"], answer: 0, word: "multiple-choice exams" },
		{ question: "Which skills are described as difficult to automate?", options: ["Creativity, ethical reasoning, and human connection", "Memorization, repetition, and fixed procedures", "Test-taking speed and factual recall"], answer: 0, word: "automation" },
		{ question: "How should academic and practical learning relate?", options: ["They can reinforce one another", "One must replace the other", "They should be taught in isolation"], answer: 0, word: "balance" },
		{ question: "What outcome does the author ultimately want?", options: ["Knowledgeable people able to thrive amid uncertainty", "Graduates who can only recall information", "Workers trained for one unchanging job"], answer: 0, word: "educational excellence" }
	]
};

for (const mode of ["mcq", "boss"]) {
	for (const item of questionSets[mode]) {
		const correctOption = item.options[item.answer];
		for (let currentIndex = item.options.length - 1; currentIndex > 0; currentIndex -= 1) {
			const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
			[item.options[currentIndex], item.options[randomIndex]] = [item.options[randomIndex], item.options[currentIndex]];
		}
		item.answer = item.options.indexOf(correctOption);
	}
}

const progress = {
	xp: 60,
	streak: 0,
	completed: { article: false, vocab: false, practice: false, assessment: false, boss: false },
	activeTab: "article",
	soundOn: true,
	volume: 0.8,
	flashIndex: 0,
	flashRevealed: false,
	flashSeen: new Set(),
	flashResponses: new Map(),
	flashFinished: false,
	matchedPairs: new Set(),
	matchAttempts: 0,
	matchCorrect: 0,
	selectedWord: null,
	selectedMeaning: null,
	matchFeedback: "",
	technicsRead: false,
	taskResults: {},
	pendingAchievement: null,
	celebratedAchievement: null,
	quiz: Object.fromEntries(Object.keys(questionSets).filter((key) => key !== "fillblank").map((key) => [key, makeQuizState()])),
	fillIndex: 0,
	fillValue: "",
	fillAnswered: false,
	fillFeedback: "",
	fillScore: 0,
	fillCorrectWords: [],
	fillDone: false
};

function makeQuizState() {
	return { index: 0, selected: null, answered: false, feedback: "", score: 0, correctWords: [], done: false };
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	})[character]);
}

function updateStats() {
	const completedCount = Object.values(progress.completed).filter(Boolean).length;
	const totalModules = Object.keys(progress.completed).length;
	const completionPercent = totalModules ? Math.round(completedCount / totalModules * 100) : 0;
	document.querySelector("#xpValue").textContent = String(progress.xp);
	document.querySelector("#streakValue").textContent = String(progress.streak);
	document.querySelector("#completedValue").textContent = `${completedCount}/${totalModules}`;
	document.querySelector("#overallValue").textContent = `${completionPercent}%`;
	saveActiveLearnerRecord();
}

function readLearnerRecords() {
	try {
		const records = JSON.parse(localStorage.getItem(learnerRecordsKey) || "[]");
		return Array.isArray(records) ? records : [];
	} catch {
		return [];
	}
}

function currentSessionAccuracy() {
	const results = Object.values(progress.taskResults);
	const total = results.reduce((sum, result) => sum + result.total, 0);
	const score = results.reduce((sum, result) => sum + result.score, 0);
	return total ? Math.round(score / total * 100) : 0;
}

function startLearnerSession(name) {
	activeRecordId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	sessionStartedAt = Date.now();
	saveActiveLearnerRecord(name);
}

function saveActiveLearnerRecord(name = learnerWelcome.textContent.trim()) {
	if (!activeRecordId || !sessionStartedAt) return;
	const records = readLearnerRecords();
	let record = records.find((entry) => entry.id === activeRecordId);
	if (!record) {
		record = { id: activeRecordId, startedAt: sessionStartedAt, durationSeconds: 0 };
		records.unshift(record);
	}
	record.name = name || learnerName.value.trim();
	record.xp = progress.xp;
	record.accuracy = currentSessionAccuracy();
	record.durationSeconds = Math.max(record.durationSeconds || 0, Math.floor((Date.now() - sessionStartedAt) / 1000));
	record.lastSeenAt = Date.now();
	localStorage.setItem(learnerRecordsKey, JSON.stringify(records));
}

function formatSessionTime(seconds) {
	return `${Math.floor(Math.max(0, seconds) / 60)}m`;
}

function formatSessionDate(timestamp) {
	const date = new Date(timestamp);
	return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function renderLearnerRows(records, showRank) {
	if (!records.length) {
		return `<tr><td class="empty-records" colspan="${showRank ? 6 : 5}">No learner sessions yet.</td></tr>`;
	}
	return records.map((record, index) => {
		const rank = showRank ? `<td>${index === 0 ? "🥇" : `#${index + 1}`}</td>` : "";
		const duration = record.id === activeRecordId
			? Math.max(record.durationSeconds || 0, Math.floor((Date.now() - sessionStartedAt) / 1000))
			: record.durationSeconds || 0;
		return `<tr class="${record.id === activeRecordId ? "is-current" : ""}">${rank}<td>${escapeHtml(record.name)}</td><td>${Number(record.xp) || 0}</td><td>${Number(record.accuracy) || 0}%</td><td>${formatSessionTime(duration)}</td><td>${formatSessionDate(record.startedAt)}</td></tr>`;
	}).join("");
}

function renderLeaderboard(sortBy = leaderboardSort) {
	leaderboardSort = sortBy;
	const records = readLearnerRecords().sort((first, second) => {
		if (sortBy === "accuracy") return (Number(second.accuracy) || 0) - (Number(first.accuracy) || 0) || second.startedAt - first.startedAt;
		if (sortBy === "date") return second.startedAt - first.startedAt;
		return (Number(second.xp) || 0) - (Number(first.xp) || 0) || second.startedAt - first.startedAt;
	});
	const currentIndex = records.findIndex((record) => record.id === activeRecordId);
	document.querySelector("#currentRank").textContent = currentIndex < 0 ? "—" : `#${currentIndex + 1}`;
	document.querySelector("#currentRankName").textContent = currentIndex < 0 ? "No learner session" : records[currentIndex].name;
	leaderboardRows.innerHTML = renderLearnerRows(records, true);
	for (const button of document.querySelectorAll("[data-leaderboard-sort]")) {
		button.setAttribute("aria-pressed", String(button.dataset.leaderboardSort === sortBy));
	}
}

function renderTeacherLearners() {
	const records = readLearnerRecords().sort((first, second) => second.startedAt - first.startedAt);
	document.querySelector("#teacherLearnerCount").textContent = `${records.length} session${records.length === 1 ? "" : "s"}`;
	teacherLearnerRows.innerHTML = renderLearnerRows(records, false);
}

function completeModule(moduleName) {
	if (progress.completed[moduleName]) return;
	progress.completed[moduleName] = true;
	progress.xp += 10;
	updateStats();
}

function recordAnswer(isCorrect) {
	if (isCorrect) {
		progress.streak += 1;
		progress.xp += 5;
	} else {
		progress.streak = 0;
	}
	updateStats();
}

function recordTaskResult(key, score, total, items, itemsLabel = "Words you got right", reviewItems = []) {
	const safeTotal = Math.max(0, total);
	const safeScore = Math.min(safeTotal, Math.max(0, score));
	progress.taskResults[key] = {
		score: safeScore,
		total: safeTotal,
		percentage: safeTotal ? Math.round(safeScore / safeTotal * 100) : 0,
		items: [...new Set(items)],
		itemsLabel,
		reviewItems: [...new Set(reviewItems)]
	};
	progress.pendingAchievement = key;
	saveActiveLearnerRecord();
}

function renderAchievement(key) {
	const result = progress.taskResults[key];
	if (!result || progress.pendingAchievement !== key) return "";
	const level = result.percentage >= 90 ? "Excellent work!" : result.percentage >= 70 ? "Great job!" : result.percentage >= 50 ? "Good progress!" : "Keep practicing!";
	const title = key === "finalboss" ? "Final Boss Defeated!" : "Congratulations!";
	const items = result.items.length
		? result.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
		: "<li>No correct answers yet. Keep practicing!</li>";
	const review = result.reviewItems.length
		? `<div class="achievement-review"><h4>Words to review</h4><ul>${result.reviewItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
		: "";
	return `<div class="achievement-overlay"><div class="celebration-confetti" aria-hidden="true">${renderConfetti()}</div><section class="achievement-dialog" role="dialog" aria-modal="true" aria-labelledby="achievementTitle"><div class="achievement-icon" aria-hidden="true">${key === "finalboss" ? "🏆" : "🎉"}</div><h3 id="achievementTitle">${title}</h3><p class="achievement-level">${level}</p><div class="achievement-metrics"><div class="achievement-metric"><strong>${result.percentage}%</strong><span>ACCURACY</span></div><div class="achievement-metric"><strong>${result.score}/${result.total}</strong><span>CORRECT</span></div><div class="achievement-metric"><strong>${progress.xp}</strong><span>TOTAL XP</span></div><div class="achievement-metric"><strong>${progress.streak}</strong><span>STREAK</span></div></div><div class="achievement-results"><h4>${escapeHtml(result.itemsLabel)}</h4><ul class="achievement-items">${items}</ul></div>${review}<button class="activity-action achievement-continue" type="button" data-action="dismiss-achievement" autofocus>Continue →</button></section></div>`;
}

function renderConfetti() {
	const colors = ["#ff5d73", "#ffc857", "#55d6a4", "#61c8ff", "#b89aff"];
	return Array.from({ length: 32 }, (_, index) => {
		const fromLeft = index < 16;
		const distance = 120 + Math.round(Math.random() * 250);
		const horizontal = fromLeft ? distance : -distance;
		const vertical = -(90 + Math.round(Math.random() * 260));
		const rotation = (Math.random() > 0.5 ? 1 : -1) * (240 + Math.round(Math.random() * 600));
		const delay = Math.round(Math.random() * 180);
		const color = colors[index % colors.length];
		return `<span class="confetti-piece ${fromLeft ? "from-left" : "from-right"}" style="--confetti-color:${color};--confetti-x:${horizontal}px;--confetti-y:${vertical}px;--confetti-rotation:${rotation}deg;--confetti-delay:${delay}ms"></span>`;
	}).join("");
}

function selectTab(tabName) {
	progress.activeTab = tabName;
	for (const tab of document.querySelectorAll(".lesson-tab")) {
		const isSelected = tab.dataset.tab === tabName;
		tab.setAttribute("aria-selected", String(isSelected));
		if (isSelected) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
	}
	const showingArticle = tabName === "article";
	articlePanel.hidden = !showingArticle;
	activityPanel.hidden = showingArticle;
	if (!showingArticle) renderActivityPanel();
}

function panelHeading(kicker, title, description) {
	return `<p class="activity-kicker">${escapeHtml(kicker)}</p><h2 class="activity-title">${escapeHtml(title)}</h2><p class="activity-description">${escapeHtml(description)}</p>`;
}

function renderVocabulary() {
	const rows = vocabulary.map(({ word, translations }) => {
		const meanings = [["UZ", translations.uz], ["RU", translations.ru], ["TR", translations.tr], ["中文", translations.zh]]
			.map(([language, meaning]) => `<div class="vocab-translation"><b>${language}</b><span>${escapeHtml(meaning)}</span></div>`).join("");
		return `<div class="vocab-row"><div><strong>${escapeHtml(word)}</strong><div class="vocab-translations">${meanings}</div></div><button type="button" data-action="speak" data-word="${escapeHtml(word)}" aria-label="Play pronunciation of ${escapeHtml(word)}">▶ Listen</button></div>`;
	}).join("");
	return `${panelHeading("Word bank", "Key Vocabulary", `Review these ${vocabulary.length} key words from the article with Uzbek, Russian, Turkish, and Chinese meanings. Turn on Sound to hear English pronunciation.`)}<div class="vocab-list">${rows}</div><button class="activity-action" type="button" data-action="complete-vocab">Mark vocabulary complete</button>`;
}

function renderFlashcards() {
	if (progress.flashFinished) {
		return `${panelHeading("Practice / 1", "Flashcards", "You reviewed every vocabulary card.")}<p class="activity-progress">Your result is shown below.</p>`;
	}
	const item = vocabulary[progress.flashIndex];
	const response = progress.flashResponses.get(progress.flashIndex);
	const face = progress.flashRevealed
		? `<div class="flashcard-translations"><span><b>UZ</b>${escapeHtml(item.translations.uz)}</span><span><b>RU</b>${escapeHtml(item.translations.ru)}</span><span><b>TR</b>${escapeHtml(item.translations.tr)}</span><span><b>中文</b>${escapeHtml(item.translations.zh)}</span></div>`
		: `<strong>${escapeHtml(item.word)}</strong>`;
	const hint = progress.flashRevealed ? "Meaning" : "Tap to reveal the meaning";
	const choices = progress.flashRevealed
		? `<div class="flashcard-actions"><button class="recall-button recall-learning" type="button" data-action="flash-response" data-known="false" aria-pressed="${response === false}" ${response !== undefined ? "disabled" : ""}>Still learning</button><button class="recall-button recall-known" type="button" data-action="flash-response" data-known="true" aria-pressed="${response === true}" ${response !== undefined ? "disabled" : ""}>I know this</button></div>`
		: "";
	return `${panelHeading("Practice / 1", "Flashcards", "Reveal the translations, then mark whether you know the word.")}<div class="activity-center"><button class="flashcard" type="button" data-action="flip-card" aria-pressed="${progress.flashRevealed}"><small>${hint}</small>${face}</button>${choices}<p class="activity-progress">Card ${progress.flashIndex + 1} of ${vocabulary.length} · ${progress.flashSeen.size} reviewed</p><div class="flashcard-navigation"><button class="activity-action" type="button" data-action="previous-card" ${progress.flashIndex === 0 ? "disabled" : ""}>← Previous</button><button class="activity-action" type="button" data-action="next-card" ${response === undefined ? "disabled" : ""}>${progress.flashIndex === vocabulary.length - 1 ? "Finish cards →" : "Next →"}</button></div></div>`;
}

function renderMatch() {
	const meaningOrder = [...vocabulary.keys()].reverse();
	const words = vocabulary;
	const wordButtons = words.map((item, index) => `<button class="match-choice ${progress.matchedPairs.has(index) ? "is-matched" : ""} ${progress.selectedWord === index ? "is-selected" : ""}" type="button" data-action="match-select" data-side="word" data-pair="${index}" ${progress.matchedPairs.has(index) ? "disabled" : ""}>${escapeHtml(item.word)}</button>`).join("");
	const meaningButtons = meaningOrder.map((index) => {
		const item = words[index];
		const translations = [["UZ", item.meaning], ["RU", item.translations.ru], ["TR", item.translations.tr], ["中文", item.translations.zh]]
			.map(([language, meaning]) => `<span class="match-translation"><b>${language}</b><span>${escapeHtml(meaning)}</span></span>`).join("");
		return `<button class="match-choice ${progress.matchedPairs.has(index) ? "is-matched" : ""} ${progress.selectedMeaning === index ? "is-selected" : ""}" type="button" data-action="match-select" data-side="meaning" data-pair="${index}" ${progress.matchedPairs.has(index) ? "disabled" : ""}><span class="match-translations">${translations}</span></button>`;
	}).join("");
	return `${panelHeading("Practice / 2", "Match the Meaning", "Match each article word with its Uzbek, Russian, Turkish, and Chinese translations.")}<div class="match-board"><div class="match-column">${wordButtons}</div><div class="match-column">${meaningButtons}</div></div><p class="answer-feedback" role="status">${escapeHtml(progress.matchFeedback)}</p><p class="activity-progress">${progress.matchedPairs.size} of ${words.length} pairs matched</p>`;
}

function renderQuiz(mode) {
	const state = progress.quiz[mode];
	const questions = questionSets[mode];
	const label = mode === "boss" ? "Final challenge" : mode === "mcq" ? "Assessment / 1" : "Assessment / 3";
	const title = mode === "boss" ? "Final Boss" : mode === "mcq" ? "Multiple Choice" : "True / False / Not Given";
	const description = mode === "boss" ? "Finish the challenge by answering every question." : mode === "truefalse" ? "Decide whether each statement is true, false, or not given in the article." : "Choose the best answer, check it, then continue.";
	if (state.done) {
		return `${panelHeading(label, title, "This round is complete.")}<div class="question-card"><p class="question-text">Score: ${state.score} / ${questions.length}</p><button class="activity-action" type="button" data-action="restart-quiz" data-mode="${mode}">Try again</button></div>`;
	}
	const item = questions[state.index];
	const answerOptions = mode === "truefalse" ? ["True", "False", "Not Given"] : item.options;
	const options = answerOptions.map((option, index) => `<button class="answer-option ${state.selected === index ? "is-selected" : ""}" type="button" data-action="choose-answer" data-mode="${mode}" data-index="${index}" ${state.answered ? "disabled" : ""}>${escapeHtml(option)}</button>`).join("");
	const nextLabel = state.index === questions.length - 1 ? "Finish" : "Next question";
	return `${panelHeading(label, title, description)}<div class="question-card"><p class="activity-progress">Question ${state.index + 1} of ${questions.length}</p><p class="question-text">${escapeHtml(item.question)}</p><div class="answer-options">${options}</div><p class="answer-feedback" role="status">${escapeHtml(state.feedback)}</p><button class="activity-action" type="button" data-action="check-answer" data-mode="${mode}" ${state.selected === null || state.answered ? "disabled" : ""}>Check answer</button>${state.answered ? `<button class="activity-action" type="button" data-action="next-question" data-mode="${mode}">${nextLabel}</button>` : ""}</div>`;
}

function renderFillBlank() {
	if (progress.fillDone) {
		return `${panelHeading("Assessment / 2", "Fill in the Blank", "This exercise is complete.")}<div class="question-card"><p class="question-text">Score: ${progress.fillScore} / ${questionSets.fillblank.length}</p><button class="activity-action" type="button" data-action="restart-fill">Try again</button></div>`;
	}
	const item = questionSets.fillblank[progress.fillIndex];
	const answer = vocabulary.find(({ word }) => word === item.answer);
	const translations = answer
		? [["UZ", answer.translations.uz], ["RU", answer.translations.ru], ["TR", answer.translations.tr], ["中文", answer.translations.zh]]
			.map(([language, meaning]) => `<span><b>${language}</b>${escapeHtml(meaning)}</span>`).join("")
		: "";
	const translationReview = progress.fillAnswered && translations
		? `<div class="fill-translation-review"><strong>${escapeHtml(item.answer)}</strong><div class="flashcard-translations">${translations}</div></div>`
		: "";
	return `${panelHeading("Assessment / 2", "Fill in the Blank", "Type the missing vocabulary word, then check your answer.")}<div class="question-card"><p class="activity-progress">Question ${progress.fillIndex + 1} of ${questionSets.fillblank.length}</p><p class="question-text">${escapeHtml(item.question)}</p><label class="visually-hidden" for="fillAnswer">Missing vocabulary word</label><input id="fillAnswer" class="fill-input" type="text" value="${escapeHtml(progress.fillValue)}" autocomplete="off" ${progress.fillAnswered ? "disabled" : ""}><p class="answer-feedback" role="status">${escapeHtml(progress.fillFeedback)}</p>${translationReview}${progress.fillAnswered ? `<button class="activity-action" type="button" data-action="fill-next">${progress.fillIndex === questionSets.fillblank.length - 1 ? "Finish" : "Next question"}</button>` : `<button class="activity-action" type="button" data-action="fill-check" ${progress.fillValue.trim() ? "" : "disabled"}>Check answer</button>`}</div>`;
}

function renderTechnique() {
	const passes = [
		["Skim for the main idea", "Read the title, opening, and topic sentences quickly to identify the writer's overall argument."],
		["Map paragraph purposes", "Notice how each section develops the argument: limits, workplace needs, balance, institutions, or the future."],
		["Scan for keywords", "Use important words from a question to locate the relevant paragraph, then read that part closely."],
		["Spot paraphrases", "IELTS questions often restate ideas with synonyms. Match meaning rather than searching only for identical words."],
		["Check True / False / Not Given", "Use True when the text supports a statement, False when it contradicts one, and Not Given when the text provides no answer."]
	];
	const cards = passes.map(([title, description], index) => `<li class="technique-card"><span class="technique-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></li>`).join("");
	return `${panelHeading("IELTS Reading", "Reading strategies", "Use these techniques to locate evidence, recognize paraphrases, and distinguish unsupported claims from contradictions.")}<ol class="technique-list">${cards}</ol><button class="activity-action" type="button" data-action="technique-done" ${progress.technicsRead ? "disabled" : ""}>${progress.technicsRead ? "All five techniques complete ✓" : "Mark all five techniques complete"}</button>`;
}

function renderActivityPanel() {
	const renderers = {
		vocab: renderVocabulary,
		flashcards: renderFlashcards,
		match: renderMatch,
		mcq: () => renderQuiz("mcq"),
		fillblank: renderFillBlank,
		truefalse: () => renderQuiz("truefalse"),
		finalboss: () => renderQuiz("boss"),
		technique: renderTechnique
	};
	const resultKeys = { vocab: "vocab", flashcards: "flashcards", match: "match", mcq: "mcq", fillblank: "fillblank", truefalse: "truefalse", finalboss: "finalboss", technique: "technique" };
	const resultKey = resultKeys[progress.activeTab];
	activityPanel.innerHTML = renderers[progress.activeTab]() + renderAchievement(resultKey);
	if (progress.pendingAchievement && progress.celebratedAchievement !== progress.pendingAchievement) {
		progress.celebratedAchievement = progress.pendingAchievement;
		playVictorySound();
	}
	activityPanel.querySelector('[data-action="dismiss-achievement"]')?.focus();
}

function updateAssessmentProgress() {
	if (progress.quiz.mcq.done && progress.fillDone && progress.quiz.truefalse.done) completeModule("assessment");
}

function updatePracticeProgress() {
	if (progress.flashFinished && progress.matchedPairs.size === vocabulary.length) completeModule("practice");
}

function speakWord(word) {
	if (!progress.soundOn) return;
	if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
		return;
	}
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(word);
	const voices = window.speechSynthesis.getVoices();
	const isBritishEnglish = (voice) => /^en[-_]gb\b/i.test(voice.lang);
	const soundsMasculine = (voice) => /\b(male|ryan|george|daniel|arthur|oliver|brian|david|james|thomas|alfie|william|guy|andrew|mark|tom)\b/i.test(voice.name);
	const voice = voices.find((item) => isBritishEnglish(item) && soundsMasculine(item))
		|| voices.find(isBritishEnglish)
		|| voices.find((item) => item.lang.toLowerCase().startsWith("en") && soundsMasculine(item))
		|| voices.find((item) => item.lang.toLowerCase().startsWith("en"));
	utterance.lang = voice?.lang || "en-GB";
	utterance.volume = progress.volume;
	utterance.rate = 0.9;
	if (voice) utterance.voice = voice;
	window.speechSynthesis.speak(utterance);
}

let interfaceAudioContext;

function playInterfaceSound() {
	if (!progress.soundOn) return;
	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!AudioContextClass) return;
	interfaceAudioContext ??= new AudioContextClass();
	if (interfaceAudioContext.state === "suspended") interfaceAudioContext.resume();
	const oscillator = interfaceAudioContext.createOscillator();
	const gain = interfaceAudioContext.createGain();
	const startTime = interfaceAudioContext.currentTime;
	oscillator.type = "sine";
	oscillator.frequency.setValueAtTime(620, startTime);
	gain.gain.setValueAtTime(0.0001, startTime);
	gain.gain.exponentialRampToValueAtTime(Math.max(0.001, progress.volume * 0.055), startTime + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08);
	oscillator.connect(gain);
	gain.connect(interfaceAudioContext.destination);
	oscillator.start(startTime);
	oscillator.stop(startTime + 0.08);
}

function playVictorySound() {
	if (!progress.soundOn) return;
	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if (!AudioContextClass) return;
	interfaceAudioContext ??= new AudioContextClass();
	if (interfaceAudioContext.state === "suspended") interfaceAudioContext.resume();
	const startTime = interfaceAudioContext.currentTime;
	const notes = [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.42]];
	for (const [frequency, offset] of notes) {
		const oscillator = interfaceAudioContext.createOscillator();
		const gain = interfaceAudioContext.createGain();
		const noteStart = startTime + offset;
		oscillator.type = "triangle";
		oscillator.frequency.setValueAtTime(frequency, noteStart);
		gain.gain.setValueAtTime(0.0001, noteStart);
		gain.gain.exponentialRampToValueAtTime(Math.max(0.001, progress.volume * 0.12), noteStart + 0.025);
		gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.38);
		oscillator.connect(gain);
		gain.connect(interfaceAudioContext.destination);
		oscillator.start(noteStart);
		oscillator.stop(noteStart + 0.4);
	}
}

function checkQuizAnswer(mode) {
	const state = progress.quiz[mode];
	if (state.selected === null || state.answered) return;
	const item = questionSets[mode][state.index];
	const isCorrect = state.selected === item.answer;
	state.answered = true;
	state.feedback = isCorrect ? "Correct!" : "Not quite. Review the article and try the next one.";
	if (isCorrect) {
		state.score += 1;
		state.correctWords.push(item.word || item.options[item.answer]);
	}
	recordAnswer(isCorrect);
	renderActivityPanel();
}

function nextQuizQuestion(mode) {
	const state = progress.quiz[mode];
	if (!state.answered) return;
	if (state.index === questionSets[mode].length - 1) {
		state.done = true;
		const resultKey = mode === "boss" ? "finalboss" : mode;
		recordTaskResult(resultKey, state.score, questionSets[mode].length, state.correctWords);
		if (mode === "boss") completeModule("boss");
		if (mode !== "boss") updateAssessmentProgress();
	} else {
		state.index += 1;
		state.selected = null;
		state.answered = false;
		state.feedback = "";
	}
	renderActivityPanel();
}

function handleActivityClick(event) {
	const button = event.target.closest("[data-action]");
	if (!button) return;
	const action = button.dataset.action;
	if (action === "dismiss-achievement") {
		progress.pendingAchievement = null;
		progress.celebratedAchievement = null;
		renderActivityPanel();
		return;
	}
	if (action === "speak") speakWord(button.dataset.word);
	if (action === "complete-vocab") {
		const words = vocabulary.map((item) => item.word);
		recordTaskResult("vocab", words.length, words.length, words);
		completeModule("vocab");
		renderActivityPanel();
	}
	if (action === "flip-card") {
		progress.flashRevealed = !progress.flashRevealed;
		if (progress.flashRevealed && !progress.flashSeen.has(progress.flashIndex)) {
			progress.flashSeen.add(progress.flashIndex);
			progress.xp += 1;
			updateStats();
			speakWord(vocabulary[progress.flashIndex].word);
		}
		renderActivityPanel();
	}
	if (action === "next-card") {
		if (!progress.flashResponses.has(progress.flashIndex)) return;
		if (progress.flashIndex < vocabulary.length - 1) {
			progress.flashIndex += 1;
		} else {
			progress.flashFinished = true;
			const knownWords = [...progress.flashResponses.entries()].filter(([, known]) => known).map(([index]) => vocabulary[index].word);
			const reviewWords = [...progress.flashResponses.entries()].filter(([, known]) => !known).map(([index]) => vocabulary[index].word);
			recordTaskResult("flashcards", knownWords.length, vocabulary.length, knownWords, "Words you know", reviewWords);
		}
		progress.flashRevealed = false;
		updatePracticeProgress();
		renderActivityPanel();
	}
	if (action === "previous-card") {
		if (progress.flashIndex > 0) progress.flashIndex -= 1;
		progress.flashRevealed = false;
		renderActivityPanel();
	}
	if (action === "flash-response") {
		const knowsWord = button.dataset.known === "true";
		if (!progress.flashResponses.has(progress.flashIndex)) recordAnswer(knowsWord);
		progress.flashResponses.set(progress.flashIndex, knowsWord);
		renderActivityPanel();
	}
	if (action === "match-select") {
		const pair = Number(button.dataset.pair);
		if (button.dataset.side === "word") progress.selectedWord = pair;
		else progress.selectedMeaning = pair;
		if (progress.selectedWord !== null && progress.selectedMeaning !== null) {
			const isCorrect = progress.selectedWord === progress.selectedMeaning;
			progress.matchAttempts += 1;
			progress.matchFeedback = isCorrect ? "Correct match!" : "Those meanings do not match. Try another pair.";
			recordAnswer(isCorrect);
			if (isCorrect) {
				progress.matchCorrect += 1;
				progress.matchedPairs.add(pair);
			}
			if (progress.matchedPairs.size === vocabulary.length) {
				const matchedWords = [...progress.matchedPairs].map((index) => vocabulary[index].word);
				recordTaskResult("match", progress.matchCorrect, vocabulary.length, matchedWords);
			}
			progress.selectedWord = null;
			progress.selectedMeaning = null;
			updatePracticeProgress();
		}
		renderActivityPanel();
	}
	if (action === "choose-answer") {
		const state = progress.quiz[button.dataset.mode];
		if (!state.answered) state.selected = Number(button.dataset.index);
		renderActivityPanel();
	}
	if (action === "check-answer") checkQuizAnswer(button.dataset.mode);
	if (action === "next-question") nextQuizQuestion(button.dataset.mode);
	if (action === "restart-quiz") {
		progress.quiz[button.dataset.mode] = makeQuizState();
		delete progress.taskResults[button.dataset.mode === "boss" ? "finalboss" : button.dataset.mode];
		renderActivityPanel();
	}
	if (action === "fill-check") {
		const item = questionSets.fillblank[progress.fillIndex];
		const isCorrect = progress.fillValue.trim().toLowerCase() === item.answer;
		progress.fillAnswered = true;
		progress.fillFeedback = isCorrect ? "Correct!" : `Answer: ${item.answer}`;
		if (isCorrect) {
			progress.fillScore += 1;
			progress.fillCorrectWords.push(item.answer);
		}
		recordAnswer(isCorrect);
		renderActivityPanel();
	}
	if (action === "fill-next") {
		if (progress.fillIndex === questionSets.fillblank.length - 1) {
			progress.fillDone = true;
			recordTaskResult("fillblank", progress.fillScore, questionSets.fillblank.length, progress.fillCorrectWords);
			updateAssessmentProgress();
		} else {
			progress.fillIndex += 1;
			progress.fillValue = "";
			progress.fillAnswered = false;
			progress.fillFeedback = "";
		}
		renderActivityPanel();
	}
	if (action === "restart-fill") {
		progress.fillIndex = 0;
		progress.fillValue = "";
		progress.fillAnswered = false;
		progress.fillFeedback = "";
		progress.fillScore = 0;
		progress.fillCorrectWords = [];
		progress.fillDone = false;
		delete progress.taskResults.fillblank;
		renderActivityPanel();
	}
	if (action === "technique-done" && !progress.technicsRead) {
		progress.technicsRead = true;
		progress.xp += 5;
		recordTaskResult("technique", 5, 5, ["Skim for the main idea", "Map paragraph purposes", "Scan for keywords", "Spot paraphrases", "Check True / False / Not Given"], "Reading strategies completed");
		updateStats();
		renderActivityPanel();
	}
}

activityPanel.addEventListener("click", handleActivityClick);
activityPanel.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && progress.pendingAchievement) {
		progress.pendingAchievement = null;
		progress.celebratedAchievement = null;
		renderActivityPanel();
	}
});
activityPanel.addEventListener("input", (event) => {
	if (event.target.id === "fillAnswer") {
		progress.fillValue = event.target.value;
		const checkButton = activityPanel.querySelector('[data-action="fill-check"]');
		if (checkButton) checkButton.disabled = !progress.fillValue.trim();
	}
});

for (const tab of document.querySelectorAll(".lesson-tab")) {
	tab.addEventListener("click", () => {
		playInterfaceSound();
		selectTab(tab.dataset.tab);
	});
}

function applyTheme(theme) {
	document.body.classList.remove("dark-mode", "theme-light", "theme-nature", "theme-blue");
	if (theme === "dark") document.body.classList.add("dark-mode");
	else document.body.classList.add(`theme-${theme}`);
	document.querySelector("#themeToggle").value = theme;
}

document.querySelector("#themeToggle").addEventListener("change", (event) => {
	applyTheme(event.currentTarget.value);
});

document.querySelector("#soundToggle").addEventListener("click", (event) => {
	progress.soundOn = !progress.soundOn;
	event.currentTarget.textContent = progress.soundOn ? "🔊 Sound on" : "🔇 Sound off";
	event.currentTarget.setAttribute("aria-pressed", String(progress.soundOn));
	if (progress.soundOn) speakWord("Education");
	else if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});

function adjustVolume(amount) {
	progress.volume = Math.min(1, Math.max(0.1, Math.round((progress.volume + amount) * 10) / 10));
	document.querySelector("#volumeLevel").textContent = `${Math.round(progress.volume * 100)}%`;
}

document.querySelector("#volumeDown").addEventListener("click", () => adjustVolume(-0.1));
document.querySelector("#volumeUp").addEventListener("click", () => adjustVolume(0.1));

document.querySelector("#fontDown").addEventListener("click", () => {
	const currentSize = Number.parseInt(getComputedStyle(articlePanel).fontSize, 10);
	articlePanel.style.fontSize = `${Math.max(16, currentSize - 1)}px`;
});

document.querySelector("#fontUp").addEventListener("click", () => {
	const currentSize = Number.parseInt(getComputedStyle(articlePanel).fontSize, 10);
	articlePanel.style.fontSize = `${Math.min(28, currentSize + 1)}px`;
});

function resetLessonProgress() {
	progress.xp = 60;
	progress.streak = 0;
	progress.completed = { article: false, vocab: false, practice: false, assessment: false, boss: false };
	progress.activeTab = "article";
	progress.soundOn = true;
	progress.volume = 0.8;
	progress.flashIndex = 0;
	progress.flashRevealed = false;
	progress.flashSeen.clear();
	progress.flashResponses.clear();
	progress.flashFinished = false;
	progress.matchedPairs.clear();
	progress.matchAttempts = 0;
	progress.matchCorrect = 0;
	progress.selectedWord = null;
	progress.selectedMeaning = null;
	progress.matchFeedback = "";
	progress.technicsRead = false;
	progress.taskResults = {};
	progress.pendingAchievement = null;
	progress.celebratedAchievement = null;
	progress.quiz = Object.fromEntries(Object.keys(questionSets).filter((key) => key !== "fillblank").map((key) => [key, makeQuizState()]));
	progress.fillIndex = 0;
	progress.fillValue = "";
	progress.fillAnswered = false;
	progress.fillFeedback = "";
	progress.fillScore = 0;
	progress.fillCorrectWords = [];
	progress.fillDone = false;
	if ("speechSynthesis" in window) window.speechSynthesis.cancel();
	applyTheme("dark");
	document.querySelector("#soundToggle").textContent = "🔊 Sound on";
	document.querySelector("#soundToggle").setAttribute("aria-pressed", "true");
	document.querySelector("#volumeLevel").textContent = "80%";
	articlePanel.style.removeProperty("font-size");
	closeTerms();
	updateStats();
}

document.querySelector("#signOut").addEventListener("click", () => {
	saveActiveLearnerRecord();
	activeRecordId = null;
	sessionStartedAt = 0;
	learnerName.value = "";
	learnerWelcome.textContent = "";
	resetLessonProgress();
	showView("intro");
});

activityPanel.setAttribute("role", "tabpanel");
