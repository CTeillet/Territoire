import Combine
import SwiftUI
import UIKit
import WebKit

/// The TMS site, signed in between launches. TMS pages stay here; other links open in their own app.
@MainActor
final class TMSWebModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    @Published private(set) var hasLoaded = false
    @Published private(set) var failure: String?
    /// tmsprint:// links touched in a TMS page.
    let printLinks = PassthroughSubject<URL, Never>()

    let baseURL: URL
    let webView: WKWebView
    private var failedURL: URL?
    private var downloads: [ObjectIdentifier: URL] = [:]
    private weak var popup: UIViewController?

    private static let downloadsFolder = FileManager.default.temporaryDirectory
        .appendingPathComponent("Telechargements", isDirectory: true)

    override init() {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "TMSBaseURL") as? String,
              let url = URL(string: value), url.scheme == "https", url.host != nil else {
            fatalError("TMSBaseURL absent ou invalide dans Info.plist")
        }
        baseURL = url
        let configuration = WKWebViewConfiguration()
        // Persistent store: the session cookies survive app restarts, like in Safari.
        configuration.websiteDataStore = .default()
        // The territory map opens with window.open after a network request, without a user gesture.
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        // Files shared during a previous launch are no longer needed.
        try? FileManager.default.removeItem(at: Self.downloadsFolder)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: baseURL))
    }

    func retry() {
        failure = nil
        webView.load(URLRequest(url: failedURL ?? webView.url ?? baseURL))
    }

    // MARK: Navigation

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload {
            decisionHandler(.download)
            return
        }
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        switch WebPolicy.destination(of: url, base: baseURL) {
        case .tms where navigationAction.targetFrame == nil:
            // target="_blank" to a TMS page: the app has no tabs, it opens in place.
            self.webView.load(navigationAction.request)
            decisionHandler(.cancel)
        case .tms, .generated:
            decisionHandler(.allow)
        case .printLink:
            printLinks.send(url)
            decisionHandler(.cancel)
        case .external where navigationAction.targetFrame?.isMainFrame == false:
            // A frame embedded in a TMS page stays in the page; only whole pages leave the app.
            decisionHandler(.allow)
        case .external:
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        case .blocked:
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (navigationResponse.response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Disposition")
        if !navigationResponse.canShowMIMEType || disposition?.lowercased().hasPrefix("attachment") == true {
            decisionHandler(.download)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === self.webView else { return }
        hasLoaded = true
        failure = nil
        failedURL = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showFailure(error, in: webView)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showFailure(error, in: webView)
    }

    private func showFailure(_ error: Error, in webView: WKWebView) {
        let error = error as NSError
        // Cancelled, or turned into a download or an external link: not a failure.
        guard webView === self.webView,
              !(error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled),
              !(error.domain == "WebKitErrorDomain" && error.code == 102) else { return }
        failedURL = error.userInfo[NSURLErrorFailingURLErrorKey] as? URL
        failure = error.localizedDescription
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS reclaimed the page's memory: reload rather than leave a blank screen.
        guard webView === self.webView else {
            closePopup()
            return
        }
        if webView.url == nil { webView.load(URLRequest(url: baseURL)) } else { webView.reload() }
    }

    // MARK: Windows and dialogs

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        let url = navigationAction.request.url ?? URL(string: "about:blank")!
        switch WebPolicy.destination(of: url, base: baseURL) {
        case .tms:
            self.webView.load(navigationAction.request)
        case .generated:
            // Same configuration as the opener: the new view can read the page's blob.
            return openPopup(configuration)
        case .printLink:
            printLinks.send(url)
        case .external:
            UIApplication.shared.open(url)
        case .blocked:
            break
        }
        return nil
    }

    func webViewDidClose(_ webView: WKWebView) {
        if webView !== self.webView { closePopup() }
    }

    private func openPopup(_ configuration: WKWebViewConfiguration) -> WKWebView? {
        guard let presenter = presenter() else { return nil }
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.uiDelegate = self
        let controller = UIViewController()
        controller.view = view
        controller.navigationItem.rightBarButtonItem = UIBarButtonItem(
            systemItem: .close, primaryAction: UIAction { [weak self] _ in self?.closePopup() })
        let navigation = UINavigationController(rootViewController: controller)
        presenter.present(navigation, animated: true)
        popup = navigation
        return view
    }

    private func closePopup() {
        popup?.dismiss(animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, otherwise: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text ?? "")
        })
        present(alert) { completionHandler(nil) }
    }

    // MARK: Downloads

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        // One folder per download: two files with the same name never overwrite each other.
        let folder = Self.downloadsFolder.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let file = folder.appendingPathComponent(WebPolicy.downloadFileName(suggestedFilename))
            downloads[ObjectIdentifier(download)] = file
            completionHandler(file)
        } catch {
            completionHandler(nil)
            showMessage("Téléchargement impossible : \(error.localizedDescription)")
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        // Enregistrer dans Fichiers, AirDrop, Design&Print 2…
        let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        sheet.popoverPresentationController?.sourceView = webView
        present(sheet) {}
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        guard downloads.removeValue(forKey: ObjectIdentifier(download)) != nil else { return }
        showMessage("Téléchargement impossible : \(error.localizedDescription)")
    }

    // MARK: Presentation

    private func presenter() -> UIViewController? {
        var top = webView.window?.rootViewController
        while let presented = top?.presentedViewController, !presented.isBeingDismissed { top = presented }
        return top
    }

    private func present(_ controller: UIViewController, otherwise fallback: () -> Void) {
        if let presenter = presenter() {
            presenter.present(controller, animated: true)
        } else {
            fallback()
        }
    }

    private func showMessage(_ message: String) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert) {}
    }
}

struct TMSWebView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

/// TMS in full screen, with a way back when the site cannot be reached.
struct TMSRootView: View {
    @ObservedObject var web: TMSWebModel
    let openPrinter: () -> Void

    var body: some View {
        TMSWebView(webView: web.webView)
            // WebKit already keeps the focused field above the keyboard.
            .ignoresSafeArea(.keyboard)
            .overlay {
                if let failure = web.failure {
                    unreachable(failure)
                } else if !web.hasLoaded {
                    ProgressView()
                }
            }
    }

    private func unreachable(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.largeTitle).foregroundStyle(.secondary)
            Text("TMS est injoignable").font(.headline)
            Text(message)
                .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Button("Réessayer") { web.retry() }
                .buttonStyle(.borderedProminent)
            Button("Imprimante d'étiquettes") { openPrinter() }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .systemBackground))
    }
}
