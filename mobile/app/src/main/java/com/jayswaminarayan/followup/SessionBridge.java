package com.jayswaminarayan.followup;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import java.net.URLEncoder;

public class SessionBridge {
    private static final String PREF_NAME = "FollowUpAppSession";
    private static final String KEY_SESSION_DATA = "app_session_data";
    private static final String KEY_SESSION_UPDATED = "app_session_updated_at";

    private final Activity activity;
    private final WebView webView;
    private final SharedPreferences prefs;

    public SessionBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.prefs = activity.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public boolean isNativeApp() {
        return true;
    }

    @JavascriptInterface
    public String getSession() {
        return prefs.getString(KEY_SESSION_DATA, "");
    }

    @JavascriptInterface
    public boolean saveSession(String sessionJson) {
        if (sessionJson == null || sessionJson.trim().isEmpty()) {
            return clearSession();
        }
        return prefs.edit()
                .putString(KEY_SESSION_DATA, sessionJson)
                .putLong(KEY_SESSION_UPDATED, System.currentTimeMillis())
                .commit();
    }

    @JavascriptInterface
    public boolean clearSession() {
        return prefs.edit()
                .remove(KEY_SESSION_DATA)
                .remove(KEY_SESSION_UPDATED)
                .commit();
    }

    @JavascriptInterface
    public String getSavedStatuses(String dateKey) {
        return prefs.getString("status_" + dateKey, "{}");
    }

    @JavascriptInterface
    public boolean saveStatuses(String dateKey, String statusesJson) {
        return prefs.edit()
                .putString("status_" + dateKey, statusesJson)
                .commit();
    }

    @JavascriptInterface
    public void showToast(String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
    }

    @JavascriptInterface
    public void dialPhone(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        activity.runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse("tel:" + phoneNumber.trim()));
                activity.startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(activity, "Cannot open dialer: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @JavascriptInterface
    public void openWhatsApp(String text) {
        activity.runOnUiThread(() -> {
            try {
                String url = "https://api.whatsapp.com/send?text=" + URLEncoder.encode(text, "UTF-8");
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                activity.startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(activity, "Cannot open WhatsApp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
