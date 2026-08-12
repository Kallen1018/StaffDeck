/* =========================================================================
   MindStaff 设计系统预览 · 顶部标签页切换
   ========================================================================= */
(function () {
  "use strict";

  var tabs = document.querySelectorAll(".tab-btn");
  var views = document.querySelectorAll(".view");

  function activate(view) {
    tabs.forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.view === view);
    });
    views.forEach(function (v) {
      v.classList.toggle("is-active", v.id === "view-" + view);
    });
    // 记忆当前页，支持刷新后保持
    try {
      localStorage.setItem("mdc-view", view);
      history.replaceState(null, "", "#" + view);
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs.forEach(function (t) {
    // 无 data-view 的标签（如指向独立规范页的链接）走默认跳转,不拦截
    if (!t.dataset.view) return;
    t.addEventListener("click", function () {
      activate(t.dataset.view);
    });
  });

  // 初始视图：URL hash > localStorage > 默认 kb
  var initial = (location.hash || "").replace("#", "");
  if (!initial) {
    try {
      initial = localStorage.getItem("mdc-view") || "";
    } catch (e) {}
  }
  var valid = ["kb", "chat", "login", "square"];
  if (valid.indexOf(initial) === -1) initial = "kb";
  activate(initial);

  // 聊天输入框：Enter 发送（此处仅做占位交互，防止表单提交）
  var ta = document.querySelector(".chat-input textarea");
  if (ta) {
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ta.value = "";
      }
    });
  }
})();
