const API_BASE_URL = "http://127.0.0.1:5000";


const expressionDisplay =
    document.getElementById("expression-display");

const resultDisplay =
    document.getElementById("result-display");

const errorMessage =
    document.getElementById("error-message");

const historyList =
    document.getElementById("history-list");

const historyCount =
    document.getElementById("history-count");

const refreshHistoryButton =
    document.getElementById("refresh-history-button");

const clearHistoryButton =
    document.getElementById("clear-history-button");

const historySearchInput =
    document.getElementById("history-search-input");

const themeToggleButton =
    document.getElementById("theme-toggle-button");

const backendStatus =
    document.getElementById("backend-status");


let expression = "";

let historyCache = [];


/* =========================
   工具函数
   ========================= */

function formatExpressionForDisplay(value) {
    return String(value)
        .replaceAll("*", "×")
        .replaceAll("/", "÷");
}


function updateExpressionDisplay() {
    if (expression === "") {
        expressionDisplay.textContent = "0";
        return;
    }

    expressionDisplay.textContent =
        formatExpressionForDisplay(expression);
}


function clearError() {
    errorMessage.textContent = "";
}


function showError(message) {
    errorMessage.textContent = message;
}


/* =========================
   计算器输入
   ========================= */

function appendValue(value) {
    clearError();

    if (expression.length >= 200) {
        showError("表达式过长，最多允许 200 个字符");
        return;
    }

    expression += value;

    updateExpressionDisplay();
}


function clearCalculator() {
    expression = "";

    expressionDisplay.textContent = "0";

    resultDisplay.textContent = "0";

    clearError();
}


function backspace() {
    clearError();

    expression =
        expression.slice(0, -1);

    updateExpressionDisplay();
}


/* =========================
   后端状态检查
   ========================= */

async function checkBackendStatus() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/health`
        );

        if (!response.ok) {
            throw new Error(
                "Backend response is not OK"
            );
        }

        backendStatus.textContent =
            "后端在线";

        backendStatus.classList.remove(
            "offline"
        );

        backendStatus.classList.add(
            "online"
        );

    } catch (error) {

        backendStatus.textContent =
            "后端离线";

        backendStatus.classList.remove(
            "online"
        );

        backendStatus.classList.add(
            "offline"
        );
    }
}


/* =========================
   后端计算
   ========================= */

async function calculateExpression() {
    clearError();

    if (expression.trim() === "") {
        showError("请输入计算表达式");
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/calculate`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    expression: expression
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {
            showError(
                data.message || "计算失败"
            );

            return;
        }


        resultDisplay.textContent =
            data.result;


        await loadHistory();

        await checkBackendStatus();

    } catch (error) {

        console.error(error);

        showError(
            "无法连接后端服务器，请检查后端是否启动"
        );

        await checkBackendStatus();
    }
}


/* =========================
   历史读取
   ========================= */

