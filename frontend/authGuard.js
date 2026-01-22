export function protectPage() {
    // Check if Firebase is available
    if (typeof firebase === "undefined") {
        console.warn("Firebase not loaded yet, skipping check temporarily...");
        return;
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.log("🚫 No user found, redirecting to login...");
            window.location.href = "login.html";
        }
    });
}
