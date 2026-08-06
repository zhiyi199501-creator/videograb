import SwiftUI
import WebKit

struct AppWebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let bootstrap = WKUserScript(
            source: NativeBridge.bootstrapScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(bootstrap)

        let coordinator = context.coordinator
        for name in NativeBridge.handlerNames {
            config.userContentController.add(coordinator, name: name)
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = coordinator
        webView.uiDelegate = coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.customUserAgent = Self.mergedUserAgent(webView: webView)
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground

        coordinator.webView = webView
        coordinator.bindProgress(webView)

        var request = URLRequest(url: model.startURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        for name in NativeBridge.handlerNames {
            uiView.configuration.userContentController.removeScriptMessageHandler(forName: name)
        }
    }

    private static func mergedUserAgent(webView: WKWebView) -> String {
        let base = webView.value(forKey: "userAgent") as? String
            ?? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
        if base.contains(AppConfig.appUserAgentSuffix) { return base }
        return "\(base) \(AppConfig.appUserAgentSuffix)"
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let model: WebViewModel
        weak var webView: WKWebView?
        private var progressObservation: NSKeyValueObservation?

        init(model: WebViewModel) {
            self.model = model
        }

        func bindProgress(_ webView: WKWebView) {
            progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
                Task { @MainActor in
                    self?.model.progress = view.estimatedProgress
                }
            }
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            switch BridgeMessage(rawValue: message.name) {
            case .openExternal:
                handleOpenExternal(message.body)
            case .shareBlob:
                handleShareBlob(message.body)
            case .none:
                break
            }
        }

        private func handleOpenExternal(_ body: Any) {
            guard let payload = NativeBridge.decode(OpenExternalPayload.self, from: body),
                  let url = URL(string: payload.url)
            else { return }
            UIApplication.shared.open(url)
        }

        private func handleShareBlob(_ body: Any) {
            guard let payload = NativeBridge.decode(ShareBlobPayload.self, from: body) else {
                model.failDownload("导出参数无效")
                return
            }
            DownloadManager.writeBase64File(filename: payload.filename, base64: payload.base64) { [weak self] result in
                Task { @MainActor in
                    guard let self else { return }
                    switch result {
                    case .success(let fileURL):
                        self.model.presentShare(fileURL: fileURL)
                    case .failure(let error):
                        self.model.failDownload(error.localizedDescription)
                    }
                }
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.isLoading = false
            model.progress = 1
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            model.isLoading = false
            model.showBanner("加载失败，下拉刷新试试")
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            model.isLoading = false
            model.showBanner("无法连接服务器")
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            if url.scheme == AppConfig.urlScheme {
                decisionHandler(.cancel)
                if let web = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "url" })?.value,
                   let target = URL(string: web)
                {
                    webView.load(URLRequest(url: target))
                }
                return
            }

            if AppConfig.isExternalCheckout(url) {
                decisionHandler(.cancel)
                UIApplication.shared.open(url)
                return
            }

            if let host = url.host, !AppConfig.isAllowedWebHost(host) {
                // Keep same-site assets; open truly external http(s) in Safari
                if url.scheme == "http" || url.scheme == "https" {
                    decisionHandler(.cancel)
                    UIApplication.shared.open(url)
                    return
                }
            }

            decisionHandler(.allow)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
                if AppConfig.isExternalCheckout(url) || !AppConfig.isAllowedWebHost(url.host) {
                    UIApplication.shared.open(url)
                } else {
                    webView.load(URLRequest(url: url))
                }
            }
            return nil
        }
    }
}

private extension URL {
    var originString: String {
        guard let scheme, let host else { return absoluteString }
        if let port {
            return "\(scheme)://\(host):\(port)"
        }
        return "\(scheme)://\(host)"
    }
}
