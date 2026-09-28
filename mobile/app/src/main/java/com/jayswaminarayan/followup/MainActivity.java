package com.jayswaminarayan.followup;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {

    public static final String LIVE_PRODUCTION_URL = "https://call-list-six.vercel.app";
    public static final String LOCAL_FALLBACK_URL = "https://appassets.androidplatform.net/assets/www/index.html";

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private SessionBridge sessionBridge;
    private boolean isLoadedFromFallback = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Customize system bars for dark theme
        setupStatusBar();

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        // Setup Asset Loader for offline local assets fallback
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Enable Cookie Persistence
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // Configure WebView Settings
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // Default cache mode allows fast load while checking server for updates
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Dark background for seamless rendering
        webView.setBackgroundColor(Color.parseColor("#0b0e14"));

        // Add Session & Native Bridge (Injected into both live and offline pages)
        sessionBridge = new SessionBridge(this, webView);
        webView.addJavascriptInterface(sessionBridge, "AndroidSession");
        webView.addJavascriptInterface(sessionBridge, "AndroidBridge");

        // Setup WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();

                // Native Phone Dialer
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, uri);
                    startActivity(intent);
                    return true;
                }

                // Native WhatsApp
                if (url.startsWith("https://wa.me/") || url.startsWith("whatsapp://") || url.contains("api.whatsapp.com")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "WhatsApp is not installed", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }

                // Keep app navigation inside the WebView
                if (url.startsWith(LIVE_PRODUCTION_URL) || url.startsWith("https://appassets.androidplatform.net")) {
                    return false;
                }

                // External links open in device browser
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    // Fallback to local APK assets if network is unreachable
                    String url = request.getUrl().toString();
                    if (!url.startsWith(LOCAL_FALLBACK_URL)) {
                        isLoadedFromFallback = true;
                        runOnUiThread(() -> view.loadUrl(LOCAL_FALLBACK_URL));
                    }
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                CookieManager.getInstance().flush();

                // Inject session persistence & auto-update bridge into the loaded page
                injectSessionBridge(view);
            }
        });

        // Setup WebChromeClient with Twilio alert/confirm suppression
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (message != null && (message.contains("Twilio Voice") || message.contains("Twilio"))) {
                    result.confirm();
                    return true;
                }
                return super.onJsConfirm(view, url, message, result);
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (message != null && message.contains("Twilio")) {
                    result.confirm();
                    return true;
                }
                return super.onJsAlert(view, url, message, result);
            }
        });

        // Load the app: Live version with auto-updates if online, local fallback if offline
        loadApp();
    }

    public boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnected();
    }

    public void loadApp() {
        if (isNetworkAvailable()) {
            isLoadedFromFallback = false;
            // Always fetch the freshest code from live deployment so APK auto-updates instantly
            webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(false);
            webView.loadUrl(LIVE_PRODUCTION_URL);
        } else {
            isLoadedFromFallback = true;
            webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            webView.loadUrl(LOCAL_FALLBACK_URL);
        }
    }

    /**
     * Injects session synchronization so user session is maintained seamlessly
     * across live web updates without ever having to re-login, and forces direct dialing.
     */
    private void injectSessionBridge(WebView view) {
        String js = "(function() {" +
                "  if (typeof window.AndroidSession !== 'undefined') {" +
                "    try {" +
                "      var nativeSessionStr = window.AndroidSession.getSession();" +
                "      if (nativeSessionStr && nativeSessionStr.trim().length > 0) {" +
                "        var parsed = JSON.parse(nativeSessionStr);" +
                "        if (parsed && parsed.user) {" +
                "          if (!localStorage.getItem('jaySwaminarayanCallList.sessionUser')) {" +
                "            localStorage.setItem('jaySwaminarayanCallList.sessionUser', JSON.stringify(parsed.user));" +
                "            if (parsed.decryptedMembers) {" +
                "              localStorage.setItem('jaySwaminarayanCallList.decryptedMembers', JSON.stringify(parsed.decryptedMembers));" +
                "            }" +
                "          }" +
                "        }" +
                "      }" +
                "    } catch(e) {}" +
                "    " +
                "    var originalSetItem = localStorage.setItem;" +
                "    localStorage.setItem = function(key, value) {" +
                "      originalSetItem.apply(this, arguments);" +
                "      if (key === 'jaySwaminarayanCallList.sessionUser') {" +
                "        try {" +
                "          var u = JSON.parse(value);" +
                "          var mStr = localStorage.getItem('jaySwaminarayanCallList.decryptedMembers');" +
                "          var m = mStr ? JSON.parse(mStr) : [];" +
                "          var s = { sessionId: 'sess_' + Date.now(), user: u, decryptedMembers: m, remember: true, createdAt: new Date().toISOString() };" +
                "          window.AndroidSession.saveSession(JSON.stringify(s));" +
                "        } catch(e) {}" +
                "      }" +
                "    };" +
                "    " +
                "    var originalRemoveItem = localStorage.removeItem;" +
                "    localStorage.removeItem = function(key) {" +
                "      originalRemoveItem.apply(this, arguments);" +
                "      if (key === 'jaySwaminarayanCallList.sessionUser') {" +
                "        window.AndroidSession.clearSession();" +
                "      }" +
                "    };" +
                "  }" +
                "  " +
                "  window.startTwilioCall = function(member) {" +
                "    if (member && member.phone) {" +
                "      var clean = member.phone.replace(/[\\s\\-\\(\\)]/g, '');" +
                "      if (/^[6-9]\\d{9}$/.test(clean)) clean = '+91' + clean;" +
                "      else if (!clean.startsWith('+')) clean = '+91' + clean;" +
                "      if (window.AndroidSession && window.AndroidSession.dialPhone) {" +
                "        window.AndroidSession.dialPhone(clean);" +
                "      } else {" +
                "        window.location.href = 'tel:' + clean;" +
                "      }" +
                "    }" +
                "  };" +
                "  " +
                "  document.addEventListener('click', function(e) {" +
                "    var btn = e.target.closest('.call-button');" +
                "    if (btn) {" +
                "      e.preventDefault();" +
                "      e.stopPropagation();" +
                "      e.stopImmediatePropagation();" +
                "      var item = btn.closest('.member-item');" +
                "      var phone = '';" +
                "      if (item) {" +
                "        var phoneEl = item.querySelector('.member-phone');" +
                "        if (phoneEl) phone = phoneEl.textContent.trim();" +
                "      }" +
                "      if (!phone && btn.getAttribute('href') && btn.getAttribute('href').startsWith('tel:')) {" +
                "        phone = btn.getAttribute('href').replace('tel:', '');" +
                "      }" +
                "      if (phone) {" +
                "        var clean = phone.replace(/[\\s\\-\\(\\)]/g, '');" +
                "        if (/^[6-9]\\d{9}$/.test(clean)) clean = '+91' + clean;" +
                "        else if (!clean.startsWith('+')) clean = '+91' + clean;" +
                "        if (window.AndroidSession && window.AndroidSession.dialPhone) {" +
                "          window.AndroidSession.dialPhone(clean);" +
                "        } else {" +
                "          window.location.href = 'tel:' + clean;" +
                "        }" +
                "      }" +
                "    }" +
                "  }, true);" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    private void setupStatusBar() {
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#0b0e14"));
        window.setNavigationBarColor(Color.parseColor("#0b0e14"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = window.getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If app was on fallback due to offline, switch to live version when network returns
        if (isLoadedFromFallback && isNetworkAvailable()) {
            loadApp();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "(function() { " +
                    "  var overlay = document.querySelector('#callOverlay');" +
                    "  if (overlay && !overlay.classList.contains('hidden')) { " +
                    "    var hangup = document.querySelector('#hangupBtn');" +
                    "    if (hangup) hangup.click(); else overlay.classList.add('hidden');" +
                    "    return true; " +
                    "  }" +
                    "  var sessionModal = document.querySelector('#sessionModal');" +
                    "  if (sessionModal && !sessionModal.classList.contains('hidden') && sessionModal.classList.contains('active')) {" +
                    "    sessionModal.classList.remove('active');" +
                    "    return true;" +
                    "  }" +
                    "  return false;" +
                    "})()",
                    value -> {
                        if (!"true".equals(value)) {
                            if (webView.canGoBack()) {
                                webView.goBack();
                            } else {
                                MainActivity.super.onBackPressed();
                            }
                        }
                    }
            );
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
