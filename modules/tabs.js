export function createTabController(tabs, sections, options = {}) {
  const { onChange = () => {} } = options;
  const tabList = Array.isArray(tabs) ? tabs : [...tabs];
  const sectionEntries = Object.entries(sections);

  function selectTab(selectedTab, options = {}) {
    const { focus = false } = options;

    tabList.forEach((tab) => {
      const active = tab.dataset.startTab === selectedTab;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });

    sectionEntries.forEach(([name, section]) => {
      const hidden = name !== selectedTab;
      section.classList.toggle("is-hidden", hidden);
      section.hidden = hidden;
    });

    onChange(selectedTab);
  }

  function handleKeydown(event) {
    const currentIndex = tabList.indexOf(event.currentTarget);
    if (currentIndex === -1) return;

    const lastIndex = tabList.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    selectTab(tabList[nextIndex].dataset.startTab, { focus: true });
  }

  tabList.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab.dataset.startTab));
    tab.addEventListener("keydown", handleKeydown);
  });

  return { selectTab };
}
