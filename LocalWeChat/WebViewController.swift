import UIKit
import WebKit
import AVFoundation

final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?

    init(_ delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 247/255, green: 247/255, blue: 247/255, alpha: 1)

        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.userContentController.add(WeakScriptMessageHandler(self), name: "localBridge")

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        let backGesture = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleEdgeBack(_:)))
        backGesture.edges = .left
        webView.addGestureRecognizer(backGesture)

        guard let page = Bundle.main.url(forResource: "local_wechat", withExtension: "html") else {
            showFatalError("应用页面资源缺失，请重新构建安装包。")
            return
        }
        webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "localBridge")
    }

    private func showFatalError(_ message: String) {
        let alert = UIAlertController(title: "无法启动", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default))
        present(alert, animated: true)
    }

    private func jsQuote(_ value: Any) -> String {
        if let number = value as? NSNumber { return number.stringValue }
        guard JSONSerialization.isValidJSONObject([value]),
              let data = try? JSONSerialization.data(withJSONObject: [value]),
              var text = String(data: data, encoding: .utf8), text.count >= 2 else { return "\"\"" }
        text.removeFirst()
        text.removeLast()
        return text
    }

    private func callJS(_ function: String, arguments: [Any] = []) {
        let parameters = arguments.map { jsQuote($0) }.joined(separator: ",")
        let script = "window.\(function)&&window.\(function)(\(parameters))"
        DispatchQueue.main.async { [weak self] in
            self?.webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    @objc private func handleEdgeBack(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard gesture.state == .ended else { return }
        webView.evaluateJavaScript("(window.__androidBack ? window.__androidBack() : 'root')", completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "localBridge", let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "getApiKey":
            let requestId = body["requestId"] as? String ?? ""
            do {
                callJS("__nativeSecretResult", arguments: [requestId, try KeychainHelper.read(), NSNull()])
            } catch {
                callJS("__nativeSecretResult", arguments: [requestId, "", error.localizedDescription])
            }
        case "saveApiKey":
            do {
                try KeychainHelper.save(body["apiKey"] as? String ?? "")
            } catch {
                callJS("__secureStoreError", arguments: [error.localizedDescription])
            }
        case "clearApiKey":
            do {
                try KeychainHelper.clear()
            } catch {
                callJS("__secureStoreError", arguments: [error.localizedDescription])
            }
        case "startAiRequest":
            let requestId = body["requestId"] as? String ?? ""
            let endpoint = body["endpoint"] as? String ?? ""
            let apiKey = body["apiKey"] as? String ?? ""
            let payload = body["body"] as? String ?? "{}"
            AIClient.shared.request(endpoint: endpoint, apiKey: apiKey, body: payload) { [weak self] code, response in
                self?.callJS("__aiResponse", arguments: [requestId, code, response])
            }
        case "exportFile":
            exportFile(body)
        case "setTheme":
            let dark = (body["theme"] as? String) == "dark"
            overrideUserInterfaceStyle = dark ? .dark : .light
            webView.backgroundColor = dark ? .black : .white
        default:
            break
        }
    }

    private func exportFile(_ body: [String: Any]) {
        let requestId = body["requestId"] as? String ?? ""
        let rawName = body["fileName"] as? String ?? "本地文件"
        let invalidCharacters = CharacterSet(charactersIn: "/:\\?%*|\"<>")
        var fileName = rawName.components(separatedBy: invalidCharacters).joined(separator: "_")
        if fileName.isEmpty || fileName == ".." { fileName = "本地文件" }
        if fileName.count > 120 { fileName = String(fileName.suffix(120)) }
        guard let base64 = body["base64Data"] as? String, let data = Data(base64Encoded: base64) else {
            callJS("__exportResult", arguments: [requestId, false, "文件内容无法解码"])
            return
        }
        do {
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("LocalWeChatExports", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let target = directory.appendingPathComponent(UUID().uuidString).appendingPathExtension("tmp")
            let finalTarget = directory.appendingPathComponent(fileName)
            try data.write(to: target, options: .atomic)
            if FileManager.default.fileExists(atPath: finalTarget.path) {
                try FileManager.default.removeItem(at: finalTarget)
            }
            try FileManager.default.moveItem(at: target, to: finalTarget)
            let activity = UIActivityViewController(activityItems: [finalTarget], applicationActivities: nil)
            activity.completionWithItemsHandler = { [weak self] _, completed, _, error in
                if let error = error {
                    self?.callJS("__exportResult", arguments: [requestId, false, error.localizedDescription])
                } else {
                    self?.callJS("__exportResult", arguments: [requestId, completed, completed ? "导出操作已完成" : "已取消导出"])
                }
            }
            if let popover = activity.popoverPresentationController {
                popover.sourceView = webView
                popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            }
            present(activity, animated: true)
        } catch {
            callJS("__exportResult", arguments: [requestId, false, error.localizedDescription])
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.isFileURL || ["data", "blob", "about"].contains(url.scheme?.lowercased() ?? "") {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            callJS("toast", arguments: ["外部链接未在单机版中打开"])
        }
    }

    @available(iOS 15.0, *)
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        guard type == .audio else {
            decisionHandler(.deny)
            return
        }
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            DispatchQueue.main.async {
                decisionHandler(granted ? .grant : .deny)
            }
        }
    }
}
