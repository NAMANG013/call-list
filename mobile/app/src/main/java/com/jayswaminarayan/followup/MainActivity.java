package com.jayswaminarayan.followup;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {

    // 100% On-Device Standalone URL (all assets bundled directly inside the APK)
    public static final String DEVICE_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";

    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private SessionBridge sessionBridge;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Customize system bars for dark theme
        setupStatusBar();

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        // Setup Asset Loader for on-device bundled assets
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Enable Cookie & Storage Persistence
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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Dark background for seamless rendering
        webView.setBackgroundColor(Color.parseColor("#0b0e14"));

        // Add Session & Native Bridge (Persistent Android SharedPreferences)
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

                // Native Phone Dialer for calls
                if (url.startsWith("tel:")) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, uri);
                    startActivity(intent);
                    return true;
                }

                // Native WhatsApp Intent
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

                // Keep local app navigation inside the WebView
                if (url.startsWith("https://appassets.androidplatform.net")) {
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
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                CookieManager.getInstance().flush();
            }
        });

        // Setup WebChromeClient
        webView.setWebChromeClient(new WebChromeClient());

        // Load the 100% on-device standalone application
        webView.loadUrl(DEVICE_APP_URL);
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
    public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript(
                    "(function() { " +
                    "  var sessionModal = document.querySelector('#sessionModal');" +
                    "  if (sessionModal && sessionModal.classList.contains('active')) {" +
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
