

const $ = s => document.querySelector(s);

let music = [];
let shows = [];
let deferredPrompt = null;

const audio = $("#audio");

const SUPABASE_URL = "https://lrgtwnbznovggabcawzw.supabase.co";
const SUPABASE_KEY = "sb_publishable_w6N5G9a5tUhOROq2kZDvZA_xon5cmDz";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

$("#year").textContent = new Date().getFullYear();

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab =>
      tab.classList.toggle("active", tab === button)
    );

    document.querySelectorAll(".panel").forEach(panel => {
      panel.hidden = panel.id !== button.dataset.tab;
    });
  });
});

function render() {
  const draw = (items, target, kind) => {
    const element = $(target);
    element.innerHTML = "";

    if (!items.length) {
      element.innerHTML = '<p class="empty">Nothing added yet.</p>';
      return;
    }

    items.forEach(track => {
      const row = document.createElement("div");
      row.className = "track";

      const name = document.createElement("strong");
      name.textContent = track.name;

      const play = document.createElement("button");
      play.textContent = "Play";

      play.onclick = async () => {
        audio.src = track.url;
        $("#nowTitle").textContent = track.name;
        $("#nowSub").textContent =
          kind === "show" ? "Recorded programme" : "Music";

        try {
          await audio.play();
        } catch (error) {
          console.error("Playback error:", error);
        }
      };

      row.append(name, play);
      element.append(row);
    });
  };

  draw(music, "#tracks", "music");
  draw(shows, "#showsList", "show");

  $("#trackCount").textContent = `${music.length} / 15 tracks`;
}

async function loadCloudMusic() {
  try {
    const { data, error } = await db
      .from("songs")
      .select("title, artist, file_path")
      .order("created_at", { ascending: true });

    if (error) throw error;

    music = data.map(song => {
      const { data: publicData } = db.storage
        .from("radio-audio")
        .getPublicUrl(song.file_path);

      return {
        name: song.artist
          ? `${song.artist} - ${song.title}`
          : song.title,
        url: publicData.publicUrl
      };
    });

    render();

    $("#adminStatus").textContent =
      `${music.length} song(s) loaded from your online library.`;

  } catch (error) {
    console.error(error);
    $("#adminStatus").textContent =
      "Could not load songs. Check your internet connection.";
  }
}

function updateAdminView(session) {
  const loggedIn = Boolean(session);

  $("#login").hidden = loggedIn;
  $("#adminTools").hidden = !loggedIn;

  if (loggedIn) {
    $("#loginStatus").textContent = "";
    $("#adminStatus").textContent = "Administrator signed in.";
  }
}

$("#loginBtn").onclick = async () => {
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;

  if (!email || !password) {
    $("#loginStatus").textContent =
      "Enter your email address and password.";
    return;
  }

  $("#loginBtn").disabled = true;
  $("#loginStatus").textContent = "Signing in...";

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    updateAdminView(data.session);
    $("#adminPassword").value = "";

  } catch (error) {
    $("#loginStatus").textContent =
      error.message || "Sign-in failed. Please try again.";
  } finally {
    $("#loginBtn").disabled = false;
  }
};

$("#lockBtn").onclick = async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    $("#adminStatus").textContent = error.message;
    return;
  }

  updateAdminView(null);
  $("#adminEmail").value = "";
  $("#adminPassword").value = "";
  $("#loginStatus").textContent = "You have signed out.";
};

$("#uploadBtn").onclick = async () => {
  const files = [...$("#musicFiles").files];

  if (!files.length) {
    $("#adminStatus").textContent = "Choose songs to upload first.";
    return;
  }

  const remaining = Math.max(0, 15 - music.length);

  if (remaining === 0) {
    $("#adminStatus").textContent =
      "Your 15-song library limit has been reached.";
    return;
  }

  const selected = files.slice(0, remaining);

  $("#uploadBtn").disabled = true;

  let uploaded = 0;
  let failed = 0;

  for (const file of selected) {
    $("#adminStatus").textContent =
      `Uploading ${uploaded + failed + 1} of ${selected.length}: ${file.name}`;

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await db.storage
        .from("radio-audio")
        .upload(filePath, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const title = file.name.replace(/\.[^.]+$/, "");

      const { error: insertError } = await db
        .from("songs")
        .insert({
          title,
          artist: null,
          file_path: filePath
        });

      if (insertError) throw insertError;

      uploaded++;

    } catch (error) {
      console.error(error);
      failed++;
    }
  }

  $("#musicFiles").value = "";

  await loadCloudMusic();

  $("#adminStatus").textContent =
    `${uploaded} song(s) uploaded successfully. ${failed} failed.`;

  $("#uploadBtn").disabled = false;
};

db.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }

  updateAdminView(data.session);
});

db.auth.onAuthStateChange((_event, session) => {
  updateAdminView(session);
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  $("#installBtn").hidden = false;
});

$("#installBtn").onclick = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;

  deferredPrompt = null;
  $("#installBtn").hidden = true;
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

render();
loadCloudMusic();
