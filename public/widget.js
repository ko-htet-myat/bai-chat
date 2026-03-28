(function () {
  const script =
    document.currentScript ||
    document.querySelector("script[data-chatbot-key][src*='widget.js']");

  if (!script) return;

  const chatbotKey = script.getAttribute("data-chatbot-key");
  if (!chatbotKey) {
    console.error("BAI Chat widget: missing data-chatbot-key");
    return;
  }

  const baseUrl = new URL(script.src, window.location.href).origin;
  const position = script.getAttribute("data-position") || "right";
  const bubbleLabel = script.getAttribute("data-label") || "Chat";
  const bubbleSize = 62;

  const root = document.createElement("div");
  root.setAttribute("data-bai-chat-widget", "");
  root.style.position = "fixed";
  root.style.bottom = "24px";
  root.style.zIndex = "2147483000";
  root.style[position === "left" ? "left" : "right"] = "24px";

  const frame = document.createElement("iframe");
  frame.src = `${baseUrl}/widget/${encodeURIComponent(chatbotKey)}`;
  frame.title = "BAI Chat Widget";
  frame.style.width = "380px";
  frame.style.maxWidth = "calc(100vw - 24px)";
  frame.style.height = "min(720px, calc(100vh - 104px))";
  frame.style.border = "1px solid rgba(15, 23, 42, 0.08)";
  frame.style.borderRadius = "24px";
  frame.style.boxShadow = "0 24px 80px rgba(15, 23, 42, 0.25)";
  frame.style.background = "#ffffff";
  frame.style.overflow = "hidden";
  frame.style.display = "none";

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", bubbleLabel);
  button.style.width = `${bubbleSize}px`;
  button.style.height = `${bubbleSize}px`;
  button.style.borderRadius = "999px";
  button.style.border = "0";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 18px 44px rgba(15, 23, 42, 0.28)";
  button.style.color = "#ffffff";
  button.style.fontFamily = "inherit";
  button.style.fontSize = "15px";
  button.style.fontWeight = "600";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.background = "#0ea5e9";
  button.textContent = bubbleLabel;

  const panel = document.createElement("div");
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.alignItems = position === "left" ? "flex-start" : "flex-end";
  panel.style.gap = "14px";

  function setOpen(isOpen) {
    frame.style.display = isOpen ? "block" : "none";
    button.textContent = isOpen ? "Close" : bubbleLabel;
  }

  button.addEventListener("click", function () {
    setOpen(frame.style.display === "none");
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== baseUrl) return;
    if (event.data && event.data.type === "BAI_CHAT_WIDGET_CLOSE") {
      setOpen(false);
    }
  });

  fetch(`${baseUrl}/api/widget/${encodeURIComponent(chatbotKey)}`)
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (payload) {
      if (!payload || !payload.chatbot) return;

      const chatbot = payload.chatbot;
      if (chatbot.primaryColor) {
        button.style.background = chatbot.primaryColor;
      }
      if (chatbot.name) {
        frame.title = chatbot.name;
      }
      if (!chatbot.isActive) {
        button.disabled = true;
        button.style.cursor = "not-allowed";
        button.style.opacity = "0.7";
        button.textContent = "Offline";
      }
    })
    .catch(function () {
      console.warn("BAI Chat widget: failed to load chatbot config");
    });

  panel.appendChild(frame);
  panel.appendChild(button);
  root.appendChild(panel);
  document.body.appendChild(root);

  const mobileQuery = window.matchMedia("(max-width: 640px)");
  function applyResponsiveMode(event) {
    const isMobile = event.matches;
    frame.style.width = isMobile ? "calc(100vw - 16px)" : "380px";
    frame.style.height = isMobile ? "calc(100vh - 88px)" : "min(720px, calc(100vh - 104px))";
    root.style.bottom = isMobile ? "8px" : "24px";
    root.style[position === "left" ? "left" : "right"] = isMobile ? "8px" : "24px";
  }

  applyResponsiveMode(mobileQuery);
  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", applyResponsiveMode);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(applyResponsiveMode);
  }
})();