async function loadHistory() {
    historyList.innerHTML = `
        <p class="empty-message">
            正在读取数据库...
        </p>
    `;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/history`
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            historyList.innerHTML = `
                <p class="empty-message">
                    历史记录加载失败
                </p>
            `;

            return;
        }


        historyCache =
            data.history;


        updateHistoryCount();

        filterHistory();

    } catch (error) {

        console.error(error);


        historyList.innerHTML = `
            <p class="empty-message">
                无法连接后端服务器
            </p>
        `;
    }
}


function updateHistoryCount() {
    historyCount.textContent =
        `共 ${historyCache.length} 条记录`;
}


/* =========================
   删除指定历史
   ========================= */

async function deleteHistory(historyId) {
    clearError();

    const confirmed =
        window.confirm(
            "确定要删除这条计算历史吗？"
        );


    if (!confirmed) {
        return;
    }


    try {
        const response = await fetch(
            `${API_BASE_URL}/api/history/${historyId}`,
            {
                method: "DELETE"
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {
            showError(
                data.message || "删除失败"
            );

            return;
        }


        await loadHistory();

    } catch (error) {

        console.error(error);

        showError(
            "无法连接后端服务器，请检查后端是否启动"
        );
    }
}


/* =========================
   清空全部历史
   ========================= */

async function clearAllHistory() {
    clearError();

    if (historyCache.length === 0) {
        showError("当前没有可以清空的历史记录");
        return;
    }


    const confirmed =
        window.confirm(
            "确定要清空全部计算历史吗？此操作无法撤销。"
        );


    if (!confirmed) {
        return;
    }


    try {
        const response = await fetch(
            `${API_BASE_URL}/api/history`,
            {
                method: "DELETE"
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {
            showError(
                data.message || "清空历史失败"
            );

            return;
        }


        historySearchInput.value = "";

        await loadHistory();

    } catch (error) {

        console.error(error);

        showError(
            "无法连接后端服务器，请检查后端是否启动"
        );
    }
}


/* =========================
   历史搜索
   ========================= */

function filterHistory() {
    const keyword =
        historySearchInput.value
            .trim()
            .toLowerCase();


    if (keyword === "") {
        renderHistory(historyCache);
        return;
    }


    const filteredHistory =
        historyCache.filter((record) => {

            const expressionText =
                String(record.expression)
                    .toLowerCase();


            const resultText =
                String(record.result)
                    .toLowerCase();


            const timeText =
                String(record.created_at)
                    .toLowerCase();


            return (
                expressionText.includes(keyword)
                ||
                resultText.includes(keyword)
                ||
                timeText.includes(keyword)
            );
        });


    renderHistory(filteredHistory);
}


/* =========================
   历史渲染
   ========================= */

function renderHistory(history) {
    historyList.innerHTML = "";


    if (history.length === 0) {

        const message =
            historyCache.length === 0
                ? "暂无计算记录"
                : "没有匹配的历史记录";


        historyList.innerHTML = `
            <p class="empty-message">
                ${message}
            </p>
        `;

        return;
    }


    history.forEach((record) => {

        const historyItem =
            document.createElement("div");

        historyItem.className =
            "history-item";


        const historyContent =
            document.createElement("div");

        historyContent.className =
            "history-content";


        const expressionElement =
            document.createElement("div");

        expressionElement.className =
            "history-expression";

        expressionElement.textContent =
            formatExpressionForDisplay(
                record.expression
            );


        const resultElement =
            document.createElement("div");

        resultElement.className =
            "history-result";

        resultElement.textContent =
            `= ${record.result}`;


        const metaElement =
            document.createElement("div");

        metaElement.className =
            "history-meta";


        const idElement =
            document.createElement("span");

        idElement.textContent =
            `ID: ${record.id}`;


        const timeElement =
            document.createElement("span");

        timeElement.textContent =
            record.created_at;


        metaElement.appendChild(
            idElement
        );

        metaElement.appendChild(
            timeElement
        );


        historyContent.appendChild(
            expressionElement
        );

        historyContent.appendChild(
            resultElement
        );

        historyContent.appendChild(
            metaElement
        );


        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.className =
            "delete-history-button";

        deleteButton.textContent =
            "删除";


        deleteButton.addEventListener(
            "click",
            () => {
                deleteHistory(record.id);
            }
        );


        historyItem.appendChild(
            historyContent
        );

        historyItem.appendChild(
            deleteButton
        );


        historyList.appendChild(
            historyItem
        );
    });
}


/* =========================
   深色模式
   ========================= */

function updateThemeButton() {
    const darkModeEnabled =
        document.body.classList.contains(
            "dark-theme"
        );


    themeToggleButton.textContent =
        darkModeEnabled
            ? "☀️ 浅色模式"
            : "🌙 深色模式";
}


function toggleTheme() {
    document.body.classList.toggle(
        "dark-theme"
    );


    const darkModeEnabled =
        document.body.classList.contains(
            "dark-theme"
        );


    localStorage.setItem(
        "calculator-theme",
        darkModeEnabled
            ? "dark"
            : "light"
    );


    updateThemeButton();
}


function loadTheme() {
    const storedTheme =
        localStorage.getItem(
            "calculator-theme"
        );


    if (storedTheme === "dark") {
        document.body.classList.add(
            "dark-theme"
        );
    }


    updateThemeButton();
}


/* =========================
   鼠标按钮
   ========================= */

document
    .querySelectorAll("[data-value]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                appendValue(
                    button.dataset.value
                );
            }
        );
    });


document
    .querySelector(
        '[data-action="clear"]'
    )
    .addEventListener(
        "click",
        clearCalculator
    );


document
    .querySelector(
        '[data-action="backspace"]'
    )
    .addEventListener(
        "click",
        backspace
    );


document
    .querySelector(
        '[data-action="calculate"]'
    )
    .addEventListener(
        "click",
        calculateExpression
    );


refreshHistoryButton
    .addEventListener(
        "click",
        loadHistory
    );


clearHistoryButton
    .addEventListener(
        "click",
        clearAllHistory
    );


historySearchInput
    .addEventListener(
        "input",
        filterHistory
    );


themeToggleButton
    .addEventListener(
        "click",
        toggleTheme
    );


/* =========================
   键盘快捷键
   ========================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.target.tagName === "INPUT"
            ||
            event.target.tagName === "TEXTAREA"
            ||
            event.target.isContentEditable
        ) {
            return;
        }


        const key =
            event.key;


        const allowedValues = [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "+",
            "-",
            "*",
            "/",
            ".",
            "(",
            ")"
        ];


        if (allowedValues.includes(key)) {

            event.preventDefault();

            appendValue(key);

            return;
        }


        if (key === "Enter") {

            event.preventDefault();

            calculateExpression();

            return;
        }


        if (key === "Backspace") {

            event.preventDefault();

            backspace();

            return;
        }


        if (key === "Escape") {

            event.preventDefault();

            clearCalculator();
        }
    }
);


/* =========================
   页面初始化
   ========================= */

async function initializePage() {
    loadTheme();

    await checkBackendStatus();

    await loadHistory();
}


initializePage();