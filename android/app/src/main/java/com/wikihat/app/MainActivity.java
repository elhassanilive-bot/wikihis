package com.wikihat.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private final Handler hideHandler = new Handler(Looper.getMainLooper());

    private static final String HIDE_FOOTER_JS =
        "(function(){" +
        "var css='footer{display:none !important;visibility:hidden !important;height:0 !important;min-height:0 !important;margin:0 !important;padding:0 !important;overflow:hidden !important;}';" +
        "var id='wikihat-hide-footer-style';" +
        "var st=document.getElementById(id);" +
        "if(!st){st=document.createElement('style');st.id=id;st.type='text/css';st.appendChild(document.createTextNode(css));document.head&&document.head.appendChild(st);}" +
        "document.querySelectorAll('footer').forEach(function(el){el.style.display='none';el.style.visibility='hidden';el.style.height='0';el.style.minHeight='0';el.style.margin='0';el.style.padding='0';el.style.overflow='hidden';});" +
        "})();";

    private void injectHideFooterScript() {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(HIDE_FOOTER_JS, null));
    }

    private void startAggressiveHideLoop() {
        // Re-apply hide rules for the first 20 seconds to cover initial load + route changes.
        for (int i = 0; i < 40; i++) {
            final int delayMs = i * 500;
            hideHandler.postDelayed(this::injectHideFooterScript, delayMs);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startAggressiveHideLoop();
    }

    @Override
    public void onResume() {
        super.onResume();
        startAggressiveHideLoop();
    }
}
