// Local bookmark storage — nothing is sent to a server.
const BOOKMARKS_KEY = "speedy-readr-bookmarks";

function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function getBookId() {
  // Give pasted/current text a stable ID based on its contents.
  const text = document.getElementById("text").value.trim();

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  return "book-" + Math.abs(hash);
}

function renderBookmarks() {
  const select = document.getElementById("bookmarks");
  const restoreButton = document.getElementById("restoreBookmark");

  const bookmarks = getBookmarks();

  select.innerHTML = "";

  if (bookmarks.length === 0) {
    select.innerHTML = '<option value="">No bookmarks saved</option>';
    restoreButton.disabled = true;
    return;
  }

  bookmarks.forEach((bookmark, index) => {
    const option = document.createElement("option");

    option.value = index;

    const date = new Date(bookmark.createdAt);
    const dateText = date.toLocaleString();

    option.textContent =
      `${bookmark.bookName} — ${bookmark.percent.toFixed(1)}% (${dateText})`;

    select.appendChild(option);
  });

  restoreButton.disabled = false;
}

document.getElementById("saveBookmark").addEventListener("click", () => {
  const bookmarks = getBookmarks();

  const text = document.getElementById("text").value.trim();
  const position = typeof currentIndex !== "undefined" ? currentIndex : 0;

  if (!text) {
    document.getElementById("bookmarkMessage").textContent =
      "Load some text before saving a bookmark.";
    return;
  }

  const totalWords = words.length || 1;
  const percent = (position / Math.max(totalWords - 1, 1)) * 100;

  const bookmark = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    bookId: getBookId(),
    bookName: text.split(/\s+/).slice(0, 8).join(" ") + "…",
    position,
    percent,
    createdAt: new Date().toISOString()
  };

  bookmarks.unshift(bookmark);

  // Keep the most recent 50 bookmarks.
  saveBookmarks(bookmarks.slice(0, 50));

  renderBookmarks();

  document.getElementById("bookmarkMessage").textContent =
    "Bookmark saved privately on this device.";
});

document.getElementById("restoreBookmark").addEventListener("click", () => {
  const select = document.getElementById("bookmarks");
  const bookmarks = getBookmarks();
  const bookmark = bookmarks[Number(select.value)];

  if (!bookmark) return;

  // Make sure the bookmarked text is currently loaded.
  if (bookmark.bookId !== getBookId()) {
    document.getElementById("bookmarkMessage").textContent =
      "This bookmark belongs to different text. Load that text first.";
    return;
  }

  currentIndex = Math.max(
    0,
    Math.min(bookmark.position, words.length - 1)
  );

  updateReader();

  document.getElementById("bookmarkMessage").textContent =
    "Bookmark restored.";
});

// Load bookmarks when the app starts.
renderBookmarks();
