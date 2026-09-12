const SUPABASE_URL = "https://drpoikzfnmmofhnkbeer.supabase.co";
const SUPABASE_KEY = "sb_publishable_kphccPmumtpk2CKf6zXiLw_tsJR3epR";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("admin-login-form");
const emailInput = document.getElementById("admin-email");
const passwordInput = document.getElementById("admin-password");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

document.getElementById("cms-year").textContent = new Date().getFullYear();

async function isAdmin(userId) {
  const { data, error } = await db
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin check error:", error);
    return false;
  }

  return !!data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: emailInput.value.trim().toLowerCase(),
      password: passwordInput.value
    });

    if (error) {
      loginMessage.textContent = error.message;
      return;
    }

    if (!data.user || !(await isAdmin(data.user.id))) {
      await db.auth.signOut();
      loginMessage.textContent = "Access denied.";
      return;
    }

    window.location.href = "dashboard/";
  } catch (error) {
    console.error(error);
    loginMessage.textContent = error.message || "Something went wrong.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});

(async function redirectIfAlreadyLoggedIn() {
  const { data } = await db.auth.getSession();

  if (!data.session) return;

  if (await isAdmin(data.session.user.id)) {
    window.location.href = "dashboard/";
  }
})();
